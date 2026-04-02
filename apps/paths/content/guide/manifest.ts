export type GuideTopic = {
  slug: string
  title: string
  description: string
  lastUpdated?: string // ISO date string
  prerequisites?: string[] // slugs of prerequisite topics
}

export type GuideRole = {
  slug: string
  label: string
  description: string
  icon: string // Lucide icon name
  topics: GuideTopic[]
}

export const guideRoles: GuideRole[] = [
  {
    slug: 'user-free',
    label: 'Free User',
    description: 'Get started with PATHS — browse content, create your account, and explore the platform.',
    icon: 'User',
    topics: [
      { slug: 'getting-started', title: 'Getting Started', description: 'Create your account and verify your email' },
      { slug: 'browsing-content', title: 'Browsing Courses & Articles', description: 'Discover longevity education content' },
      { slug: 'content-pillars', title: 'Understanding Content Pillars', description: 'Learn about the six pillars of longevity' },
      { slug: 'reading-articles', title: 'Reading Free Articles', description: 'Access and read available articles' },
      { slug: 'course-previews', title: 'Viewing Course Previews', description: 'Preview courses before upgrading' },
      { slug: 'using-search', title: 'Using Search', description: 'Find content with AI-powered semantic search' },
      { slug: 'content-discovery', title: 'AI Content Discovery', description: 'Get personalized content recommendations' },
      { slug: 'upgrading-plan', title: 'Upgrading Your Plan', description: 'Choose a paid plan for full access' },
      { slug: 'managing-profile', title: 'Managing Your Profile', description: 'Update your account settings' },
    ],
  },
  {
    slug: 'user-paid',
    label: 'Paid User',
    description: 'Unlock the full platform — enroll in courses, use the AI tutor, and track your progress.',
    icon: 'Crown',
    topics: [
      { slug: 'enrolling-courses', title: 'Enrolling in Courses', description: 'Join courses and start learning' },
      { slug: 'completing-lessons', title: 'Completing Lessons & Tracking Progress', description: 'Work through lessons and monitor progress' },
      { slug: 'ai-tutor', title: 'Using the AI Tutor', description: 'Get AI-powered help while learning' },
      { slug: 'taking-quizzes', title: 'Taking Quizzes', description: 'Test your knowledge with interactive quizzes' },
      { slug: 'premium-content', title: 'Accessing Premium Content', description: 'Browse content available to your tier' },
      { slug: 'managing-subscription', title: 'Managing Your Subscription', description: 'View billing, change plans, or cancel' },
      { slug: 'dashboard', title: 'Your Dashboard', description: 'View stats, progress, protocols, and recommendations' },
      { slug: 'health-profile', title: 'Health Profile', description: 'Manage biomarkers, goals, and health data' },
      { slug: 'biomarker-tracking', title: 'Biomarker Tracking', description: 'Track health biomarkers over time', prerequisites: ['health-profile'] },
      { slug: 'action-plans', title: 'AI Action Plans', description: 'Follow personalized 30-day plans after courses' },
      { slug: 'learning-streaks', title: 'Learning Streaks', description: 'Build and maintain daily learning streaks' },
      { slug: 'certificates', title: 'Course Certificates', description: 'Earn and share certificates on course completion' },
      { slug: 'diagnostics', title: 'Booking Diagnostics', description: 'Schedule diagnostic assessments at partner clinics' },
      { slug: 'stay-packages', title: 'Longevity Stay Packages', description: 'Book hotel stays with guided longevity content' },
      { slug: 'telemedicine', title: 'Telemedicine Consultations', description: 'Book expert consultations via the platform' },
      { slug: 'account-settings', title: 'Account Settings & Password', description: 'Update your password and preferences' },
    ],
  },
  {
    slug: 'user-organization',
    label: 'Organization User',
    description: 'Access content assigned by your organization and track team learning paths.',
    icon: 'Building2',
    topics: [
      { slug: 'org-overview', title: 'Organization Overview', description: 'Understand how org access works' },
      { slug: 'assigned-content', title: 'Accessing Assigned Content', description: 'Find content your org has enabled' },
      { slug: 'team-learning-paths', title: 'Team Learning Paths', description: 'Follow structured team learning' },
      { slug: 'progress-dashboard', title: 'Progress Dashboard', description: 'View your learning progress' },
      { slug: 'compliance-dashboard', title: 'Compliance Dashboard', description: 'View team compliance status and certifications' },
      { slug: 'team-certificates', title: 'Team Certificates', description: 'Certificates within your organization' },
      { slug: 'contacting-admin', title: 'Contacting Your Admin', description: 'Reach out to your org administrator' },
      { slug: 'switching-content', title: 'Switching Between Personal & Org Content', description: 'Navigate personal vs. organization content' },
    ],
  },
  {
    slug: 'contributor',
    label: 'Contributor',
    description: 'Create and submit educational content for review using the rich text editor.',
    icon: 'PenTool',
    topics: [
      { slug: 'contributor-overview', title: 'Contributor Role Overview', description: 'Understand your responsibilities as a contributor' },
      { slug: 'creating-articles', title: 'Creating a New Article', description: 'Write a new article from scratch' },
      { slug: 'lexical-editor', title: 'Using the Lexical Editor', description: 'Master the rich text editor' },
      { slug: 'media-and-blocks', title: 'Adding Media, Videos & Callouts', description: 'Enhance content with rich blocks' },
      { slug: 'submitting-review', title: 'Submitting for Review', description: 'Send your article to the editorial team' },
      { slug: 'editorial-workflow', title: 'Understanding Editorial Workflow', description: 'Learn the content lifecycle' },
      { slug: 'managing-drafts', title: 'Managing Your Draft Articles', description: 'Organize and edit your drafts' },
      { slug: 'expert-profiles', title: 'Expert Profiles', description: 'Add practitioner profiles to your content' },
    ],
  },
  {
    slug: 'editor',
    label: 'Editor',
    description: 'Review submitted content, provide feedback, and approve articles for publication.',
    icon: 'FileCheck',
    topics: [
      { slug: 'editor-overview', title: 'Editor Role Overview', description: 'Understand the editor role and responsibilities' },
      { slug: 'reviewing-content', title: 'Reviewing Submitted Content', description: 'Evaluate articles submitted for review' },
      { slug: 'approving-content', title: 'Approving or Requesting Changes', description: 'Approve or send back for revision' },
      { slug: 'editorial-status', title: 'Editorial Status Workflow', description: 'Understand content status transitions' },
      { slug: 'working-with-contributors', title: 'Working with Contributors', description: 'Collaborate effectively with authors' },
    ],
  },
  {
    slug: 'publisher',
    label: 'Publisher',
    description: 'Publish approved content, manage the content lifecycle, and archive outdated material.',
    icon: 'Globe',
    topics: [
      { slug: 'publisher-overview', title: 'Publisher Role Overview', description: 'Understand the publisher role' },
      { slug: 'publishing-content', title: 'Publishing Approved Content', description: 'Make approved content live' },
      { slug: 'scheduling-content', title: 'Scheduling & Managing Published Content', description: 'Schedule and manage live content' },
      { slug: 'archiving-content', title: 'Archiving Content', description: 'Retire outdated content gracefully' },
      { slug: 'content-analytics', title: 'Content Analytics', description: 'Track content performance metrics' },
    ],
  },
  {
    slug: 'admin',
    label: 'Admin',
    description: 'Full platform administration — users, tiers, tenants, courses, AI, billing, and more.',
    icon: 'Shield',
    topics: [
      { slug: 'admin-overview', title: 'Admin Dashboard Overview', description: 'Navigate the admin dashboard' },
      { slug: 'managing-users', title: 'Managing Users & Roles', description: 'Create, edit, and assign user roles' },
      { slug: 'managing-tiers', title: 'Managing Membership Tiers', description: 'Configure access tiers and pricing' },
      { slug: 'managing-tenants', title: 'Managing Tenants (Organizations)', description: 'Set up and manage organizations' },
      { slug: 'managing-courses', title: 'Creating & Managing Courses', description: 'Build courses with modules and lessons' },
      { slug: 'content-pillars', title: 'Content Pillar Configuration', description: 'Set up content categories' },
      { slug: 'ai-configuration', title: 'AI Configuration', description: 'Configure AI models and RAG settings' },
      { slug: 'stripe-billing', title: 'Stripe & Billing Setup', description: 'Configure payment processing' },
      { slug: 'seeding-content', title: 'Seeding Content', description: 'Populate the platform with sample data' },
      { slug: 'managing-health-profiles', title: 'Health Profiles', description: 'Manage user health data and privacy settings' },
      { slug: 'compliance-management', title: 'Compliance Management', description: 'Track B2B staff compliance and certificates' },
      { slug: 'stays-and-telemedicine', title: 'Stays & Telemedicine', description: 'Configure stay packages and telemedicine settings' },
      { slug: 'site-settings', title: 'Site Settings', description: 'Configure global platform settings' },
      { slug: 'troubleshooting', title: 'Monitoring & Troubleshooting', description: 'Diagnose and fix common issues' },
    ],
  },
]

export function getRoleBySlug(slug: string): GuideRole | undefined {
  return guideRoles.find((r) => r.slug === slug)
}

export function getTopicBySlug(roleSlug: string, topicSlug: string): GuideTopic | undefined {
  const role = getRoleBySlug(roleSlug)
  return role?.topics.find((t) => t.slug === topicSlug)
}

export function getAllRoleSlugs(): string[] {
  return guideRoles.map((r) => r.slug)
}

export function getAllTopicSlugs(): Array<{ role: string; topic: string }> {
  return guideRoles.flatMap((r) => r.topics.map((t) => ({ role: r.slug, topic: t.slug })))
}
