/**
 * GET /api/v1/health — Health check endpoint for monitoring (no auth required)
 */
export async function GET() {
  return Response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  })
}
