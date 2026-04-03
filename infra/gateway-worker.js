/**
 * LIMITLESS Longevity OS — API Gateway
 *
 * Cloudflare Worker reverse proxy at app.limitless-longevity.health.
 * Routes requests by path prefix to the correct Render backend.
 * Apps serve under their prefix using Next.js basePath (no path rewriting).
 * Root (/) and unmatched routes → OS Dashboard on Cloudflare Pages.
 */

const ROUTES = [
  { prefix: '/train', backend: 'https://limitless-cubes.onrender.com' },
  { prefix: '/book', backend: 'https://limitless-hub.onrender.com' },
  { prefix: '/api/twin', backend: 'https://limitless-digital-twin.onrender.com' },
  { prefix: '/learn', backend: 'https://paths-api.limitless-longevity.health' },
]

const DASHBOARD_URL = 'https://limitless-os-dashboard.pages.dev'

export default {
  async fetch(request) {
    const url = new URL(request.url)

    // Old domain redirects
    const host = url.hostname
    if (host === 'hub.limitless-longevity.health') {
      return Response.redirect(
        new URL(url.pathname.replace(/^\//, '/book/'), 'https://app.limitless-longevity.health'),
        301
      )
    }
    if (host === 'paths.limitless-longevity.health') {
      return Response.redirect(
        new URL(url.pathname.replace(/^\//, '/learn/'), 'https://app.limitless-longevity.health'),
        301
      )
    }
    if (host === 'cubes.elixyr.life' || host === 'cubes.limitless-longevity.health') {
      return Response.redirect(
        new URL(url.pathname.replace(/^\//, '/train/'), 'https://app.limitless-longevity.health'),
        301
      )
    }

    // Route matching — app prefixes
    const route = ROUTES.find(r => url.pathname.startsWith(r.prefix))
    if (route) {
      const target = new URL(url.pathname + url.search, route.backend)
      const headers = new Headers(request.headers)
      headers.set('Host', new URL(route.backend).host)
      headers.set('X-Forwarded-Host', url.hostname)
      headers.set('X-Forwarded-Proto', 'https')

      return fetch(target, {
        method: request.method,
        headers,
        body: request.body,
        redirect: 'manual',
      })
    }

    // Everything else (/, /_next/*, /account/*, etc.) → OS Dashboard on Pages
    const target = new URL(url.pathname + url.search, DASHBOARD_URL)
    return fetch(target, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'manual',
    })
  }
}
