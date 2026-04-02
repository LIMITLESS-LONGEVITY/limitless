import type { Endpoint } from 'payload'
import { chat, type ChatMessage } from '../../ai/chat'
import { logUsage } from '../../ai/usageLogger'
import { retrieveRelevantChunks } from '../../ai/retrieval'
import { getModelConfig } from '../../ai/models'
import { getHealthProfile } from '../../utilities/getHealthProfile'
import { buildActionPlanPrompt, parseActionPlanResponse } from '../../ai/prompts/actionPlan'
import { validateAIRequest, isErrorResponse } from '../../ai/middleware'
import { unwrapRelation } from '../../utilities/types'

export const actionPlanEndpoint: Endpoint = {
  path: '/ai/action-plan',
  method: 'post',
  handler: async (req) => {
    const ctx = await validateAIRequest(req, 'action-plan', {
      rateLimitMessage: 'Action plan generation limit reached. Upgrade for more access.',
    })
    if (isErrorResponse(ctx)) return ctx

    const body = (await req.json?.()) as { enrollmentId?: string } | undefined
    if (!body?.enrollmentId) {
      return Response.json({ error: 'Missing enrollmentId' }, { status: 400 })
    }

    try {
      // Fetch enrollment with course data
      const enrollment = await req.payload.findByID({
        collection: 'enrollments',
        id: body.enrollmentId,
        depth: 2,
        req,
        overrideAccess: false,
      })

      if (!enrollment) {
        return Response.json({ error: 'Enrollment not found' }, { status: 404 })
      }

      const course = unwrapRelation(enrollment.course)
      if (!course) {
        return Response.json({ error: 'Course data not available' }, { status: 400 })
      }

      const pillar = unwrapRelation(course.pillar)
      const pillarName = pillar?.name ?? 'General'

      // Retrieve course content via RAG
      const chunks = await retrieveRelevantChunks(
        `${course.title} ${pillarName} longevity`,
        req.payload,
        req,
        { limit: 8 },
      )

      // Fetch health profile (graceful degradation)
      let healthProfile: any = null
      try {
        healthProfile = await getHealthProfile(req.user!.id as string)
      } catch {
        // Health profile unavailable — continue without personalization
      }

      // Build prompt and generate
      const prompt = buildActionPlanPrompt(course.title as string, pillarName, chunks, healthProfile)
      const messages: ChatMessage[] = [{ role: 'system', content: prompt }]

      const modelConfig = getModelConfig('actionPlan')
      const maxTokens = ctx.aiConfig.tokenBudgets?.actionPlanMaxTokens ?? modelConfig.maxOutputTokens
      const result = await chat(messages, 'actionPlan', { maxTokens, temperature: 0.5 })

      const plan = parseActionPlanResponse(result.content)
      if (!plan) {
        return Response.json({ error: 'Failed to generate a valid action plan. Please try again.' }, { status: 500 })
      }

      // Store the plan
      const actionPlan = await req.payload.create({
        collection: 'action-plans',
        data: {
          user: req.user!.id,
          enrollment: body.enrollmentId,
          course: course.id,
          pillar: pillar?.id,
          status: 'ready',
          plan,
          healthProfileSnapshot: healthProfile
            ? { biomarkers: healthProfile.biomarkers, healthGoals: healthProfile.healthGoals }
            : null,
          generatedAt: new Date().toISOString(),
        },
        req,
        overrideAccess: true,
      })

      // Log usage
      logUsage(req, {
        feature: 'action-plan',
        provider: modelConfig.provider,
        model: modelConfig.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        durationMs: Date.now() - ctx.startTime,
      })

      return Response.json({ actionPlan })
    } catch (err: any) {
      req.payload.logger.error({ err, message: 'Action plan generation failed' })
      return Response.json({ error: 'Failed to generate action plan. Please try again.' }, { status: 500 })
    }
  },
}
