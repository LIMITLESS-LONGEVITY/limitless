import { postgresAdapter } from '@payloadcms/db-postgres'
import { resendAdapter } from '@payloadcms/email-resend'
import sharp from 'sharp'
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'

import { AIUsage } from './collections/AIUsage'
import { ContentChunks } from './collections/ContentChunks'
import { Articles } from './collections/Articles'
import { Courses } from './collections/Courses'
import { Enrollments } from './collections/Enrollments'
import { LessonProgress } from './collections/LessonProgress'
import { Modules } from './collections/Modules'
import { Lessons } from './collections/Lessons'
import { Categories } from './collections/Categories'
import { ContentPillars } from './collections/ContentPillars'
import { Media } from './collections/Media'
import { MembershipTiers } from './collections/MembershipTiers'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Tenants } from './collections/Tenants'
import { Users } from './collections/Users'
import { ActionPlans } from './collections/ActionPlans'
import { DailyProtocols } from './collections/DailyProtocols'
import { Certificates } from './collections/Certificates'
import { Feedback } from './collections/Feedback'
import { Footer } from './Footer/config'
import { Header } from './Header/config'
import { AIConfig } from './globals/AIConfig/config'
import { SiteSettings } from './globals/SiteSettings/config'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { tutorEndpoint } from './endpoints/ai/tutor'
import { quizGenerateEndpoint } from './endpoints/ai/quizGenerate'
import { quizSaveEndpoint } from './endpoints/ai/quizSave'
import { enrollEndpoint } from './endpoints/enrollments/enroll'
import { semanticSearchEndpoint } from './endpoints/ai/search'
import { recommendationsEndpoint } from './endpoints/ai/recommendations'
import { relatedContentEndpoint } from './endpoints/ai/relatedContent'
import { registerEndpoint } from './endpoints/auth/register'
import { discoverEndpoint } from './endpoints/ai/discover'
import { actionPlanEndpoint } from './endpoints/ai/actionPlan'
import { dailyProtocolEndpoint } from './endpoints/ai/dailyProtocol'
import { dailyProtocolStatusEndpoint } from './endpoints/ai/dailyProtocolStatus'
import { resendVerificationEndpoint } from './endpoints/auth/resend-verification'
import { feedbackEndpoint } from './endpoints/feedback'
import { healthEndpoint } from './endpoints/health'
import { tierSyncEndpoint } from './endpoints/internal/tier-sync'
import { myEnrollmentsEndpoint } from './endpoints/me/enrollments'
import { myProtocolEndpoint } from './endpoints/me/protocol'
import { migrations } from './migrations'
import { getServerSideURL } from './utilities/getURL'
import { validateEnv } from './utilities/validateEnv'

// Validate environment variables at startup
validateEnv()

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  // localization disabled — re-enable after generating proper migration
  // localization: {
  //   locales: [
  //     { code: 'en', label: 'English' },
  //     { code: 'es', label: { en: 'Spanish', es: 'Español' }, fallbackLocale: 'en' },
  //     { code: 'ru', label: { en: 'Russian', ru: 'Русский' }, fallbackLocale: 'en' },
  //   ],
  //   defaultLocale: 'en',
  //   fallback: true,
  // },
  admin: {
    components: {},
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
    livePreview: {
      breakpoints: [
        {
          label: 'Mobile',
          name: 'mobile',
          width: 375,
          height: 667,
        },
        {
          label: 'Tablet',
          name: 'tablet',
          width: 768,
          height: 1024,
        },
        {
          label: 'Desktop',
          name: 'desktop',
          width: 1440,
          height: 900,
        },
      ],
    },
  },
  // This config helps us configure global or default features that the other editors can inherit
  editor: defaultLexical,
  email: process.env.CI !== 'true'
    ? resendAdapter({
        defaultFromAddress: process.env.RESEND_FROM_ADDRESS || 'info@limitless-longevity.health',
        defaultFromName: 'PATHS by LIMITLESS',
        apiKey: process.env.RESEND_API_KEY || '',
      })
    : undefined as any,
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL,
    },
    push: false,
    prodMigrations: migrations,
  }),
  collections: [Pages, Posts, Media, Categories, Users, MembershipTiers, ContentPillars, Tenants, Articles, Courses, Modules, Lessons, Enrollments, LessonProgress, AIUsage, ContentChunks, ActionPlans, DailyProtocols, Certificates, Feedback],
  cors: [getServerSideURL()].filter(Boolean),
  endpoints: [feedbackEndpoint, healthEndpoint, tutorEndpoint, quizGenerateEndpoint, quizSaveEndpoint, semanticSearchEndpoint, recommendationsEndpoint, relatedContentEndpoint, enrollEndpoint, registerEndpoint, discoverEndpoint, actionPlanEndpoint, dailyProtocolEndpoint, dailyProtocolStatusEndpoint, resendVerificationEndpoint, tierSyncEndpoint, myEnrollmentsEndpoint, myProtocolEndpoint],
  globals: [Header, Footer, SiteSettings, AIConfig],
  plugins,
  secret: process.env.PAYLOAD_SECRET,
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
    access: {
      run: ({ req }: { req: PayloadRequest }): boolean => {
        // Allow logged in users to execute this endpoint (default)
        if (req.user) return true

        const secret = process.env.CRON_SECRET
        if (!secret) return false

        // If there is no logged in user, then check
        // for the Vercel Cron secret to be present as an
        // Authorization header:
        const authHeader = req.headers.get('authorization')
        return authHeader === `Bearer ${secret}`
      },
    },
    tasks: [],
  },
})
