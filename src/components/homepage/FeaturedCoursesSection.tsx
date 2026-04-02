import { GlassCard } from './GlassCard'
import { SectionHeader } from './SectionHeader'
import { CTAButton } from './CTAButton'
import { ScrollReveal } from './ScrollReveal'
import { Media } from '@/components/Media'
import React from 'react'

import type { Course, Media as MediaType } from '@/payload-types'

interface FeaturedCoursesSectionProps {
  courses: Course[]
}

export const FeaturedCoursesSection: React.FC<FeaturedCoursesSectionProps> = ({ courses }) => {
  if (!courses.length) return null

  return (
    <section className="py-24 md:py-32 bg-brand-dark relative">
      <div className="container max-w-6xl mx-auto px-6">
        <ScrollReveal>
          <SectionHeader
            label="Featured Courses"
            heading="Start Your Learning Journey"
            description="In-depth, structured programs designed by longevity experts."
          />
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {courses.map((course, i) => (
            <ScrollReveal key={course.id} delay={i * 100}>
              <a href={`/courses/${course.slug}`} className="block h-full group rounded-xl focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:outline-none">
                <GlassCard className="h-full flex flex-col overflow-hidden !p-0">
                  {course.featuredImage && typeof course.featuredImage === 'object' && (
                    <div className="relative h-48 overflow-hidden">
                      <Media
                        resource={course.featuredImage as MediaType}
                        fill
                        imgClassName="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[var(--limitless-dark)] to-transparent" />
                    </div>
                  )}
                  <div className="p-6 flex flex-col flex-1">
                    {typeof course.pillar === 'object' && course.pillar?.name && (
                      <span className="text-brand-teal text-xs font-sans uppercase tracking-[0.15em] font-medium mb-2">
                        {course.pillar.name}
                      </span>
                    )}
                    <h3 className="font-display text-xl font-light text-brand-light mb-2 group-hover:text-brand-gold transition-colors">
                      {course.title}
                    </h3>
                    <div className="mt-auto pt-4 flex items-center gap-3 text-brand-silver text-xs font-sans">
                      {course.estimatedDuration && (
                        <span>{course.estimatedDuration} min</span>
                      )}
                      <span className="uppercase tracking-wider text-brand-gold/70">
                        {course.accessLevel}
                      </span>
                    </div>
                  </div>
                </GlassCard>
              </a>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal>
          <div className="text-center mt-12">
            <CTAButton href="/courses" variant="ghost">
              View All Courses
            </CTAButton>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
