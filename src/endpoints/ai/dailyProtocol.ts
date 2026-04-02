import type { Endpoint } from 'payload'
import { chat, type ChatMessage } from '../../ai/chat'
import { logUsage } from '../../ai/usageLogger'
import { retrieveRelevantChunks } from '../../ai/retrieval'
import { getModelConfig } from '../../ai/models'
import { getHealthProfile } from '../../utilities/getHealthProfile'
import { getStayContext } from '../../utilities/getStayContext'
import { buildDailyProtocolPrompt, parseDailyProtocolResponse } from '../../ai/prompts/dailyProtocol'
import { validateAIRequest, isErrorResponse } from '../../ai/middleware'

export const dailyProtocolEndpoint: Endpoint = {
  path: '/ai/daily-protocol',
  method: 'post',
  handler: async (req) => {
    // Auth check first (before parsing body, since we need user for existing-protocol check)
    if (!req.user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = (await req.json?.()) as { date?: string; regenerate?: boolean } | undefined
    const targetDate = body?.date || new Date().toISOString().split('T')[0]

    // Check for existing protocol (unless regenerate) — before rate limiting
    if (!body?.regenerate) {
      const existing = await req.payload.find({
        collection: 'daily-protocols',
        where: {
          and: [
            { user: { equals: req.user.id } },
            { date: { equals: targetDate } },
            { status: { equals: 'ready' } },
          ],
        },
        limit: 1,
        overrideAccess: true,
        req,
      })
      if (existing.docs[0]) {
        return Response.json({ protocol: existing.docs[0] })
      }
    }

    // Now validate AI config + rate limit
    const ctx = await validateAIRequest(req, 'daily-protocol', {
      rateLimitMessage: 'Daily protocol generation limit reached.',
    })
    if (isErrorResponse(ctx)) return ctx

    try {
      // Gather context: enrolled courses
      const enrollments = await req.payload.find({
        collection: 'enrollments',
        where: { user: { equals: req.user.id }, status: { in: ['active', 'completed'] } },
        depth: 2,
        limit: 10,
        overrideAccess: true,
        req,
      })

      const enrolledCourses = enrollments.docs
        .map((e: any) => {
          const course = typeof e.course === 'object' ? e.course : null
          if (!course) return null
          const pillarName = typeof course.pillar === 'object' ? course.pillar?.name : 'General'
          return { title: course.title, pillarName }
        })
        .filter(Boolean) as Array<{ title: string; pillarName: string }>

      // Recent lesson progress
      const recentProgress = await req.payload.find({
        collection: 'lesson-progress',
        where: { user: { equals: req.user.id }, status: { equals: 'completed' } },
        sort: '-completedAt',
        depth: 2,
        limit: 5,
        overrideAccess: true,
        req,
      })

      const recentLessons = recentProgress.docs.map((lp: any) => {
        const lesson = typeof lp.lesson === 'object' ? lp.lesson : null
        const enrollment = typeof lp.enrollment === 'object' ? lp.enrollment : null
        const course = enrollment && typeof enrollment.course === 'object' ? enrollment.course : null
        return {
          title: lesson?.title || 'Lesson',
          courseTitle: course?.title || 'Course',
        }
      })

      // RAG context from enrolled pillar topics
      const pillarQuery = enrolledCourses.map((c) => c.pillarName).join(' ') || 'longevity health'
      const chunks = await retrieveRelevantChunks(
        `daily protocol ${pillarQuery}`,
        req.payload,
        req,
        { limit: 6 },
      )

      // Health profile (graceful degradation)
      let healthProfile: any = null
      try {
        healthProfile = await getHealthProfile(req.user.id as string)
      } catch {
        // Health profile unavailable — continue without personalization
      }

      // Check for active stay via Digital Twin
      let stayContextStr: string | null = null
      try {
        const stay = await getStayContext(req.user.id as string)
        if (stay && stay.phase === 'during-stay') {
          stayContextStr = `The student is on Day ${stay.dayNumber} of a ${stay.stayType} longevity stay at ${stay.stayLocation}. Include hotel-specific activities: morning wellness routine, spa recovery, Mediterranean nutrition, evening relaxation. Reference the day's scheduled activities from the stay program.`
        }
      } catch {
        // Stay context unavailable — continue without it
      }

      // Generate
      const prompt = buildDailyProtocolPrompt(enrolledCourses, recentLessons, chunks, healthProfile, stayContextStr)
      const messages: ChatMessage[] = [{ role: 'system', content: prompt }]

      const modelConfig = getModelConfig('dailyProtocol')
      const maxTokens = ctx.aiConfig.tokenBudgets?.dailyProtocolMaxTokens ?? modelConfig.maxOutputTokens
      const result = await chat(messages, 'dailyProtocol', { maxTokens, temperature: 0.6 })

      const parsed = parseDailyProtocolResponse(result.content)
      if (!parsed) {
        return Response.json({ error: 'Failed to generate protocol. Please try again.' }, { status: 500 })
      }

      // Archive any existing protocol for this date
      const oldProtocols = await req.payload.find({
        collection: 'daily-protocols',
        where: {
          and: [
            { user: { equals: req.user.id } },
            { date: { equals: targetDate } },
          ],
        },
        overrideAccess: true,
        req,
      })
      for (const old of oldProtocols.docs) {
        await req.payload.update({
          collection: 'daily-protocols',
          id: old.id,
          data: { status: 'archived' },
          overrideAccess: true,
          req,
        })
      }

      // Create new protocol
      const protocol = await req.payload.create({
        collection: 'daily-protocols',
        data: {
          user: req.user.id,
          date: targetDate,
          status: 'ready',
          protocol: { blocks: parsed.blocks },
          completedCount: 0,
          totalCount: parsed._totalCount,
          generatedAt: new Date().toISOString(),
        },
        overrideAccess: true,
        req,
      })

      // Log usage
      logUsage(req, {
        feature: 'daily-protocol',
        provider: modelConfig.provider,
        model: modelConfig.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        durationMs: Date.now() - ctx.startTime,
      })

      return Response.json({ protocol })
    } catch (err: any) {
      req.payload.logger.error({ err, message: 'Daily protocol generation failed' })
      return Response.json({ error: 'Failed to generate protocol. Please try again.' }, { status: 500 })
    }
  },
}
