import type { Payload, PayloadRequest } from 'payload'
import { SEED_ARTICLES } from './articles-data'
import { SEED_COURSES } from './courses-data'

/** Slugs of test articles created during QA — archive them when seeding real content */
const TEST_ARTICLE_SLUGS = [
  'testing-admin-panel-for-contributors',
  'qa-test-browser-verification-article',
  'advanced-biomarker-analysis',
]

export const seedContent = async ({
  payload,
  req,
}: {
  payload: Payload
  req: PayloadRequest
}): Promise<void> => {
  payload.logger.info('Seeding content...')

  // ── Step 1: Archive existing test articles ──────────────────────────
  const testArticles = await payload.find({
    req,
    overrideAccess: true,
    collection: 'articles',
    where: {
      and: [
        { slug: { in: TEST_ARTICLE_SLUGS } },
        { editorialStatus: { not_equals: 'archived' } },
      ],
    },
    limit: 100,
  })

  for (const article of testArticles.docs) {
    await payload.update({
      req,
      overrideAccess: true,
      collection: 'articles',
      id: article.id,
      data: { editorialStatus: 'archived' },
    })
    payload.logger.info(`  Archived test article: ${article.slug}`)
  }

  // ── Step 2: Look up IDs ─────────────────────────────────────────────
  const pillarsResult = await payload.find({
    req,
    overrideAccess: true,
    collection: 'content-pillars',
    limit: 100,
  })
  const pillarSlugToId: Record<string, number | string> = {}
  for (const pillar of pillarsResult.docs) {
    pillarSlugToId[pillar.slug] = pillar.id
  }

  const tenantResult = await payload.find({
    req,
    overrideAccess: true,
    collection: 'tenants',
    where: { slug: { equals: 'limitless' } },
    limit: 1,
  })
  if (tenantResult.totalDocs === 0) {
    payload.logger.error('  Cannot seed content: no "limitless" tenant found. Run foundation seed first.')
    return
  }
  const tenantId = tenantResult.docs[0].id

  if (!req.user) {
    payload.logger.error('  Cannot seed content: no authenticated user on request.')
    return
  }

  const authorId = req.user.id

  // ── Step 3: Seed articles ───────────────────────────────────────────
  payload.logger.info('  Seeding articles...')

  for (const articleData of SEED_ARTICLES) {
    const existing = await payload.find({
      req,
      overrideAccess: true,
      collection: 'articles',
      where: { slug: { equals: articleData.slug } },
      limit: 1,
    })

    if (existing.totalDocs > 0) {
      payload.logger.info(`    Article already exists: ${articleData.slug}`)
      continue
    }

    const pillarId = pillarSlugToId[articleData.pillarSlug]
    if (!pillarId) {
      payload.logger.error(`    Skipping article "${articleData.slug}": pillar "${articleData.pillarSlug}" not found`)
      continue
    }

    await payload.create({
      req,
      overrideAccess: true,
      collection: 'articles',
      data: {
        tenant: tenantId,
        title: articleData.title,
        slug: articleData.slug,
        excerpt: articleData.excerpt,
        content: articleData.content,
        pillar: pillarId,
        author: authorId,
        accessLevel: articleData.accessLevel,
        editorialStatus: 'published',
        publishedAt: new Date().toISOString(),
      },
    })
    payload.logger.info(`    Created article: ${articleData.title}`)
  }

  // ── Step 4: Seed courses, modules, lessons ──────────────────────────
  payload.logger.info('  Seeding courses...')

  for (const courseData of SEED_COURSES) {
    const existingCourse = await payload.find({
      req,
      overrideAccess: true,
      collection: 'courses',
      where: { slug: { equals: courseData.slug } },
      limit: 1,
    })

    if (existingCourse.totalDocs > 0) {
      payload.logger.info(`    Course already exists: ${courseData.slug}`)
      continue
    }

    const pillarId = pillarSlugToId[courseData.pillarSlug]
    if (!pillarId) {
      payload.logger.error(`    Skipping course "${courseData.slug}": pillar "${courseData.pillarSlug}" not found`)
      continue
    }

    let courseDoc: any
    try {
      courseDoc = await payload.create({
        req,
        overrideAccess: true,
        collection: 'courses',
        data: {
          tenant: tenantId,
          title: courseData.title,
          slug: courseData.slug,
          description: courseData.description,
          pillar: pillarId,
          instructor: authorId,
          accessLevel: courseData.accessLevel,
          editorialStatus: 'published',
          publishedAt: new Date().toISOString(),
        } as any,
      })
      payload.logger.info(`    Created course: ${courseData.title}`)
    } catch (err: any) {
      payload.logger.error(`    Failed to create course "${courseData.title}": ${err?.message || JSON.stringify(err)}`)
      payload.logger.error(`    Full error: ${JSON.stringify(err?.data || err?.errors || err, null, 2)}`)
      continue
    }

    // Create modules for this course
    const moduleIds: (number | string)[] = []

    for (let moduleIndex = 0; moduleIndex < (courseData.modules || []).length; moduleIndex++) {
      const moduleData = courseData.modules[moduleIndex]

      const moduleDoc = await payload.create({
        req,
        overrideAccess: true,
        collection: 'modules',
        data: {
          tenant: tenantId,
          title: moduleData.title,
          description: moduleData.description,
          course: courseDoc.id,
          order: moduleIndex + 1,
        } as any,
      })
      payload.logger.info(`      Created module: ${moduleData.title}`)
      moduleIds.push(moduleDoc.id)

      // Create lessons for this module
      const lessonIds: (number | string)[] = []

      for (let lessonIndex = 0; lessonIndex < (moduleData.lessons || []).length; lessonIndex++) {
        const lessonData = moduleData.lessons[lessonIndex]

        const lessonDoc = await payload.create({
          req,
          overrideAccess: true,
          collection: 'lessons',
          data: {
            tenant: tenantId,
            title: lessonData.title,
            slug: lessonData.slug,
            module: moduleDoc.id,
            order: lessonIndex + 1,
            lessonType: lessonData.lessonType || 'text',
            estimatedDuration: lessonData.estimatedDuration,
            content: lessonData.content,
            ...(lessonData.videoEmbed ? { videoEmbed: lessonData.videoEmbed } : {}),
          } as any,
        })
        payload.logger.info(`        Created lesson: ${lessonData.title}`)
        lessonIds.push(lessonDoc.id)
      }

      // Link lessons back to the module
      if (lessonIds.length > 0) {
        await payload.update({
          req,
          overrideAccess: true,
          collection: 'modules',
          id: moduleDoc.id,
          data: { lessons: lessonIds },
        })
      }
    }

    // Link modules back to the course
    if (moduleIds.length > 0) {
      await payload.update({
        req,
        overrideAccess: true,
        collection: 'courses',
        id: courseDoc.id,
        data: { modules: moduleIds },
      })
    }
  }

  payload.logger.info('Content seeding complete!')
}
