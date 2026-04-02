import { eq, and, gte, desc, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  healthProfiles,
  biomarkers,
  wearableSummaries,
  activityLog,
  longevityScore,
} from '../db/schema.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScoreComponents {
  [key: string]: number;
  biomarker: number;
  wearable: number;
  activity: number;
  lifestyle: number;
}

export interface ScoreResult {
  score: number;
  components: ScoreComponents;
  trend: 'improving' | 'stable' | 'declining' | null;
  previousScore: number | null;
}

// ---------------------------------------------------------------------------
// Component calculators (each returns 0-100)
// ---------------------------------------------------------------------------

/**
 * Biomarker health: % of biomarkers in optimal range (status = 'optimal').
 * Only considers the most recent measurement per biomarker name.
 */
async function calcBiomarkerComponent(userId: string): Promise<number> {
  // Get latest biomarker per name using a subquery approach
  const allBiomarkers = await db
    .select()
    .from(biomarkers)
    .where(eq(biomarkers.userId, userId))
    .orderBy(desc(biomarkers.measuredAt));

  if (allBiomarkers.length === 0) return 0;

  // Deduplicate: keep only the latest per name
  const latest = new Map<string, (typeof allBiomarkers)[0]>();
  for (const b of allBiomarkers) {
    if (!latest.has(b.name)) {
      latest.set(b.name, b);
    }
  }

  const total = latest.size;
  let optimal = 0;
  for (const b of latest.values()) {
    if (b.status === 'optimal') {
      optimal++;
    } else if (!b.status && b.optimalMin !== null && b.optimalMax !== null) {
      // Fallback: check if value is within optimal range
      if (b.value >= b.optimalMin && b.value <= b.optimalMax) {
        optimal++;
      }
    }
  }

  return Math.round((optimal / total) * 100);
}

/**
 * Wearable metrics: normalized average of sleep score, HRV percentile, and step activity.
 * Uses last 7 days of wearable summaries.
 */
async function calcWearableComponent(userId: string): Promise<number> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const dateStr = sevenDaysAgo.toISOString().split('T')[0];

  const summaries = await db
    .select()
    .from(wearableSummaries)
    .where(
      and(
        eq(wearableSummaries.userId, userId),
        gte(wearableSummaries.date, dateStr),
      ),
    );

  if (summaries.length === 0) return 0;

  const avg = (vals: number[]) =>
    vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;

  const sleepScores = summaries.map((s) => s.sleepScore).filter((v): v is number => v !== null);
  const hrvValues = summaries.map((s) => s.hrvAvg).filter((v): v is number => v !== null);
  const stepValues = summaries.map((s) => s.steps).filter((v): v is number => v !== null);
  const recoveryValues = summaries.map((s) => s.recoveryScore).filter((v): v is number => v !== null);

  const subScores: number[] = [];

  // Sleep score: already 0-100 from Oura
  const avgSleep = avg(sleepScores);
  if (avgSleep !== null) subScores.push(Math.min(avgSleep, 100));

  // HRV: normalize to 0-100 (20ms = 0, 80ms+ = 100)
  const avgHrv = avg(hrvValues);
  if (avgHrv !== null) {
    const normalized = Math.max(0, Math.min(100, ((avgHrv - 20) / 60) * 100));
    subScores.push(normalized);
  }

  // Steps: normalize (0 = 0, 10000+ = 100)
  const avgSteps = avg(stepValues);
  if (avgSteps !== null) {
    const normalized = Math.max(0, Math.min(100, (avgSteps / 10000) * 100));
    subScores.push(normalized);
  }

  // Recovery score: already 0-100
  const avgRecovery = avg(recoveryValues);
  if (avgRecovery !== null) subScores.push(Math.min(avgRecovery, 100));

  if (subScores.length === 0) return 0;
  return Math.round(avg(subScores)!);
}

/**
 * Activity/adherence: protocol completion rate + learning engagement.
 * Looks at last 30 days of activity log events.
 */
async function calcActivityComponent(userId: string): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const events = await db
    .select()
    .from(activityLog)
    .where(
      and(
        eq(activityLog.userId, userId),
        gte(activityLog.occurredAt, thirtyDaysAgo),
      ),
    );

  if (events.length === 0) return 0;

  // Count protocol completions and lesson completions
  let protocolCompletions = 0;
  let lessonCompletions = 0;

  for (const event of events) {
    if (event.eventType === 'protocol_completed' || event.eventType === 'protocol_completion') {
      protocolCompletions++;
    }
    if (event.eventType === 'lesson_completed' || event.eventType === 'lesson_completion') {
      lessonCompletions++;
    }
  }

  // Protocol adherence: assume target of 1 per day = 30/month
  // Cap at 100%
  const protocolScore = Math.min(100, (protocolCompletions / 30) * 100);

  // Learning engagement: target 10 lessons/month
  const learningScore = Math.min(100, (lessonCompletions / 10) * 100);

  // Weighted: 60% protocol adherence, 40% learning
  return Math.round(protocolScore * 0.6 + learningScore * 0.4);
}

/**
 * Lifestyle factors: biological age gap (chronological - biological).
 * Positive gap = biologically younger = better.
 * Maps gap to 0-100: -10yr gap = 0, 0 = 50, +10yr gap = 100.
 */
async function calcLifestyleComponent(userId: string): Promise<number> {
  const profile = await db
    .select()
    .from(healthProfiles)
    .where(eq(healthProfiles.userId, userId))
    .limit(1);

  if (
    profile.length === 0 ||
    profile[0].biologicalAge === null ||
    profile[0].chronologicalAge === null
  ) {
    return 0;
  }

  const gap = profile[0].chronologicalAge - profile[0].biologicalAge;
  // Map: -10 -> 0, 0 -> 50, +10 -> 100
  const score = Math.max(0, Math.min(100, 50 + gap * 5));
  return Math.round(score);
}

// ---------------------------------------------------------------------------
// Main scoring function
// ---------------------------------------------------------------------------

const WEIGHTS = {
  biomarker: 0.4,
  wearable: 0.25,
  activity: 0.2,
  lifestyle: 0.15,
};

export async function calculateLongevityScore(userId: string): Promise<ScoreResult> {
  const [biomarker, wearable, activity, lifestyle] = await Promise.all([
    calcBiomarkerComponent(userId),
    calcWearableComponent(userId),
    calcActivityComponent(userId),
    calcLifestyleComponent(userId),
  ]);

  const components: ScoreComponents = { biomarker, wearable, activity, lifestyle };

  const score = Math.round(
    biomarker * WEIGHTS.biomarker +
    wearable * WEIGHTS.wearable +
    activity * WEIGHTS.activity +
    lifestyle * WEIGHTS.lifestyle,
  );

  const today = new Date().toISOString().split('T')[0];

  // Upsert score for today
  await db
    .insert(longevityScore)
    .values({
      userId,
      date: today,
      score,
      components,
    })
    .onConflictDoUpdate({
      target: [longevityScore.userId, longevityScore.date],
      set: {
        score,
        components,
        calculatedAt: new Date(),
      },
    });

  // Fetch previous score (yesterday or most recent before today)
  const previousRows = await db
    .select()
    .from(longevityScore)
    .where(
      and(
        eq(longevityScore.userId, userId),
        sql`${longevityScore.date} < ${today}`,
      ),
    )
    .orderBy(desc(longevityScore.date))
    .limit(1);

  const previousScore = previousRows.length > 0 ? previousRows[0].score : null;

  let trend: ScoreResult['trend'] = null;
  if (previousScore !== null) {
    const diff = score - previousScore;
    if (diff > 2) trend = 'improving';
    else if (diff < -2) trend = 'declining';
    else trend = 'stable';
  }

  return { score, components, trend, previousScore };
}

// ---------------------------------------------------------------------------
// History query
// ---------------------------------------------------------------------------

export async function getLongevityScoreHistory(
  userId: string,
  days: number,
): Promise<{ date: string; score: number; components: Record<string, number> }[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const rows = await db
    .select()
    .from(longevityScore)
    .where(
      and(
        eq(longevityScore.userId, userId),
        gte(longevityScore.date, cutoffStr),
      ),
    )
    .orderBy(longevityScore.date);

  return rows.map((r) => ({
    date: r.date,
    score: r.score,
    components: (r.components ?? {}) as Record<string, number>,
  }));
}
