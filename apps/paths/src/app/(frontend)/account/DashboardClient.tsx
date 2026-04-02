'use client'
import React from 'react'
import Link from 'next/link'
import { cn } from '@/utilities/ui'
import { GlassCard } from '@/components/homepage/GlassCard'
import { CTAButton } from '@/components/homepage/CTAButton'
import { TierBadge } from '@/components/TierBadge'
import { Media } from '@/components/Media'
import { BookOpen, FileText, Sparkles, GraduationCap, CheckCircle2, Trophy, Flame } from 'lucide-react'
import { OnboardingTour } from '@/components/OnboardingTour'
import { DailyProtocolWidget } from '@/components/DailyProtocolWidget'

type ActiveEnrollment = {
  id: string
  courseTitle: string
  courseSlug: string
  courseFeaturedImage: any
  completionPercentage: number
  enrolledAt: string
}

type CompletedEnrollment = {
  id: string
  courseTitle: string
  courseSlug: string
  completedAt: string
}

type RecentActivity = {
  id: string
  lessonTitle: string
  courseTitle: string
  courseSlug: string
  completedAt: string
}

type DashboardProps = {
  firstName: string
  tierName: string
  tierAccess: string
  activeEnrollments: ActiveEnrollment[]
  completedEnrollments: CompletedEnrollment[]
  recentActivity: RecentActivity[]
  stats: {
    coursesEnrolled: number
    lessonsCompleted: number
    coursesCompleted: number
  }
  showOnboarding?: boolean
  userId?: string
  hasEnrollments?: boolean
  currentStreak?: number
  longestStreak?: number
}

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Recently'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return 'Recently'
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

export default function DashboardClient({
  firstName,
  tierName: _tierName,
  tierAccess,
  activeEnrollments,
  completedEnrollments,
  recentActivity,
  stats,
  showOnboarding,
  userId,
  hasEnrollments,
  currentStreak = 0,
  longestStreak = 0,
}: DashboardProps) {
  return (
    <div className="space-y-8">
      {showOnboarding && userId && <OnboardingTour userId={userId} />}
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-light tracking-wide mb-1">
            Welcome back, {firstName}
          </h1>
          <p className="text-sm text-brand-silver">Your longevity learning dashboard</p>
        </div>
        <TierBadge tier={tierAccess} className="text-xs px-2.5 py-1" />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <GlassCard hover={false} className="p-4 md:p-5 text-center">
          <GraduationCap className="w-5 h-5 text-brand-teal mx-auto mb-2" />
          <p className="text-2xl font-display font-light text-brand-light">{stats.coursesEnrolled}</p>
          <p className="text-[11px] text-brand-silver mt-0.5">Courses Enrolled</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 md:p-5 text-center">
          <CheckCircle2 className="w-5 h-5 text-brand-gold mx-auto mb-2" />
          <p className="text-2xl font-display font-light text-brand-light">{stats.lessonsCompleted}</p>
          <p className="text-[11px] text-brand-silver mt-0.5">Lessons Completed</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 md:p-5 text-center">
          <Trophy className="w-5 h-5 text-brand-gold mx-auto mb-2" />
          <p className="text-2xl font-display font-light text-brand-light">{stats.coursesCompleted}</p>
          <p className="text-[11px] text-brand-silver mt-0.5">Courses Completed</p>
        </GlassCard>
        <GlassCard hover={false} className="p-4 md:p-5 text-center">
          <Flame className={cn('w-5 h-5 mx-auto mb-2', currentStreak > 0 ? 'text-brand-gold' : 'text-brand-silver/40')} />
          <p className="text-2xl font-display font-light text-brand-light">{currentStreak}</p>
          <p className="text-[11px] text-brand-silver mt-0.5">Day Streak</p>
          {longestStreak > 0 && (
            <p className="text-[9px] text-brand-silver/50 mt-0.5">Best: {longestStreak}</p>
          )}
        </GlassCard>
      </div>

      {/* Daily Protocol */}
      {hasEnrollments && <DailyProtocolWidget tierAccess={tierAccess} />}

      {/* Active Courses */}
      {activeEnrollments.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-silver mb-4">
            Continue Learning
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeEnrollments.map((enrollment) => (
              <Link key={enrollment.id} href={`/courses/${enrollment.courseSlug}`} className="block">
                <GlassCard className="p-0 overflow-hidden">
                  {/* Course Image */}
                  {enrollment.courseFeaturedImage &&
                    typeof enrollment.courseFeaturedImage !== 'string' && (
                      <div className="h-32 relative overflow-hidden">
                        <Media
                          resource={enrollment.courseFeaturedImage}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/80 to-transparent" />
                      </div>
                    )}
                  <div className="p-4">
                    <h3 className="text-sm font-semibold mb-2 line-clamp-1">
                      {enrollment.courseTitle}
                    </h3>
                    {/* Progress Bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-brand-dark-alt rounded-full">
                        <div
                          className="h-full bg-brand-gold rounded-full transition-all"
                          style={{ width: `${enrollment.completionPercentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-brand-silver">
                        {enrollment.completionPercentage}%
                      </span>
                    </div>
                  </div>
                </GlassCard>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-silver mb-4">
            Recent Activity
          </h2>
          <GlassCard hover={false} className="p-0 divide-y divide-brand-glass-border">
            {recentActivity.map((item) => (
              <Link
                key={item.id}
                href={`/courses/${item.courseSlug}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-brand-glass-bg-hover transition-colors first:rounded-t-2xl last:rounded-b-2xl"
              >
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{item.lessonTitle}</p>
                  <p className="text-xs text-brand-silver truncate">{item.courseTitle}</p>
                </div>
                <span className="text-xs text-brand-silver whitespace-nowrap">
                  {timeAgo(item.completedAt)}
                </span>
              </Link>
            ))}
          </GlassCard>
        </div>
      )}

      {/* Completed Courses */}
      {completedEnrollments.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-silver mb-4">
            Completed
          </h2>
          <div className="space-y-2">
            {completedEnrollments.map((enrollment) => (
              <Link
                key={enrollment.id}
                href={`/courses/${enrollment.courseSlug}`}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-brand-glass-border hover:bg-brand-glass-bg-hover transition-colors"
              >
                <Trophy className="w-4 h-4 text-brand-gold flex-shrink-0" />
                <span className="text-sm flex-1">{enrollment.courseTitle}</span>
                <span className="text-xs text-brand-silver">
                  {new Date(enrollment.completedAt).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {activeEnrollments.length === 0 && completedEnrollments.length === 0 && (
        <GlassCard hover={false} className="text-center py-12">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-brand-silver/30" />
          <p className="text-brand-silver mb-4">
            You haven&apos;t enrolled in any courses yet.
          </p>
          <CTAButton href="/courses" variant="gold">
            Browse Courses
          </CTAButton>
        </GlassCard>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-silver mb-4">
          Explore
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <CTAButton href="/courses" variant="ghost" className="justify-start gap-2 px-4 text-left">
            <BookOpen className="w-4 h-4" />
            Browse Courses
          </CTAButton>
          <CTAButton href="/articles" variant="ghost" className="justify-start gap-2 px-4 text-left">
            <FileText className="w-4 h-4" />
            Browse Articles
          </CTAButton>
          <a
            href="/book/diagnostics"
            className="inline-flex items-center justify-start gap-2 px-4 text-left font-sans text-xs uppercase tracking-[0.15em] font-medium rounded-full transition-all duration-300 min-h-[44px] border border-brand-glass-border text-brand-silver hover:border-brand-silver hover:text-brand-light focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:outline-none"
          >
            <Sparkles className="w-4 h-4" />
            Diagnostic Packages
          </a>
        </div>
      </div>
    </div>
  )
}
