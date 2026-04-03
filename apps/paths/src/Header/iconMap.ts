import { User, BookOpen, HeartPulse, Stethoscope, CreditCard, Settings, type LucideIcon } from 'lucide-react'

/** Maps OS config icon names (Lucide identifiers) to React components. */
export const iconMap: Record<string, LucideIcon> = {
  user: User,
  'book-open': BookOpen,
  'heart-pulse': HeartPulse,
  stethoscope: Stethoscope,
  'credit-card': CreditCard,
  settings: Settings,
}
