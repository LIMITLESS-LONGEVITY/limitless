// Stripe price IDs for membership plans (set in env vars)
export const MEMBERSHIP_PRICES: Record<string, string | undefined> = {
  OPTIMUS: process.env.STRIPE_PRICE_OPTIMUS,
  IMMORTALITAS: process.env.STRIPE_PRICE_IMMORTALITAS,
  TRANSCENDENTIA: process.env.STRIPE_PRICE_TRANSCENDENTIA,
  ECLINIC: process.env.STRIPE_PRICE_ECLINIC,
}

// Discount rates applied to diagnostic bookings based on membership plan
export const MEMBERSHIP_DISCOUNTS: Record<string, number> = {
  OPTIMUS: 0,
  IMMORTALITAS: 0.1,
  TRANSCENDENTIA: 0.15,
  VIP: 0.2,
}

// Telemedicine pricing (EUR)
export const TELEMEDICINE_PRICES: Record<string, number> = {
  INITIAL: 150,
  FOLLOW_UP: 100,
  SPECIALIST: 250,
}

// Plans that include telemedicine at no extra cost
export const PLANS_WITH_TELEMEDICINE = ['TRANSCENDENTIA', 'VIP']
