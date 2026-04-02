import type { NextConfig } from 'next'

export const redirects: NextConfig['redirects'] = async () => {
  const internetExplorerRedirect = {
    destination: '/ie-incompatible.html',
    has: [
      {
        type: 'header' as const,
        key: 'user-agent',
        value: '(.*Trident.*)', // all ie browsers
      },
    ],
    permanent: false,
    source: '/:path((?!ie-incompatible.html$).*)', // all pages except the incompatibility page
  }

  const redirectsList = [internetExplorerRedirect]

  // When basePath is set, redirect root to basePath so Render health checks
  // and direct URL visitors get a valid response instead of 404
  if (process.env.NEXT_PUBLIC_BASE_PATH) {
    redirectsList.push({
      source: '/',
      destination: process.env.NEXT_PUBLIC_BASE_PATH,
      permanent: false,
      basePath: false as any,
    })
  }

  return redirectsList
}
