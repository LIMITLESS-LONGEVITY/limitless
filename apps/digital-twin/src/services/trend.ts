export type TrendDirection = 'improving' | 'stable' | 'declining' | null;

interface BiomarkerReading {
  value: number;
  measuredAt: Date;
}

interface OptimalRange {
  optimalMin?: number | null;
  optimalMax?: number | null;
}

/**
 * Calculate trend for a series of biomarker readings.
 *
 * Logic:
 * - If fewer than 2 data points: null
 * - If optimal range is set: compare last value's distance to optimal midpoint
 *   vs previous values' average distance. Closer = improving, farther = declining.
 * - If no optimal range: compare last value to previous average.
 *   Rising = 'improving' (arbitrary default). Within 5% = stable.
 */
export function calculateTrend(
  values: BiomarkerReading[],
  range?: OptimalRange,
): TrendDirection {
  if (values.length < 2) return null;

  // Sort by measuredAt ascending (oldest first)
  const sorted = [...values].sort(
    (a, b) => a.measuredAt.getTime() - b.measuredAt.getTime(),
  );

  const lastValue = sorted[sorted.length - 1].value;
  const previousValues = sorted.slice(0, -1);
  const previousAvg =
    previousValues.reduce((sum, v) => sum + v.value, 0) / previousValues.length;

  const hasOptimalRange =
    range &&
    range.optimalMin != null &&
    range.optimalMax != null;

  if (hasOptimalRange) {
    const optMin = range.optimalMin!;
    const optMax = range.optimalMax!;
    const midpoint = (optMin + optMax) / 2;

    const lastDistance = Math.abs(lastValue - midpoint);
    const prevDistance = Math.abs(previousAvg - midpoint);

    // Use 5% of the range as threshold for "stable"
    const rangeSpan = optMax - optMin;
    const threshold = rangeSpan > 0 ? rangeSpan * 0.05 : Math.abs(midpoint * 0.05);

    if (Math.abs(lastDistance - prevDistance) <= threshold) {
      return 'stable';
    }

    return lastDistance < prevDistance ? 'improving' : 'declining';
  }

  // No optimal range: compare last to previous average
  const diff = lastValue - previousAvg;
  const threshold = Math.abs(previousAvg) * 0.05 || 0.05; // 5% or absolute 0.05

  if (Math.abs(diff) <= threshold) {
    return 'stable';
  }

  // Without optimal range, rising = improving (arbitrary)
  return diff > 0 ? 'improving' : 'declining';
}
