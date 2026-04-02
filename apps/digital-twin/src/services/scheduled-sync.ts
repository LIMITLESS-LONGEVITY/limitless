import { eq, lt } from 'drizzle-orm';
import { db } from '../db/client.js';
import { wearableDevices, wearableData } from '../db/schema.js';
import { syncDevice } from './wearable-sync.js';
import { calculateLongevityScore } from './longevity-score.js';

const SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function runSync() {
  try {
    const activeDevices = await db
      .select({ id: wearableDevices.id, userId: wearableDevices.userId, provider: wearableDevices.provider })
      .from(wearableDevices)
      .where(eq(wearableDevices.isActive, true));

    const syncedUserIds = new Set<string>();

    for (const device of activeDevices) {
      try {
        await syncDevice(device.id);
        syncedUserIds.add(device.userId);
      } catch (err) {
        console.error(`[scheduled-sync] Failed to sync device ${device.id} (${device.provider}):`, (err as Error).message);
      }
    }

    // Recalculate longevity score for each user whose device synced
    for (const userId of syncedUserIds) {
      try {
        await calculateLongevityScore(userId);
      } catch (err) {
        console.error(`[scheduled-sync] Failed to recalculate longevity score for user ${userId}:`, (err as Error).message);
      }
    }

    if (activeDevices.length > 0) {
      console.log(`[scheduled-sync] Synced ${activeDevices.length} device(s), recalculated scores for ${syncedUserIds.size} user(s)`);
    }
  } catch (err) {
    console.error('[scheduled-sync] Failed to list devices:', (err as Error).message);
  }
}

/**
 * Purge wearable_data rows older than 60 days.
 * wearable_summaries are NOT purged (already anonymized/aggregated).
 */
async function purgeStaleWearableData() {
  try {
    const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 days ago
    const deleted = await db
      .delete(wearableData)
      .where(lt(wearableData.time, cutoff))
      .returning({ userId: wearableData.userId });

    console.log(`[purge] Deleted ${deleted.length} wearable_data row(s) older than 60 days`);
  } catch (err) {
    console.error('[purge] Failed to purge stale wearable data:', (err as Error).message);
  }
}

export function startScheduledSync() {
  console.log(`[scheduled-sync] Starting wearable sync every ${SYNC_INTERVAL_MS / 60000} minutes`);
  setInterval(runSync, SYNC_INTERVAL_MS);
  // Run first sync after 30s delay (let server finish starting)
  setTimeout(runSync, 30_000);

  // Daily purge of wearable_data older than 60 days
  console.log('[scheduled-sync] Starting daily wearable_data purge (60-day retention)');
  setInterval(purgeStaleWearableData, PURGE_INTERVAL_MS);
  // Run first purge after 60s delay
  setTimeout(purgeStaleWearableData, 60_000);
}
