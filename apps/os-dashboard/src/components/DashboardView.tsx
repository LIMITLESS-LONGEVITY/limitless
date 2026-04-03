'use client'

import { useState } from 'react'
import AppLauncherWidget from '@/components/widgets/AppLauncherWidget'
import LongevityScoreWidget from '@/components/widgets/LongevityScoreWidget'
import MembershipStatusWidget from '@/components/widgets/MembershipStatusWidget'
import HealthWidget from '@/components/widgets/HealthWidget'
import UpcomingEventsWidget from '@/components/widgets/UpcomingEventsWidget'
import LearningProgressWidget from '@/components/widgets/LearningProgressWidget'
import DailyProtocolWidget from '@/components/widgets/DailyProtocolWidget'
import BiomarkerTrendsWidget from '@/components/widgets/BiomarkerTrendsWidget'
import ActivityFeedWidget from '@/components/widgets/ActivityFeedWidget'
import WearableConnectWidget from '@/components/widgets/WearableConnectWidget'
import CoachActivityWidget from '@/components/widgets/CoachActivityWidget'
import TodaysWorkoutWidget from '@/components/widgets/TodaysWorkoutWidget'
import ActiveProgramsWidget from '@/components/widgets/ActiveProgramsWidget'
import CubesAppCard from '@/components/widgets/CubesAppCard'
import GreetingBanner from '@/components/GreetingBanner'
import FeedbackModal from '@/components/FeedbackModal'

interface UserData {
  sub: string
  email: string
  tier: string
  role: string
  firstName?: string
}

export default function DashboardView({ user }: { user: UserData }) {
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8 flex-1 w-full">
        {/* Greeting */}
        <GreetingBanner
          firstName={user.firstName}
          email={user.email}
          userId={user.sub}
          tier={user.tier}
        />

        {/* App Launcher — full width */}
        <AppLauncherWidget userId={user.sub} />

        {/* Widget Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TodaysWorkoutWidget userId={user.sub} />
          <LongevityScoreWidget userId={user.sub} />
          <ActiveProgramsWidget userId={user.sub} />
          <HealthWidget userId={user.sub} />
          <MembershipStatusWidget />
          <UpcomingEventsWidget />
          <LearningProgressWidget />
          <DailyProtocolWidget />
          <ActivityFeedWidget userId={user.sub} />
          <CoachActivityWidget userId={user.sub} />
          <WearableConnectWidget userId={user.sub} />
          <CubesAppCard userId={user.sub} />
        </div>

        {/* Biomarker Trends — full width */}
        <BiomarkerTrendsWidget userId={user.sub} />
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-brand-silver/40 text-sm border-t border-brand-glass-border">
        <span>Limitless Longevity Consultancy</span>
        <span className="mx-2">&middot;</span>
        <button
          onClick={() => setFeedbackOpen(true)}
          className="text-brand-silver/40 hover:text-brand-gold transition-colors"
        >
          Share Feedback
        </button>
      </footer>

      <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  )
}
