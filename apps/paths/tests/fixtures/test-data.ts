export const TEST_ADMIN = {
  email: 'test-admin@limitless.test',
  password: 'TestAdmin2026!',
  firstName: 'Test',
  lastName: 'Admin',
  role: 'admin' as const,
}

export const TEST_CONTRIBUTOR = {
  email: 'test-contributor@limitless.test',
  password: 'TestContrib2026!',
  firstName: 'Sarah',
  lastName: 'Contributor',
  role: 'contributor' as const,
}

export const TEST_EDITOR = {
  email: 'test-editor@limitless.test',
  password: 'TestEditor2026!',
  firstName: 'Mike',
  lastName: 'Editor',
  role: 'editor' as const,
}

export const TEST_PUBLISHER = {
  email: 'test-publisher@limitless.test',
  password: 'TestPublisher2026!',
  firstName: 'Jane',
  lastName: 'Publisher',
  role: 'publisher' as const,
}

export const TEST_USER = {
  email: 'test-user@limitless.test',
  password: 'TestUser2026!',
  firstName: 'John',
  lastName: 'User',
  role: 'user' as const,
}

export const TEST_ARTICLE = {
  title: 'E2E Test: Vitamin D Optimization',
  slug: 'e2e-test-vitamin-d',
  excerpt: 'Test article for E2E testing.',
  accessLevel: 'free' as const,
  content: {
    root: {
      type: 'root',
      children: [
        { type: 'heading', tag: 'h2', children: [{ type: 'text', text: 'Section One' }] },
        { type: 'paragraph', children: [{ type: 'text', text: 'This is the first section content for testing.' }] },
        { type: 'heading', tag: 'h2', children: [{ type: 'text', text: 'Section Two' }] },
        { type: 'paragraph', children: [{ type: 'text', text: 'This is the second section with more detailed content.' }] },
      ],
      direction: null, format: '', indent: 0, version: 1,
    },
  },
}

export const TEST_PREMIUM_ARTICLE = {
  title: 'E2E Test: Advanced Sleep Protocols',
  slug: 'e2e-test-sleep-protocols',
  excerpt: 'Premium content for testing locked access.',
  accessLevel: 'premium' as const,
  content: {
    root: {
      type: 'root',
      children: [
        { type: 'heading', tag: 'h2', children: [{ type: 'text', text: 'Premium Content' }] },
        { type: 'paragraph', children: [{ type: 'text', text: 'This premium content should be locked for free users.' }] },
      ],
      direction: null, format: '', indent: 0, version: 1,
    },
  },
}

export const TEST_COURSE = {
  title: 'E2E Test: Longevity Fundamentals',
  slug: 'e2e-test-longevity-fundamentals',
  accessLevel: 'free' as const,
}
