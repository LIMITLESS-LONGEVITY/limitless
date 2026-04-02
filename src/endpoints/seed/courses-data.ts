/**
 * Seed data for courses, modules, and lessons.
 *
 * Courses reference pillar slugs (resolved at seed time) and contain
 * nested module/lesson definitions that are created bottom-up
 * (lessons -> modules -> courses).
 */

// ---------------------------------------------------------------------------
// Lexical helpers
// ---------------------------------------------------------------------------

const text = (t: string) => ({
  type: 'text' as const,
  detail: 0,
  format: 0,
  mode: 'normal' as const,
  style: '',
  text: t,
  version: 1,
})

const paragraph = (t: string) => ({
  type: 'paragraph' as const,
  children: [text(t)],
  direction: 'ltr' as const,
  format: '' as const,
  indent: 0,
  textFormat: 0,
  version: 1,
})

const heading = (tag: 'h2' | 'h3', t: string) => ({
  type: 'heading' as const,
  tag,
  children: [text(t)],
  direction: 'ltr' as const,
  format: '' as const,
  indent: 0,
  version: 1,
})

const callout = (id: string, type: 'tip' | 'info' | 'warning', t: string) => ({
  type: 'block' as const,
  fields: {
    id,
    blockType: 'callout',
    type,
    content: {
      root: {
        type: 'root' as const,
        children: [paragraph(t)],
        direction: null,
        format: '' as const,
        indent: 0,
        version: 1,
      },
    },
  },
  version: 2,
})

const lexical = (...children: Record<string, unknown>[]) => ({
  root: {
    type: 'root' as const,
    children,
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    version: 1,
  },
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SeedLesson {
  title: string
  slug: string
  order: number
  lessonType: 'text' | 'video'
  estimatedDuration: number
  content: ReturnType<typeof lexical>
  videoEmbed?: { platform: 'youtube'; url: string; videoId: string }
}

export interface SeedModule {
  title: string
  description: string
  order: number
  lessons: SeedLesson[]
}

export interface SeedCourse {
  title: string
  slug: string
  description: ReturnType<typeof lexical>
  accessLevel: 'free' | 'regular' | 'premium'
  pillarSlug: string
  modules: SeedModule[]
}

// ---------------------------------------------------------------------------
// Course 1: Foundations of Longevity (free)
// ---------------------------------------------------------------------------

const foundationsOfLongevity: SeedCourse = {
  title: 'Foundations of Longevity',
  slug: 'foundations-of-longevity',
  accessLevel: 'free',
  pillarSlug: 'longevity-science',
  description: lexical(
    paragraph(
      'This introductory course provides a comprehensive overview of the science behind human longevity. You will learn about the biological mechanisms of aging, the most promising interventions backed by peer-reviewed research, and how to translate that knowledge into actionable daily habits.',
    ),
    paragraph(
      'Whether you are a busy executive looking to optimize your healthspan or simply curious about the latest advances in aging research, this course lays the groundwork for every other programme on the PATHS platform.',
    ),
    paragraph(
      'By the end of the course you will have a personalised longevity protocol grounded in evidence-based nutrition, exercise, and recovery strategies.',
    ),
  ),
  modules: [
    // Module 1 — Understanding Aging
    {
      title: 'Understanding Aging',
      description: 'Explore the biological mechanisms that drive the aging process and learn how modern science measures and interprets biological age.',
      order: 1,
      lessons: [
        {
          title: 'What Is Biological Aging?',
          slug: 'what-is-biological-aging',
          order: 1,
          lessonType: 'text',
          estimatedDuration: 10,
          content: lexical(
            heading('h2', 'What Is Biological Aging?'),
            paragraph(
              'Biological aging, also known as senescence, refers to the gradual decline in cellular and physiological function that occurs over time. Unlike chronological age, which simply counts the years since birth, biological age captures how well your body is actually functioning at a molecular level.',
            ),
            paragraph(
              'Researchers have identified several molecular markers — including telomere length, DNA methylation patterns, and proteome composition — that correlate strongly with functional decline. Understanding these markers is the first step toward intervening in the aging process itself.',
            ),
            callout(
              'c1m1l1-callout-1',
              'tip',
              'Your biological age can differ from your chronological age by a decade or more. Lifestyle factors such as diet, exercise, and sleep quality are the primary drivers of that gap.',
            ),
            paragraph(
              'In the following lessons we will examine the hallmarks of aging framework and the practical tools available to measure your own biological age with clinical precision.',
            ),
          ),
        },
        {
          title: 'The Hallmarks of Aging Explained',
          slug: 'hallmarks-of-aging-explained',
          order: 2,
          lessonType: 'text',
          estimatedDuration: 15,
          content: lexical(
            heading('h2', 'The Hallmarks of Aging Explained'),
            paragraph(
              'In 2013, Lopez-Otin and colleagues published a landmark paper identifying nine hallmarks of aging: genomic instability, telomere attrition, epigenetic alterations, loss of proteostasis, deregulated nutrient sensing, mitochondrial dysfunction, cellular senescence, stem cell exhaustion, and altered intercellular communication. These categories have since been expanded to twelve.',
            ),
            paragraph(
              'Each hallmark represents a distinct but interconnected pathway that contributes to the aging phenotype. Genomic instability, for example, leads to accumulated DNA damage that impairs cellular function, while mitochondrial dysfunction reduces the cell\'s ability to produce energy efficiently.',
            ),
            callout(
              'c1m1l2-callout-1',
              'info',
              'The hallmarks framework is not merely academic — it provides a roadmap for intervention. Many longevity therapeutics under development target one or more specific hallmarks.',
            ),
            paragraph(
              'Understanding how these hallmarks interact is crucial for designing effective longevity protocols. A supplement that addresses mitochondrial dysfunction, for instance, may have limited benefit if chronic inflammation (altered intercellular communication) is the dominant driver of decline.',
            ),
          ),
        },
        {
          title: 'Measuring Your Biological Age',
          slug: 'measuring-your-biological-age',
          order: 3,
          lessonType: 'text',
          estimatedDuration: 12,
          content: lexical(
            heading('h2', 'Measuring Your Biological Age'),
            paragraph(
              'Epigenetic clocks — algorithms that estimate biological age from DNA methylation patterns — have emerged as the gold-standard tool for measuring the pace of aging. The most widely validated clocks include the Horvath clock, the GrimAge clock, and the DunedinPACE measure of pace-of-aging.',
            ),
            paragraph(
              'Beyond epigenetic testing, composite biomarker panels offer a more accessible snapshot of biological age. Markers such as fasting glucose, hsCRP, GGT, cystatin C, and HbA1c can be combined into scoring systems that approximate epigenetic age without the cost of methylation assays.',
            ),
            callout(
              'c1m1l3-callout-1',
              'tip',
              'For the most actionable results, pair an epigenetic clock test with a comprehensive blood panel. The clock tells you where you stand; the blood panel tells you what to optimise first.',
            ),
            paragraph(
              'We recommend establishing a baseline measurement and then retesting every six to twelve months to track the impact of lifestyle interventions. Consistency of laboratory and testing provider is important for meaningful longitudinal comparisons.',
            ),
          ),
        },
      ],
    },

    // Module 2 — The Longevity Toolkit
    {
      title: 'The Longevity Toolkit',
      description: 'Learn the core lifestyle interventions — nutrition, exercise, and sleep — that have the strongest evidence for extending healthspan.',
      order: 2,
      lessons: [
        {
          title: 'Nutrition Fundamentals for Longevity',
          slug: 'nutrition-fundamentals-for-longevity',
          order: 1,
          lessonType: 'text',
          estimatedDuration: 12,
          content: lexical(
            heading('h2', 'Nutrition Fundamentals for Longevity'),
            paragraph(
              'Nutritional science as it pertains to longevity focuses on caloric balance, macronutrient quality, and the timing of food intake. Decades of research in model organisms — from yeast to primates — demonstrate that caloric restriction without malnutrition can extend both lifespan and healthspan.',
            ),
            paragraph(
              'For most executives, strict caloric restriction is neither practical nor necessary. Instead, focusing on nutrient-dense whole foods, adequate protein intake (1.2-1.6 g/kg lean body mass), and minimising ultra-processed food consumption delivers the majority of longevity benefits without the downsides of chronic under-eating.',
            ),
            callout(
              'c1m2l1-callout-1',
              'tip',
              'Protein quality matters as much as quantity. Prioritise leucine-rich sources — eggs, whey, poultry, fish — to maximise muscle protein synthesis, which declines with age.',
            ),
            paragraph(
              'In the next lesson we explore how exercise acts as a powerful modulator of nearly every hallmark of aging, and how to structure a training programme for longevity rather than purely aesthetic goals.',
            ),
          ),
        },
        {
          title: 'Exercise as Medicine',
          slug: 'exercise-as-medicine',
          order: 2,
          lessonType: 'video',
          estimatedDuration: 15,
          videoEmbed: {
            platform: 'youtube',
            url: 'https://www.youtube.com/watch?v=jN0pRAqiUJU',
            videoId: 'jN0pRAqiUJU',
          },
          content: lexical(
            heading('h2', 'Exercise as Medicine'),
            paragraph(
              'Exercise is arguably the single most potent longevity intervention available today. Regular physical activity improves cardiovascular function, enhances insulin sensitivity, preserves lean muscle mass, and upregulates autophagy — the cellular recycling process that clears damaged components.',
            ),
            paragraph(
              'The optimal exercise prescription for longevity includes a balance of four modalities: zone-2 aerobic training (approximately 150-180 minutes per week), high-intensity interval training (one to two sessions per week), resistance training (two to three sessions targeting major muscle groups), and stability or mobility work.',
            ),
            callout(
              'c1m2l2-callout-1',
              'info',
              'VO2 max is one of the strongest predictors of all-cause mortality. Improving your VO2 max from the 25th to the 75th percentile for your age is associated with a roughly 50% reduction in mortality risk.',
            ),
            paragraph(
              'Watch the video above for a detailed discussion of how to structure an exercise programme that balances performance, longevity, and the practical constraints of a demanding executive schedule.',
            ),
          ),
        },
        {
          title: 'Sleep and Recovery Essentials',
          slug: 'sleep-and-recovery-essentials',
          order: 3,
          lessonType: 'text',
          estimatedDuration: 10,
          content: lexical(
            heading('h2', 'Sleep and Recovery Essentials'),
            paragraph(
              'Sleep is the foundational pillar upon which every other longevity intervention rests. During deep (N3) sleep the glymphatic system clears metabolic waste products — including amyloid-beta — from the brain. Growth hormone secretion peaks during slow-wave sleep, driving tissue repair and immune function.',
            ),
            paragraph(
              'Chronic sleep deprivation (fewer than six hours per night) is associated with elevated cortisol, impaired glucose regulation, accelerated telomere shortening, and a significantly increased risk of cardiovascular disease and neurodegenerative conditions.',
            ),
            callout(
              'c1m2l3-callout-1',
              'tip',
              'Aim for seven to nine hours of sleep opportunity per night. Consistency of sleep and wake times matters more than total duration — irregular schedules impair circadian alignment even when total sleep hours are adequate.',
            ),
            paragraph(
              'Simple environmental optimisations — a cool bedroom (18-19 degrees Celsius), blackout curtains, and cessation of screen use 60 minutes before bed — can dramatically improve sleep quality without any supplements or devices.',
            ),
          ),
        },
      ],
    },

    // Module 3 — Building Your Protocol
    {
      title: 'Building Your Protocol',
      description: 'Synthesise everything you have learned into a personal longevity protocol with clear goals, tracking systems, and an actionable plan.',
      order: 3,
      lessons: [
        {
          title: 'Setting Longevity Goals',
          slug: 'setting-longevity-goals',
          order: 1,
          lessonType: 'text',
          estimatedDuration: 8,
          content: lexical(
            heading('h2', 'Setting Longevity Goals'),
            paragraph(
              'Effective longevity planning begins with defining what a long, healthy life looks like for you personally. Rather than abstract targets such as "live to 100", focus on functional goals: being able to play with grandchildren at 80, maintaining cognitive sharpness to lead a board at 75, or completing a challenging hike at 70.',
            ),
            paragraph(
              'These functional anchors — sometimes called "Centenarian Decathlon" events — provide concrete training targets that can be reverse-engineered into today\'s daily habits. If you want to carry a 15-kilogram suitcase through an airport at age 85, you need to be significantly stronger than that at 60.',
            ),
            callout(
              'c1m3l1-callout-1',
              'tip',
              'Write down three physical tasks you want to be able to perform at age 80. Work backward from those to define your current training and nutrition priorities.',
            ),
            paragraph(
              'Goal-setting also creates psychological commitment. Research on implementation intentions shows that people who articulate specific "when-where-how" plans are two to three times more likely to follow through compared to those who rely on motivation alone.',
            ),
          ),
        },
        {
          title: 'Tracking and Measuring Progress',
          slug: 'tracking-and-measuring-progress',
          order: 2,
          lessonType: 'text',
          estimatedDuration: 10,
          content: lexical(
            heading('h2', 'Tracking and Measuring Progress'),
            paragraph(
              'What gets measured gets managed. A robust tracking system should include both leading indicators (daily behaviours like sleep duration, step count, and protein intake) and lagging indicators (quarterly or annual biomarker panels, body composition scans, and cardiorespiratory fitness tests).',
            ),
            paragraph(
              'Wearable devices such as Oura Ring, WHOOP, and Apple Watch provide continuous data on heart rate variability, sleep stages, and activity levels. While no consumer device is perfectly accurate, trends over time are highly informative and can surface problems — such as declining HRV or increasing resting heart rate — before symptoms appear.',
            ),
            callout(
              'c1m3l2-callout-1',
              'info',
              'Do not chase daily numbers. Focus on weekly and monthly trends. A single bad night of sleep or a high resting heart rate on one day is noise — a consistent downward trend over weeks is signal.',
            ),
            paragraph(
              'We recommend a quarterly review cadence: assess your biomarkers, review wearable trends, and adjust your protocol accordingly. Document changes so you can correlate interventions with outcomes over time.',
            ),
          ),
        },
        {
          title: 'Creating Your Personal Longevity Plan',
          slug: 'creating-your-personal-longevity-plan',
          order: 3,
          lessonType: 'text',
          estimatedDuration: 12,
          content: lexical(
            heading('h2', 'Creating Your Personal Longevity Plan'),
            paragraph(
              'A personal longevity plan integrates nutrition, exercise, sleep, stress management, and targeted supplementation into a cohesive daily and weekly schedule. The most effective plans are simple enough to follow consistently — complexity is the enemy of adherence.',
            ),
            paragraph(
              'Start with the "big three" non-negotiables: a minimum of 150 minutes of zone-2 cardio per week, two strength-training sessions, and a consistent sleep schedule with at least seven hours of sleep opportunity. Layer additional interventions — such as time-restricted eating or cold exposure — only after the fundamentals are solidly in place.',
            ),
            callout(
              'c1m3l3-callout-1',
              'tip',
              'The best longevity plan is the one you actually follow. Start with two or three habits you can sustain for six months before adding complexity. Consistency over intensity.',
            ),
            paragraph(
              'Revisit and refine your plan every quarter using the tracking framework from the previous lesson. Longevity is a decades-long endeavour; your protocol should evolve as your body, circumstances, and the scientific evidence evolve.',
            ),
          ),
        },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Course 2: Executive Nutrition Masterclass (regular)
// ---------------------------------------------------------------------------

const executiveNutritionMasterclass: SeedCourse = {
  title: 'Executive Nutrition Masterclass',
  slug: 'executive-nutrition-masterclass',
  accessLevel: 'regular',
  pillarSlug: 'nutrition',
  description: lexical(
    paragraph(
      'The Executive Nutrition Masterclass is designed for high-performing professionals who want to optimise their metabolic health, cognitive function, and body composition through evidence-based nutritional strategies.',
    ),
    paragraph(
      'This course goes beyond generic dietary advice. You will explore the molecular mechanisms of metabolic health, evaluate the clinical evidence for popular supplements, and build practical meal frameworks that work within the constraints of a demanding schedule and frequent travel.',
    ),
    paragraph(
      'By the end of this course you will have a personalised nutrition protocol backed by the same science used in elite longevity clinics worldwide.',
    ),
  ),
  modules: [
    // Module 1 — Metabolic Fundamentals
    {
      title: 'Metabolic Fundamentals',
      description: 'Understand the core metabolic pathways that influence aging, energy, and body composition — from insulin signalling to autophagy.',
      order: 1,
      lessons: [
        {
          title: 'Understanding Metabolic Health',
          slug: 'understanding-metabolic-health',
          order: 1,
          lessonType: 'text',
          estimatedDuration: 12,
          content: lexical(
            heading('h2', 'Understanding Metabolic Health'),
            paragraph(
              'Metabolic health is defined by the body\'s ability to efficiently regulate blood glucose, insulin, lipids, and inflammatory markers. Alarmingly, fewer than seven percent of American adults meet all five criteria for optimal metabolic health, making metabolic dysfunction the silent epidemic of our era.',
            ),
            paragraph(
              'The five pillars of metabolic health are: fasting glucose below 100 mg/dL, triglycerides below 150 mg/dL, HDL above 40 mg/dL (men) or 50 mg/dL (women), waist circumference below 102 cm (men) or 88 cm (women), and blood pressure below 120/80 mmHg — all without medication.',
            ),
            callout(
              'c2m1l1-callout-1',
              'info',
              'Metabolic syndrome is not a disease of old age. Insulin resistance often begins decades before a diabetes diagnosis. Continuous glucose monitoring can reveal early dysfunction invisible to standard blood tests.',
            ),
            paragraph(
              'Improving metabolic health delivers compounding benefits: better energy throughout the day, improved cognitive clarity, reduced systemic inflammation, and a significantly lower risk of cardiovascular disease, type 2 diabetes, and certain cancers.',
            ),
          ),
        },
        {
          title: 'Insulin Sensitivity and Glucose Management',
          slug: 'insulin-sensitivity-and-glucose-management',
          order: 2,
          lessonType: 'text',
          estimatedDuration: 15,
          content: lexical(
            heading('h2', 'Insulin Sensitivity and Glucose Management'),
            paragraph(
              'Insulin is the master regulator of energy storage and utilisation. When cells become resistant to insulin\'s signal — a condition known as insulin resistance — the pancreas must produce ever-larger amounts to maintain normal blood glucose. This hyperinsulinemia drives fat storage, systemic inflammation, and accelerated aging.',
            ),
            paragraph(
              'Practical strategies for improving insulin sensitivity include resistance training (which increases GLUT4 transporter expression in muscle), walking after meals (which blunts postprandial glucose spikes by 30-50%), and reducing refined carbohydrate intake in favour of fibre-rich complex carbohydrates.',
            ),
            callout(
              'c2m1l2-callout-1',
              'tip',
              'A 15-minute walk after each main meal is one of the simplest and most effective interventions for glucose management. Studies show it reduces postprandial glucose spikes more effectively than a single 45-minute walk earlier in the day.',
            ),
            paragraph(
              'Continuous glucose monitors (CGMs) have moved from clinical tools to consumer health devices, allowing individuals to see in real time how different foods, exercise patterns, and stress levels affect their glucose. This biofeedback loop accelerates behaviour change dramatically.',
            ),
          ),
        },
        {
          title: 'The Role of Autophagy in Cellular Health',
          slug: 'role-of-autophagy-in-cellular-health',
          order: 3,
          lessonType: 'text',
          estimatedDuration: 12,
          content: lexical(
            heading('h2', 'The Role of Autophagy in Cellular Health'),
            paragraph(
              'Autophagy — from the Greek for "self-eating" — is the cellular recycling process by which damaged organelles, misfolded proteins, and intracellular pathogens are broken down and repurposed. The 2016 Nobel Prize in Physiology or Medicine was awarded to Yoshinori Ohsumi for his elucidation of autophagy mechanisms.',
            ),
            paragraph(
              'Autophagy is upregulated during periods of nutrient deprivation, exercise, and sleep. Conversely, chronic overfeeding and sedentary behaviour suppress autophagy, leading to the accumulation of cellular debris that contributes to aging and disease.',
            ),
            callout(
              'c2m1l3-callout-1',
              'info',
              'While prolonged fasting robustly activates autophagy, even a 14-16 hour overnight fast combined with exercise can meaningfully upregulate this pathway. Extreme fasting protocols are not necessary for most individuals.',
            ),
            paragraph(
              'Pharmacological activators of autophagy — including rapamycin, spermidine, and metformin — are the subject of active clinical research. However, lifestyle interventions remain the safest and most accessible way to support autophagic function on a daily basis.',
            ),
          ),
        },
      ],
    },

    // Module 2 — Supplement Science
    {
      title: 'Supplement Science',
      description: 'Evaluate the clinical evidence behind the most popular longevity supplements and learn how to build a targeted, evidence-based stack.',
      order: 2,
      lessons: [
        {
          title: 'Evidence-Based Supplementation',
          slug: 'evidence-based-supplementation',
          order: 1,
          lessonType: 'text',
          estimatedDuration: 10,
          content: lexical(
            heading('h2', 'Evidence-Based Supplementation'),
            paragraph(
              'The supplement industry generates over 150 billion USD annually, yet the vast majority of products have little to no rigorous clinical evidence supporting their marketed claims. For the discerning executive, separating signal from noise requires understanding the hierarchy of evidence: randomised controlled trials in humans outweigh animal studies, which outweigh in-vitro experiments.',
            ),
            paragraph(
              'A useful framework is to categorise supplements into three tiers: Tier 1 (strong human evidence, clear mechanism, favourable safety profile), Tier 2 (promising but incomplete evidence), and Tier 3 (theoretical or hype-driven). Vitamin D, omega-3 fatty acids, magnesium, and creatine sit firmly in Tier 1 for most populations.',
            ),
            callout(
              'c2m2l1-callout-1',
              'tip',
              'Before adding any supplement, get blood work done. Supplementing blindly is wasteful at best and harmful at worst. A serum vitamin D level, RBC magnesium, and omega-3 index will guide your first decisions.',
            ),
            paragraph(
              'Third-party testing by organisations such as NSF International, USP, or Informed Sport provides assurance that a product contains what it claims and is free of contaminants. Always choose third-party tested products.',
            ),
          ),
        },
        {
          title: 'NAD+ Precursors and Cellular Energy',
          slug: 'nad-precursors-and-cellular-energy',
          order: 2,
          lessonType: 'text',
          estimatedDuration: 12,
          content: lexical(
            heading('h2', 'NAD+ Precursors and Cellular Energy'),
            paragraph(
              'Nicotinamide adenine dinucleotide (NAD+) is a coenzyme present in every cell, essential for energy metabolism, DNA repair, and sirtuin activation. NAD+ levels decline with age — by approximately 50% between ages 40 and 60 — and this decline is implicated in many hallmarks of aging.',
            ),
            paragraph(
              'Two precursor molecules — nicotinamide riboside (NR) and nicotinamide mononucleotide (NMN) — have been shown to raise NAD+ levels in human trials. However, whether raising NAD+ levels translates into clinically meaningful improvements in healthspan remains an active area of investigation.',
            ),
            callout(
              'c2m2l2-callout-1',
              'info',
              'NAD+ supplementation is promising but not yet proven to extend human lifespan. Current evidence supports improvements in biomarkers of aging, but long-term outcome data from large-scale human trials is still pending.',
            ),
            paragraph(
              'If you choose to supplement with NR or NMN, doses of 300-1000 mg per day are typical in clinical studies. Look for products with third-party purity testing, and consider periodic blood work to track NAD+ levels via the trudiagnostic or similar platform.',
            ),
          ),
        },
        {
          title: 'Omega-3s, Vitamin D, and Magnesium',
          slug: 'omega-3s-vitamin-d-and-magnesium',
          order: 3,
          lessonType: 'text',
          estimatedDuration: 10,
          content: lexical(
            heading('h2', 'Omega-3s, Vitamin D, and Magnesium'),
            paragraph(
              'These three nutrients form the bedrock of evidence-based supplementation. Omega-3 fatty acids (EPA and DHA) reduce systemic inflammation, support cardiovascular health, and are critical for neuronal membrane integrity. An omega-3 index above 8% is associated with significantly reduced all-cause mortality.',
            ),
            paragraph(
              'Vitamin D functions as a steroid hormone influencing over 1000 genes. Deficiency (below 30 ng/mL) is associated with increased risk of infections, autoimmune disease, cardiovascular events, and certain cancers. Most adults benefit from 2000-5000 IU daily, titrated to a target serum level of 40-60 ng/mL.',
            ),
            callout(
              'c2m2l3-callout-1',
              'tip',
              'Magnesium is involved in over 300 enzymatic reactions. Most adults are subclinically deficient. Magnesium glycinate or threonate (200-400 mg elemental) taken in the evening can improve sleep quality and muscle recovery simultaneously.',
            ),
            paragraph(
              'These three supplements are inexpensive, widely available, well-tolerated, and supported by robust clinical evidence. They should be the first additions to any longevity-oriented supplement protocol before exploring more exotic compounds.',
            ),
          ),
        },
      ],
    },

    // Module 3 — Practical Meal Frameworks
    {
      title: 'Practical Meal Frameworks',
      description: 'Apply your nutrition knowledge to real-world scenarios with time-restricted eating protocols, anti-inflammatory strategies, and executive-friendly meal plans.',
      order: 3,
      lessons: [
        {
          title: 'Time-Restricted Eating Protocols',
          slug: 'time-restricted-eating-protocols',
          order: 1,
          lessonType: 'text',
          estimatedDuration: 10,
          content: lexical(
            heading('h2', 'Time-Restricted Eating Protocols'),
            paragraph(
              'Time-restricted eating (TRE) confines all caloric intake to a defined window — typically 8 to 10 hours — aligned with circadian biology. Research by Satchin Panda and others demonstrates that TRE improves insulin sensitivity, reduces hepatic fat, and enhances mitochondrial function independent of caloric reduction.',
            ),
            paragraph(
              'For most executives, an eating window of approximately 10:00 to 18:00 or 12:00 to 20:00 is practical. The key principle is front-loading calories: consuming a substantial breakfast and lunch with a lighter dinner, as glucose tolerance and thermogenesis peak in the morning and decline toward evening.',
            ),
            callout(
              'c2m3l1-callout-1',
              'tip',
              'Start with a 12-hour eating window and gradually narrow it to 10 hours over two weeks. Avoid jumping straight to aggressive 16:8 or 18:6 protocols, as this can impair sleep and increase cortisol in the adaptation phase.',
            ),
            paragraph(
              'TRE is not appropriate for everyone — pregnant or breastfeeding women, individuals with a history of eating disorders, and those on insulin or sulfonylureas should consult their physician before adopting any fasting protocol.',
            ),
          ),
        },
        {
          title: 'Anti-Inflammatory Nutrition Strategies',
          slug: 'anti-inflammatory-nutrition-strategies',
          order: 2,
          lessonType: 'video',
          estimatedDuration: 12,
          videoEmbed: {
            platform: 'youtube',
            url: 'https://www.youtube.com/watch?v=dBnniua6-oM',
            videoId: 'dBnniua6-oM',
          },
          content: lexical(
            heading('h2', 'Anti-Inflammatory Nutrition Strategies'),
            paragraph(
              'Chronic low-grade inflammation — sometimes termed "inflammaging" — is a central driver of age-related disease. Unlike acute inflammation, which is a necessary and protective immune response, chronic inflammation silently damages tissues and accelerates every hallmark of aging.',
            ),
            paragraph(
              'An anti-inflammatory dietary pattern emphasises polyphenol-rich fruits and vegetables (especially berries, leafy greens, and cruciferous vegetables), omega-3 fatty acids from wild-caught fish, extra-virgin olive oil, nuts and seeds, fermented foods, and herbs and spices such as turmeric and ginger.',
            ),
            callout(
              'c2m3l2-callout-1',
              'info',
              'The Dietary Inflammatory Index (DII) is a validated tool that scores overall dietary patterns on a pro- to anti-inflammatory scale. Aim for a negative DII score by emphasising whole plant foods and minimising refined seed oils, added sugars, and processed meats.',
            ),
            paragraph(
              'Watch the video above for a practical walkthrough of how to structure an anti-inflammatory meal plan that supports cognitive performance, recovery, and long-term metabolic health.',
            ),
          ),
        },
        {
          title: 'Executive Meal Planning and Travel Nutrition',
          slug: 'executive-meal-planning-and-travel-nutrition',
          order: 3,
          lessonType: 'text',
          estimatedDuration: 10,
          content: lexical(
            heading('h2', 'Executive Meal Planning and Travel Nutrition'),
            paragraph(
              'The biggest obstacle to optimal nutrition for executives is not knowledge — it is logistics. Frequent travel, client dinners, hotel breakfasts, and unpredictable schedules make adherence to any rigid meal plan impractical. The solution is a flexible framework built on principles rather than prescriptions.',
            ),
            paragraph(
              'The "Plate Method" provides a simple heuristic: fill half your plate with non-starchy vegetables, one quarter with high-quality protein, and one quarter with complex carbohydrates or healthy fats. This works whether you are in a Michelin-starred restaurant or an airport lounge.',
            ),
            callout(
              'c2m3l3-callout-1',
              'tip',
              'Pack a travel kit with shelf-stable essentials: whey protein sachets, electrolyte packets, magnesium glycinate capsules, and a small container of nuts. These bridge the gap when healthy options are limited.',
            ),
            paragraph(
              'When dining out, prioritise protein and vegetables, ask for dressings and sauces on the side, and limit alcohol to one or two glasses of red wine (which at least offers resveratrol and polyphenols). Perfection is not the goal — consistent good decisions are.',
            ),
          ),
        },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Course 3: Peak Performance Sleep (premium)
// ---------------------------------------------------------------------------

const peakPerformanceSleep: SeedCourse = {
  title: 'Peak Performance Sleep',
  slug: 'peak-performance-sleep',
  accessLevel: 'premium',
  pillarSlug: 'sleep',
  description: lexical(
    paragraph(
      'Peak Performance Sleep is an advanced course for individuals who want to move beyond basic sleep hygiene and master the neuroscience of restorative sleep. Designed for executives and high performers who cannot afford cognitive decline, this course covers sleep architecture, circadian biology, and cutting-edge optimisation techniques.',
    ),
    paragraph(
      'You will learn how to leverage temperature, light, wearable technology, and chronobiology to achieve consistently high-quality sleep — even when navigating time zones, high-stress periods, and demanding schedules.',
    ),
    paragraph(
      'The strategies in this course are drawn from sleep research labs, elite athletic programmes, and the clinical protocols used by leading longevity physicians worldwide.',
    ),
  ),
  modules: [
    // Module 1 — Sleep Science Deep Dive
    {
      title: 'Sleep Science Deep Dive',
      description: 'Explore the neuroscience of sleep, from the architecture of sleep stages to the circadian and homeostatic processes that govern when and how well you sleep.',
      order: 1,
      lessons: [
        {
          title: 'Sleep Architecture and Stages',
          slug: 'sleep-architecture-and-stages',
          order: 1,
          lessonType: 'text',
          estimatedDuration: 12,
          content: lexical(
            heading('h2', 'Sleep Architecture and Stages'),
            paragraph(
              'A typical night of sleep consists of four to six cycles, each lasting approximately 90 minutes. Each cycle progresses through light sleep (N1 and N2), deep sleep (N3, also called slow-wave sleep), and rapid eye movement (REM) sleep. The proportion of each stage shifts across the night: deep sleep dominates the first half, while REM sleep dominates the second half.',
            ),
            paragraph(
              'Deep sleep is critical for physical restoration, growth hormone release, immune function, and glymphatic clearance of metabolic waste. REM sleep supports memory consolidation, emotional regulation, and creative problem-solving. Both stages are essential — sacrificing either has distinct and measurable consequences.',
            ),
            callout(
              'c3m1l1-callout-1',
              'info',
              'Alcohol, even in moderate amounts, dramatically suppresses REM sleep. A nightcap may help you fall asleep faster, but it fragments sleep architecture and impairs the cognitive benefits of a full night\'s rest.',
            ),
            paragraph(
              'Understanding your personal sleep architecture — which wearables can approximate — allows you to identify whether you are getting adequate deep and REM sleep, and to tailor interventions accordingly.',
            ),
          ),
        },
        {
          title: 'Circadian Biology and Light Exposure',
          slug: 'circadian-biology-and-light-exposure',
          order: 2,
          lessonType: 'text',
          estimatedDuration: 15,
          content: lexical(
            heading('h2', 'Circadian Biology and Light Exposure'),
            paragraph(
              'The circadian system is a network of biological clocks — headed by the suprachiasmatic nucleus (SCN) in the hypothalamus — that synchronises physiological processes to the 24-hour light-dark cycle. Disruption of circadian rhythm is associated with metabolic disease, mood disorders, immune dysfunction, and accelerated aging.',
            ),
            paragraph(
              'Light is the most powerful zeitgeber (time-giver) for the circadian clock. Morning sunlight exposure within the first 60 minutes of waking anchors the clock, suppresses melatonin, and initiates a cortisol awakening response that sets the stage for alertness and energy throughout the day.',
            ),
            callout(
              'c3m1l2-callout-1',
              'tip',
              'Aim for 10-30 minutes of outdoor light exposure within one hour of waking. On overcast days, outdoor light (approximately 10,000 lux) is still 10-50 times brighter than typical indoor lighting and sufficient to set your circadian clock.',
            ),
            paragraph(
              'In the evening, minimise exposure to blue and green wavelengths (400-550 nm) from screens and overhead lighting. Blue-light-blocking glasses, warm-toned bulbs, and screen dimming software (such as f.lux or Night Shift) can help, but the most effective strategy is simply reducing overall light intensity after sunset.',
            ),
          ),
        },
        {
          title: 'The Glymphatic System and Brain Health',
          slug: 'glymphatic-system-and-brain-health',
          order: 3,
          lessonType: 'text',
          estimatedDuration: 10,
          content: lexical(
            heading('h2', 'The Glymphatic System and Brain Health'),
            paragraph(
              'The glymphatic system, discovered in 2012 by Maiken Nedergaard\'s lab, is a brain-wide waste clearance pathway that is most active during deep sleep. Cerebrospinal fluid flows along perivascular channels, flushing out metabolic byproducts — including amyloid-beta and tau proteins, the hallmarks of Alzheimer\'s disease.',
            ),
            paragraph(
              'Glymphatic function is enhanced by lateral (side) sleeping positions, adequate hydration, and — critically — sufficient deep sleep. Conversely, sleep deprivation, chronic alcohol consumption, and traumatic brain injury all impair glymphatic clearance, leading to the accumulation of neurotoxic waste.',
            ),
            callout(
              'c3m1l3-callout-1',
              'info',
              'Sleeping on your side may improve glymphatic clearance by 25% compared to sleeping on your back or stomach. If you naturally sleep on your back, a body pillow can help encourage lateral positioning.',
            ),
            paragraph(
              'This research underscores why sleep is not optional for cognitive longevity. Every night of poor sleep results in incomplete waste clearance that compounds over time. Prioritising deep sleep is one of the most impactful things you can do to protect long-term brain health.',
            ),
          ),
        },
      ],
    },

    // Module 2 — Advanced Sleep Optimization
    {
      title: 'Advanced Sleep Optimization',
      description: 'Master advanced techniques including temperature manipulation, wearable-guided sleep tracking, and protocols for jet lag and shift work.',
      order: 2,
      lessons: [
        {
          title: 'Temperature Manipulation for Better Sleep',
          slug: 'temperature-manipulation-for-better-sleep',
          order: 1,
          lessonType: 'text',
          estimatedDuration: 10,
          content: lexical(
            heading('h2', 'Temperature Manipulation for Better Sleep'),
            paragraph(
              'Core body temperature follows a circadian rhythm, peaking in the late afternoon and reaching its nadir approximately two hours after sleep onset. The decline in core temperature is a key physiological trigger for sleep initiation — the body must cool down to fall asleep and stay asleep.',
            ),
            paragraph(
              'Practical temperature interventions include keeping the bedroom at 18-19 degrees Celsius, using breathable bedding materials (such as linen or bamboo), and taking a warm bath or shower 60-90 minutes before bed. The warm water paradoxically promotes cooling by dilating peripheral blood vessels, accelerating heat loss from the core.',
            ),
            callout(
              'c3m2l1-callout-1',
              'tip',
              'Cooling mattress pads and pillow inserts (such as the Eight Sleep Pod or ChiliPad) allow precise temperature control throughout the night. If you tend to wake up hot in the middle of the night, these devices can be transformative.',
            ),
            paragraph(
              'Morning cold exposure — such as a cold shower or cold plunge — can further reinforce circadian temperature rhythms by creating a sharp cortisol and norepinephrine spike that enhances alertness and sets a clear temperature contrast between day and night.',
            ),
          ),
        },
        {
          title: 'Tracking Sleep with Wearables',
          slug: 'tracking-sleep-with-wearables',
          order: 2,
          lessonType: 'video',
          estimatedDuration: 12,
          videoEmbed: {
            platform: 'youtube',
            url: 'https://www.youtube.com/watch?v=nm1TxQj9IsQ',
            videoId: 'nm1TxQj9IsQ',
          },
          content: lexical(
            heading('h2', 'Tracking Sleep with Wearables'),
            paragraph(
              'Consumer sleep trackers have improved dramatically in recent years, offering increasingly accurate estimates of sleep stages, heart rate variability, respiratory rate, and blood oxygen saturation. The Oura Ring, WHOOP strap, and Apple Watch are among the most validated consumer devices for sleep tracking.',
            ),
            paragraph(
              'The real value of sleep tracking lies not in any single night\'s data but in longitudinal trends. A consistent decline in deep sleep percentage, a rising resting heart rate, or a drop in HRV can signal overtraining, illness, or the impact of a lifestyle change — often before you notice symptoms subjectively.',
            ),
            callout(
              'c3m2l2-callout-1',
              'info',
              'No consumer wearable matches the accuracy of a clinical polysomnography study. Use wearable data for trend analysis and relative comparisons, not absolute stage-duration measurements.',
            ),
            paragraph(
              'Watch the video above for a detailed comparison of current sleep-tracking wearables, including their strengths, limitations, and practical tips for getting the most useful data from each device.',
            ),
          ),
        },
        {
          title: 'Jet Lag Protocols and Shift Work Strategies',
          slug: 'jet-lag-protocols-and-shift-work-strategies',
          order: 3,
          lessonType: 'text',
          estimatedDuration: 12,
          content: lexical(
            heading('h2', 'Jet Lag Protocols and Shift Work Strategies'),
            paragraph(
              'Jet lag results from a mismatch between the internal circadian clock and the external light-dark cycle at the destination. The circadian clock shifts by approximately one to 1.5 hours per day, meaning that a six-hour time zone change requires four to six days of natural adaptation.',
            ),
            paragraph(
              'Strategic light exposure is the most effective tool for accelerating circadian re-entrainment. When travelling east, seek bright light in the morning at your destination and avoid evening light. When travelling west, do the opposite — seek evening light and avoid early morning light. Melatonin (0.5-3 mg) taken at the target bedtime can further accelerate the shift.',
            ),
            callout(
              'c3m2l3-callout-1',
              'tip',
              'Begin shifting your sleep schedule by 30-60 minutes per day for three to four days before a major trip. Combined with timed light exposure and low-dose melatonin, this "pre-adaptation" protocol can eliminate jet lag almost entirely for trips of up to six time zones.',
            ),
            paragraph(
              'For shift workers, maintaining a consistent sleep-wake schedule — even on days off — is the single most important strategy. If rotating shifts are unavoidable, forward rotation (day to evening to night) is less disruptive than backward rotation, and blackout curtains combined with blue-light-blocking glasses during the commute home can facilitate daytime sleep.',
            ),
          ),
        },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const SEED_COURSES: SeedCourse[] = [
  foundationsOfLongevity,
  executiveNutritionMasterclass,
  peakPerformanceSleep,
]
