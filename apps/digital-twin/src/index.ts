import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';

import authPlugin from './plugins/auth.js';
import serviceAuthPlugin from './plugins/service-auth.js';
import healthRoutes from './routes/health.js';
import profileRoutes from './routes/profile.js';
import biomarkerRoutes from './routes/biomarkers.js';
import aiContextRoutes from './routes/ai-context.js';
import diagnosticRoutes from './routes/diagnostics.js';
import activityRoutes from './routes/activity.js';
import gdprRoutes from './routes/gdpr.js';
import stayRoutes from './routes/stay.js';
import wearableRoutes from './routes/wearable.js';
import wearableDataRoutes from './routes/wearable-data.js';
import consentRoutes from './routes/consents.js';
import { startScheduledSync } from './services/scheduled-sync.js';
import osConfigRoutes from './routes/os-config.js';
import longevityScoreRoutes from './routes/longevity-score.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  // --- Plugins ---
  await fastify.register(cookie);
  await fastify.register(cors, {
    origin: [
      'https://paths.limitless-longevity.health',
      'https://paths-api.limitless-longevity.health',
      'https://cubes.limitless-longevity.health',
      'https://limitless-longevity.health',
    ],
    credentials: true,
  });
  await fastify.register(websocket);

  // --- Auth ---
  await fastify.register(authPlugin);
  await fastify.register(serviceAuthPlugin);

  // --- Routes ---
  await fastify.register(healthRoutes);
  await fastify.register(profileRoutes);
  await fastify.register(biomarkerRoutes);
  await fastify.register(aiContextRoutes);
  await fastify.register(diagnosticRoutes);
  await fastify.register(activityRoutes);
  await fastify.register(gdprRoutes);
  await fastify.register(stayRoutes);
  await fastify.register(wearableRoutes);
  await fastify.register(wearableDataRoutes);
  await fastify.register(consentRoutes);
  await fastify.register(osConfigRoutes);
  await fastify.register(longevityScoreRoutes);

  // --- Start ---
  try {
    await fastify.listen({ port: PORT, host: HOST });
    fastify.log.info(`Digital Twin service listening on ${HOST}:${PORT}`);
    startScheduledSync();
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
