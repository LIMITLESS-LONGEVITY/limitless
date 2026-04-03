'use client'
import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
  ResponsiveContainer,
} from 'recharts'
import { cn } from '@/utilities/ui'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

type DataPoint = {
  date: string
  value: number
  status: string
}

type BiomarkerChartProps = {
  biomarkerName: string
  unit: string
  normalRangeLow: number
  normalRangeHigh: number
  data: DataPoint[]
}

const STATUS_COLORS: Record<string, string> = {
  low: '#60A5FA',
  normal: '#22C55E',
  high: '#C9A84C',
  critical: '#EF4444',
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function computeTrend(data: DataPoint[]): { direction: 'up' | 'down' | 'stable'; percent: number; period: string } {
  if (data.length < 2) return { direction: 'stable', percent: 0, period: '' }

  const first = data[0]
  const last = data[data.length - 1]
  const change = last.value - first.value
  const percent = first.value !== 0 ? Math.abs(Math.round((change / first.value) * 100)) : 0

  const days = Math.round((new Date(last.date).getTime() - new Date(first.date).getTime()) / (1000 * 60 * 60 * 24))
  const period = days < 60 ? `${days} days` : days < 365 ? `${Math.round(days / 30)} months` : `${Math.round(days / 365)} years`

  const direction = percent < 3 ? 'stable' : change > 0 ? 'up' : 'down'

  return { direction, percent, period }
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  return (
    <div className="rounded-lg border border-brand-glass-border bg-brand-dark-alt p-3 text-xs shadow-lg">
      <p className="text-brand-light font-semibold">{data.value} {data.unit}</p>
      <p className="text-brand-silver">{formatDateLong(data.date)}</p>
      <p className={cn(
        'font-medium uppercase text-[10px] mt-1',
        data.status === 'normal' && 'text-green-500',
        data.status === 'high' && 'text-brand-gold',
        data.status === 'low' && 'text-blue-400',
        data.status === 'critical' && 'text-red-400',
      )}>
        {data.status}
      </p>
    </div>
  )
}

export const BiomarkerChart: React.FC<BiomarkerChartProps> = ({
  biomarkerName,
  unit,
  normalRangeLow,
  normalRangeHigh,
  data,
}) => {
  const chartData = data.map((d) => ({
    ...d,
    unit,
    dateLabel: formatDate(d.date),
  }))

  const trend = computeTrend(data)
  const latest = data[data.length - 1]
  const latestColor = STATUS_COLORS[latest?.status] || STATUS_COLORS.normal

  // Calculate Y-axis domain with padding
  const values = data.map((d) => d.value)
  const allValues = [...values, normalRangeLow, normalRangeHigh]
  const yMin = Math.floor(Math.min(...allValues) * 0.85)
  const yMax = Math.ceil(Math.max(...allValues) * 1.15)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-semibold">{biomarkerName}</h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-lg font-display font-light" style={{ color: latestColor }}>
              {latest?.value}
            </span>
            <span className="text-xs text-brand-silver">{unit}</span>
            <span
              className={cn(
                'text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded',
                latest?.status === 'normal' && 'text-green-500 bg-green-500/10',
                latest?.status === 'high' && 'text-brand-gold bg-brand-gold/10',
                latest?.status === 'low' && 'text-blue-400 bg-blue-500/10',
                latest?.status === 'critical' && 'text-red-400 bg-red-500/10',
              )}
            >
              {latest?.status}
            </span>
          </div>
        </div>

        {/* Trend indicator */}
        {trend.period && (
          <div className={cn(
            'flex items-center gap-1 text-xs',
            trend.direction === 'up' && 'text-brand-gold',
            trend.direction === 'down' && 'text-blue-400',
            trend.direction === 'stable' && 'text-brand-silver',
          )}>
            {trend.direction === 'up' && <TrendingUp className="w-3.5 h-3.5" />}
            {trend.direction === 'down' && <TrendingDown className="w-3.5 h-3.5" />}
            {trend.direction === 'stable' && <Minus className="w-3.5 h-3.5" />}
            <span>
              {trend.direction === 'stable' ? 'Stable' : `${trend.percent}%`}
              {trend.period && <span className="text-brand-silver/60 ml-1">/ {trend.period}</span>}
            </span>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            {/* Normal range shading */}
            <ReferenceArea
              y1={normalRangeLow}
              y2={normalRangeHigh}
              fill="#00B4D8"
              fillOpacity={0.06}
              stroke="none"
            />

            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 10, fill: '#B0B8C1' }}
              axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
              tickLine={false}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 10, fill: '#B0B8C1' }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#C9A84C"
              strokeWidth={2}
              dot={(props: any) => {
                const { cx, cy, payload } = props
                const color = STATUS_COLORS[payload.status] || STATUS_COLORS.normal
                return (
                  <circle
                    key={`dot-${payload.date}`}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={color}
                    stroke="rgba(10,14,26,0.8)"
                    strokeWidth={2}
                  />
                )
              }}
              activeDot={{ r: 6, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Normal range label */}
      <p className="text-[10px] text-brand-silver/50 mt-1">
        Normal range: {normalRangeLow}–{normalRangeHigh} {unit}
      </p>
    </div>
  )
}

// Export the trend computation for reuse in AI context
export { computeTrend }
