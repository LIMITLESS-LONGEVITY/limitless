/**
 * @limitless/api-client
 *
 * Service URLs and health check utilities for the LIMITLESS platform.
 * Used by agents and monitoring to verify service health.
 */

import type { HealthResponse } from '@limitless/shared-types'

/** Production service URLs (via gateway) */
export const SERVICES = {
  paths: {
    name: 'PATHS',
    gatewayUrl: 'https://app.limitless-longevity.health/learn',
    directUrl: 'https://paths-api.onrender.com/learn',
    healthEndpoint: '/api/health',
    expectedHealthStatus: 200,
  },
  hub: {
    name: 'HUB',
    gatewayUrl: 'https://app.limitless-longevity.health/book',
    directUrl: 'https://limitless-hub.onrender.com/book',
    healthEndpoint: '/api/health',
    expectedHealthStatus: 200,
  },
  digitalTwin: {
    name: 'Digital Twin',
    gatewayUrl: 'https://app.limitless-longevity.health/api/twin',
    directUrl: 'https://limitless-digital-twin.onrender.com',
    healthEndpoint: '/api/health',
    expectedHealthStatus: 200,
  },
  cubes: {
    name: 'Cubes+',
    gatewayUrl: 'https://app.limitless-longevity.health/train',
    directUrl: 'https://limitless-cubes.onrender.com/train',
    healthEndpoint: '/api/v1/domains',
    expectedHealthStatus: 401, // Returns 401 when not authed — means app is running
  },
  osDashboard: {
    name: 'OS Dashboard',
    gatewayUrl: 'https://app.limitless-longevity.health/',
    directUrl: 'https://limitless-os-dashboard.pages.dev/',
    healthEndpoint: '/',
    expectedHealthStatus: 200,
  },
} as const

export type ServiceName = keyof typeof SERVICES

/**
 * Check health of a single service.
 */
export async function checkServiceHealth(
  serviceName: ServiceName,
  useGateway = true,
): Promise<HealthResponse> {
  const svc = SERVICES[serviceName]
  const baseUrl = useGateway ? svc.gatewayUrl : svc.directUrl
  const url = `${baseUrl}${svc.healthEndpoint}`

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    const healthy = res.status === svc.expectedHealthStatus

    return {
      status: healthy ? 'ok' : 'degraded',
      service: svc.name,
      timestamp: new Date().toISOString(),
    }
  } catch {
    return {
      status: 'down',
      service: svc.name,
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Check health of all services. Returns a map of service name to health status.
 */
export async function checkAllServices(
  useGateway = true,
): Promise<Record<ServiceName, HealthResponse>> {
  const entries = await Promise.all(
    (Object.keys(SERVICES) as ServiceName[]).map(async (name) => {
      const health = await checkServiceHealth(name, useGateway)
      return [name, health] as const
    }),
  )
  return Object.fromEntries(entries) as Record<ServiceName, HealthResponse>
}
