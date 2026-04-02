import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { wearableDevices, wearableSummaries } from '../db/schema.js';
import {
  refreshAccessToken,
  fetchDailySleep,
  fetchDailyActivity,
  fetchDailyReadiness,
} from './oura.js';

/**
 * Sync a single wearable device: refresh token if needed, fetch data
 * since lastSyncAt, transform to wearableSummaries, upsert.
 */
export async function syncDevice(deviceId: string): Promise<void> {
  const rows = await db
    .select()
    .from(wearableDevices)
    .where(eq(wearableDevices.id, deviceId))
    .limit(1);

  const device = rows[0];
  if (!device || !device.isActive || !device.accessToken) return;

  let token = device.accessToken;

  // Refresh token if expired or expiring within 5 minutes
  if (device.tokenExpiresAt && new Date(device.tokenExpiresAt).getTime() < Date.now() + 300_000) {
    if (!device.refreshToken) return;
    const refreshed = await refreshAccessToken(device.refreshToken);
    token = refreshed.access_token;

    await db
      .update(wearableDevices)
      .set({
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token,
        tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
        updatedAt: new Date(),
      })
      .where(eq(wearableDevices.id, deviceId));
  }

  // Determine date range: last sync → today (max 30 days back)
  const endDate = new Date().toISOString().split('T')[0];
  let startDate: string;
  if (device.lastSyncAt) {
    const last = new Date(device.lastSyncAt);
    last.setDate(last.getDate() - 1); // overlap by 1 day for safety
    startDate = last.toISOString().split('T')[0];
  } else {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    startDate = d.toISOString().split('T')[0];
  }

  // Fetch data from Oura
  const [sleepData, activityData, readinessData] = await Promise.all([
    fetchDailySleep(token, startDate, endDate).catch(() => ({ data: [] })),
    fetchDailyActivity(token, startDate, endDate).catch(() => ({ data: [] })),
    fetchDailyReadiness(token, startDate, endDate).catch(() => ({ data: [] })),
  ]);

  // Index by date for merging
  const byDate = new Map<string, Record<string, unknown>>();

  for (const entry of sleepData.data ?? []) {
    const date = entry.day;
    const existing = byDate.get(date) || {};
    byDate.set(date, {
      ...existing,
      sleepDuration: entry.contributors?.total_sleep
        ? Math.round(entry.contributors.total_sleep / 60)
        : null,
      sleepEfficiency: entry.contributors?.efficiency ?? null,
      sleepDeep: entry.contributors?.deep_sleep ?? null,
      sleepRem: entry.contributors?.rem_sleep ?? null,
      sleepLight: null, // Oura v2 doesn't separate light
      sleepScore: entry.score ?? null,
    });
  }

  for (const entry of readinessData.data ?? []) {
    const date = entry.day;
    const existing = byDate.get(date) || {};
    byDate.set(date, {
      ...existing,
      heartRateResting: entry.contributors?.resting_heart_rate ?? null,
      hrvAvg: entry.contributors?.hrv_balance ?? null,
      recoveryScore: entry.score ?? null,
    });
  }

  for (const entry of activityData.data ?? []) {
    const date = entry.day;
    const existing = byDate.get(date) || {};
    byDate.set(date, {
      ...existing,
      steps: entry.steps ?? null,
      caloriesActive: entry.active_calories ?? null,
      activeMinutes: entry.high_activity_time
        ? Math.round(entry.high_activity_time / 60)
        : null,
    });
  }

  // Upsert summaries
  for (const [date, data] of byDate) {
    const row: typeof wearableSummaries.$inferInsert = {
      userId: device.userId,
      date,
      provider: 'oura',
      sleepDuration: data.sleepDuration as number | undefined,
      sleepEfficiency: data.sleepEfficiency as number | undefined,
      sleepDeep: data.sleepDeep as number | undefined,
      sleepRem: data.sleepRem as number | undefined,
      sleepLight: data.sleepLight as number | undefined,
      sleepScore: data.sleepScore as number | undefined,
      heartRateResting: data.heartRateResting as number | undefined,
      hrvAvg: data.hrvAvg as number | undefined,
      recoveryScore: data.recoveryScore as number | undefined,
      steps: data.steps as number | undefined,
      caloriesActive: data.caloriesActive as number | undefined,
      activeMinutes: data.activeMinutes as number | undefined,
    };

    await db
      .insert(wearableSummaries)
      .values(row)
      .onConflictDoUpdate({
        target: [wearableSummaries.userId, wearableSummaries.date, wearableSummaries.provider],
        set: {
          sleepDuration: row.sleepDuration,
          sleepEfficiency: row.sleepEfficiency,
          sleepDeep: row.sleepDeep,
          sleepRem: row.sleepRem,
          sleepLight: row.sleepLight,
          sleepScore: row.sleepScore,
          heartRateResting: row.heartRateResting,
          hrvAvg: row.hrvAvg,
          recoveryScore: row.recoveryScore,
          steps: row.steps,
          caloriesActive: row.caloriesActive,
          activeMinutes: row.activeMinutes,
        },
      });
  }

  // Update lastSyncAt
  await db
    .update(wearableDevices)
    .set({ lastSyncAt: new Date(), updatedAt: new Date() })
    .where(eq(wearableDevices.id, deviceId));
}
