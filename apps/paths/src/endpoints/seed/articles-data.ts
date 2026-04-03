/**
 * Seed data for 12 sample longevity articles across all content pillars.
 * Used by the seed endpoint to populate the PATHS platform with realistic content.
 */

type AccessLevel = 'free' | 'regular' | 'premium'

interface SeedArticle {
  title: string
  slug: string
  excerpt: string
  accessLevel: AccessLevel
  pillarSlug: string
  content: Record<string, unknown>
}

// Helper to create a text node
const text = (t: string) => ({ type: 'text', text: t })

// Helper to create a bold text node
const bold = (t: string) => ({ type: 'text', text: t, format: 1 })

// Helper to create a heading
const h2 = (title: string) => ({
  type: 'heading',
  tag: 'h2',
  children: [text(title)],
})

// Helper to create a paragraph
const p = (...children: ReturnType<typeof text>[]) => ({
  type: 'paragraph',
  children,
})

// Helper to create a callout block
const callout = (
  id: string,
  calloutType: 'tip' | 'warning' | 'info' | 'quote',
  content: string,
) => ({
  type: 'block',
  fields: {
    id,
    blockType: 'callout',
    type: calloutType,
    content: {
      root: {
        type: 'root',
        children: [{ type: 'paragraph', children: [text(content)] }],
        direction: null,
        format: '',
        indent: 0,
        version: 1,
      },
    },
  },
  version: 2,
})

// Helper to create a quiz block
const quiz = (
  id: string,
  question: string,
  options: string[],
  correctAnswer: number,
  explanation: string,
) => ({
  type: 'block',
  fields: {
    id,
    blockType: 'quizQuestion',
    question,
    options: options.map((t, i) => ({ id: `${id}-opt${i + 1}`, text: t })),
    correctAnswer,
    explanation,
  },
  version: 2,
})

// Helper to wrap children in a Lexical root
const lexicalRoot = (children: unknown[]) => ({
  root: {
    type: 'root',
    children,
    direction: null,
    format: '',
    indent: 0,
    version: 1,
  },
})

export const SEED_ARTICLES: SeedArticle[] = [
  // ──────────────────────────────────────────────
  // 1. Nutrition — Free
  // ──────────────────────────────────────────────
  {
    title: "The Executive's Guide to Metabolic Health",
    slug: 'the-executives-guide-to-metabolic-health',
    excerpt:
      'Metabolic health is the foundation of sustained performance. Learn how insulin sensitivity, glucose regulation, and lipid metabolism directly impact your cognitive output and energy levels.',
    accessLevel: 'free',
    pillarSlug: 'nutrition',
    content: lexicalRoot([
      h2('Why Metabolic Health Matters for Performance'),
      p(
        text(
          'Metabolic health encompasses five key markers: blood glucose, triglycerides, HDL cholesterol, blood pressure, and waist circumference. Research published in ',
        ),
        bold('Metabolic Syndrome and Related Disorders'),
        text(
          ' estimates that only 12% of American adults are metabolically healthy by all five criteria. For executives operating under chronic stress, these numbers are often worse.',
        ),
      ),
      p(
        text(
          'Insulin resistance — the hallmark of poor metabolic health — directly impairs prefrontal cortex function. Studies using continuous glucose monitors (CGMs) have demonstrated that postprandial glucose spikes above 140 mg/dL correlate with measurable declines in working memory and decision-making capacity within 30 minutes.',
        ),
      ),
      callout(
        'art1-callout-1',
        'tip',
        'Consider wearing a continuous glucose monitor for two weeks to identify which meals cause energy crashes. Many executives discover that their "healthy" lunch is actually spiking glucose above 160 mg/dL.',
      ),
      h2('The Three Pillars of Metabolic Optimization'),
      p(
        text(
          'First, address meal timing and composition. Time-restricted eating within an 8-10 hour window has been shown to improve insulin sensitivity by 20-30% in controlled trials. Second, prioritize protein at every meal — a minimum of 30g triggers adequate muscle protein synthesis and blunts the glucose response to carbohydrates.',
        ),
      ),
      p(
        text(
          'Third, manage your glycemic variability. The goal is not to eliminate carbohydrates but to minimize glucose excursions. Pairing carbohydrates with fiber, fat, and protein — and consuming them in that order — can reduce postprandial glucose spikes by up to 40%. This strategy, sometimes called "food sequencing," is one of the simplest interventions available.',
        ),
      ),
      callout(
        'art1-callout-2',
        'info',
        'Key biomarkers to track: fasting insulin (ideal <5 μIU/mL), HbA1c (ideal <5.2%), fasting triglycerides (ideal <100 mg/dL), and triglyceride-to-HDL ratio (ideal <1.5).',
      ),
      h2('Building Sustainable Habits'),
      p(
        text(
          'Metabolic health is not achieved through extreme dietary interventions but through consistent daily practices. Focus on walking after meals (even 10 minutes reduces glucose spikes by 20%), maintaining muscle mass through resistance training, and prioritizing sleep — a single night of poor sleep can reduce insulin sensitivity by up to 33%.',
        ),
      ),
    ]),
  },

  // ──────────────────────────────────────────────
  // 2. Nutrition — Regular + Quiz
  // ──────────────────────────────────────────────
  {
    title: 'Optimizing Micronutrient Intake After 40',
    slug: 'optimizing-micronutrient-intake-after-40',
    excerpt:
      'Age-related changes in absorption and metabolism mean your micronutrient needs shift significantly after 40. Discover which deficiencies are most common and how to address them strategically.',
    accessLevel: 'regular',
    pillarSlug: 'nutrition',
    content: lexicalRoot([
      h2('The Micronutrient Gap After 40'),
      p(
        text(
          'Aging alters nutrient absorption in several well-documented ways. Gastric acid production declines by approximately 1% per year after age 30, impairing absorption of vitamin B12, iron, calcium, and magnesium. Simultaneously, the skin produces 50% less vitamin D from sunlight exposure by age 70 compared to age 20, and kidney conversion of 25-hydroxyvitamin D to its active form decreases steadily.',
        ),
      ),
      p(
        text(
          'A comprehensive analysis of NHANES data reveals that adults over 40 are most commonly deficient in vitamin D (42%), magnesium (48%), vitamin B12 (15-20%), omega-3 fatty acids, and vitamin K2. These deficiencies are not merely academic — they directly impact mitochondrial function, DNA repair, immune surveillance, and neurotransmitter synthesis.',
        ),
      ),
      callout(
        'art2-callout-1',
        'warning',
        'Standard reference ranges for blood tests define "normal" as the middle 95% of the population — which includes many unhealthy individuals. Optimal ranges are typically much narrower. For example, the standard vitamin D reference range is 30-100 ng/mL, but evidence suggests 50-80 ng/mL is optimal for longevity outcomes.',
      ),
      h2('Priority Micronutrients and Dosing Strategies'),
      p(
        text(
          'Magnesium deserves special attention. It is a cofactor in over 300 enzymatic reactions, including ATP synthesis, DNA repair, and glutathione production. Magnesium L-threonate crosses the blood-brain barrier more effectively and has shown cognitive benefits in clinical trials. A typical protocol combines 200mg magnesium L-threonate (morning) with 400mg magnesium glycinate (evening for sleep support).',
        ),
      ),
      p(
        text(
          'Vitamin K2 (MK-7 form) works synergistically with vitamin D3 to direct calcium into bones rather than arteries. The Rotterdam Heart Study found that high K2 intake reduced coronary artery calcification by 52% over 10 years. Most adults require 200-300mcg MK-7 daily, taken with a fat-containing meal for absorption.',
        ),
      ),
      callout(
        'art2-callout-2',
        'tip',
        'Test before you supplement. A comprehensive micronutrient panel (including RBC magnesium, not just serum magnesium) provides a baseline. Serum magnesium is a poor marker because only 1% of body magnesium resides in blood.',
      ),
      h2('Testing Your Knowledge'),
      quiz(
        'art2-quiz-1',
        'Why is serum magnesium considered a poor marker for magnesium status?',
        [
          'It fluctuates too much throughout the day',
          'Only 1% of total body magnesium is found in the blood',
          'Lab equipment cannot measure it accurately',
          'Magnesium is only stored in bones',
        ],
        1,
        'Only about 1% of total body magnesium resides in the bloodstream. The majority is stored in bones and soft tissues. RBC (red blood cell) magnesium is a more accurate reflection of intracellular magnesium status.',
      ),
      quiz(
        'art2-quiz-2',
        'Which form of vitamin K2 has the longest half-life and is most commonly recommended for supplementation?',
        ['MK-4', 'MK-7', 'K1 (phylloquinone)', 'MK-9'],
        1,
        'MK-7 has a half-life of approximately 72 hours (compared to just 1-2 hours for MK-4), meaning it maintains more consistent blood levels with once-daily dosing. It is the most studied form for cardiovascular and bone health outcomes.',
      ),
    ]),
  },

  // ──────────────────────────────────────────────
  // 3. Movement — Free
  // ──────────────────────────────────────────────
  {
    title: 'Strength Training Protocols for Longevity',
    slug: 'strength-training-protocols-for-longevity',
    excerpt:
      'Muscle mass is the single strongest predictor of all-cause mortality in older adults. Learn the evidence-based training protocols that maximize healthspan outcomes.',
    accessLevel: 'free',
    pillarSlug: 'movement',
    content: lexicalRoot([
      h2('Muscle as a Longevity Organ'),
      p(
        text(
          'Skeletal muscle is not merely a locomotor tissue — it is the largest endocrine organ in the body, secreting over 600 identified myokines that regulate metabolism, immune function, and brain health. Research from the ',
        ),
        bold('British Medical Journal'),
        text(
          ' demonstrates that grip strength is a stronger predictor of cardiovascular mortality than systolic blood pressure. After age 30, untrained adults lose 3-8% of muscle mass per decade, a process called sarcopenia that accelerates dramatically after 60.',
        ),
      ),
      p(
        text(
          'The implications are profound: maintaining or building muscle mass is arguably the single most impactful intervention for extending healthspan. Every 1kg increase in appendicular lean mass is associated with a 3-5% reduction in all-cause mortality in adults over 65.',
        ),
      ),
      callout(
        'art3-callout-1',
        'info',
        'Key concept: Your "muscle reserve" at age 40-50 determines your functional capacity at 80. Think of strength training as deposits into a longevity savings account — the earlier you start, the more you accumulate before age-related withdrawals begin.',
      ),
      h2('The Longevity Training Framework'),
      p(
        text(
          'An optimal longevity-focused training program includes three sessions per week of resistance training, each lasting 45-60 minutes. The program should prioritize compound movements that train functional patterns: squats, deadlifts, pressing, pulling, and loaded carries. Research suggests that training across a spectrum of rep ranges (5-8 for strength, 8-12 for hypertrophy, 12-20 for muscular endurance) provides the most comprehensive adaptation.',
        ),
      ),
      p(
        text(
          'Progressive overload remains the fundamental driver of adaptation, but for longevity purposes, the focus should be on maintaining a high relative strength-to-bodyweight ratio rather than maximizing absolute load. A practical benchmark: maintaining the ability to stand from a seated position on the floor without using your hands (the sitting-rising test) is associated with a 5-6x reduction in all-cause mortality.',
        ),
      ),
      callout(
        'art3-callout-2',
        'tip',
        'Prioritize eccentric (lowering) phases — 3-4 seconds on the eccentric builds more tendon resilience and triggers greater hypertrophy than fast repetitions at the same load. This is especially important after 40 when tendon recovery slows.',
      ),
      h2('Recovery and Adaptation'),
      p(
        text(
          'Recovery capacity diminishes with age, making intelligent programming essential. Allow 48-72 hours between training the same muscle group. Monitor heart rate variability (HRV) as an objective readiness marker — an HRV drop of more than 15% below your baseline suggests incomplete recovery. Protein intake of 1.6-2.2g per kg bodyweight, distributed across 4 meals, supports optimal muscle protein synthesis.',
        ),
      ),
    ]),
  },

  // ──────────────────────────────────────────────
  // 4. Movement — Regular
  // ──────────────────────────────────────────────
  {
    title: 'Zone 2 Cardio: The Science of Aerobic Base Building',
    slug: 'zone-2-cardio-the-science-of-aerobic-base-building',
    excerpt:
      'Zone 2 training improves mitochondrial density, fat oxidation, and metabolic flexibility. Understand why this low-intensity approach is the cornerstone of cardiovascular longevity.',
    accessLevel: 'regular',
    pillarSlug: 'movement',
    content: lexicalRoot([
      h2('Understanding Zone 2 and Mitochondrial Health'),
      p(
        text(
          'Zone 2 cardio is defined as the highest intensity at which lactate remains below 2 mmol/L — approximately 60-70% of maximum heart rate, or the intensity at which you can maintain a conversation but with some effort. At this intensity, the body preferentially oxidizes fat through beta-oxidation, a process that occurs exclusively within mitochondria.',
        ),
      ),
      p(
        text(
          'Dr. Iñigo San-Millán, a leading researcher in metabolic physiology and advisor to professional cycling teams, has demonstrated that Zone 2 training is the primary driver of mitochondrial biogenesis and improved fat oxidation capacity. His research shows that elite endurance athletes spend 75-80% of their training time in Zone 2, a principle that translates directly to longevity-focused exercise programming.',
        ),
      ),
      callout(
        'art4-callout-1',
        'info',
        'VO2max — your maximum rate of oxygen consumption — declines approximately 10% per decade after age 30 in untrained individuals. However, consistent Zone 2 training can slow this decline to 5% per decade. Since a VO2max below 18 mL/kg/min is associated with inability to perform activities of daily living, maintaining VO2max is one of the most impactful longevity interventions.',
      ),
      h2('Practical Zone 2 Programming'),
      p(
        text(
          'Aim for 150-200 minutes of Zone 2 cardio per week, distributed across 3-4 sessions. Walking, cycling, rowing, and swimming are all effective modalities. The key is maintaining a consistent effort within the Zone 2 heart rate range — most people train too hard, drifting into Zone 3 where the metabolic stimulus shifts away from pure fat oxidation.',
        ),
      ),
      p(
        text(
          'A practical proxy for Zone 2: the "nose breathing test." If you can sustain nasal-only breathing during your cardio session, you are likely in or near Zone 2. Once you need to open your mouth to breathe, you have exceeded the threshold. A heart rate monitor provides more precision — calculate your Zone 2 range as 180 minus your age (Maffetone method) plus or minus 5 beats.',
        ),
      ),
      callout(
        'art4-callout-2',
        'tip',
        'Track your "cardiac drift" — the tendency for heart rate to rise at constant power output during a session. Less drift over weeks indicates improving aerobic fitness. If your heart rate stays within 5 BPM for 45 minutes at the same wattage, your aerobic base is solid.',
      ),
      h2('Metabolic Flexibility: The Ultimate Goal'),
      p(
        text(
          'The downstream benefit of consistent Zone 2 training is metabolic flexibility — the ability to seamlessly switch between burning fat and carbohydrates based on demand. Metabolically inflexible individuals rely disproportionately on glucose even at rest, contributing to insulin resistance, reactive hypoglycemia, and the afternoon energy crashes that plague many executives. Zone 2 training is the most effective way to rebuild this flexibility.',
        ),
      ),
    ]),
  },

  // ──────────────────────────────────────────────
  // 5. Sleep — Free
  // ──────────────────────────────────────────────
  {
    title: 'Circadian Rhythm Optimization for Frequent Travelers',
    slug: 'circadian-rhythm-optimization-for-frequent-travelers',
    excerpt:
      'Jet lag is not just an inconvenience — chronic circadian disruption accelerates aging. Master the science of light exposure, meal timing, and strategic supplementation for rapid adaptation.',
    accessLevel: 'free',
    pillarSlug: 'sleep',
    content: lexicalRoot([
      h2('The Biology of Jet Lag and Circadian Disruption'),
      p(
        text(
          'Your circadian rhythm is orchestrated by the suprachiasmatic nucleus (SCN) in the hypothalamus, which synchronizes approximately 20,000 individual clock cells based on light input from specialized retinal ganglion cells. When you cross time zones, the SCN requires roughly one day per hour of time zone shift to fully resynchronize — meaning a New York to London flight creates a 5-day adjustment period.',
        ),
      ),
      p(
        text(
          'Chronic circadian disruption — common in frequent business travelers — has consequences far beyond fatigue. A landmark study of flight attendants found that those with less than 5 years of recovery between long-haul rotations showed measurable temporal lobe atrophy and elevated cortisol levels. Shift workers have a 40% increased risk of cardiovascular disease and a 15% increased cancer risk, driven by circadian misalignment.',
        ),
      ),
      callout(
        'art5-callout-1',
        'warning',
        'Melatonin timing matters more than dose. Taking melatonin at the wrong time can shift your circadian clock in the wrong direction. For eastward travel: take 0.5mg melatonin at the destination bedtime starting 2 days before departure. For westward travel: take melatonin upon waking at your destination for 2-3 days.',
      ),
      h2('The Light-Dark Protocol'),
      p(
        text(
          'Light is the most powerful zeitgeber (time-giver) for circadian resynchronization. Upon arrival at your destination, seek bright outdoor light (10,000+ lux) during the morning hours of the local time zone. This suppresses melatonin and advances your clock. Conversely, wear blue-light-blocking glasses in the evening and keep your environment dim after sunset.',
        ),
      ),
      p(
        text(
          'A practical protocol for eastward travel across 5+ time zones: on arrival morning, spend 30-60 minutes outdoors without sunglasses. Avoid bright light in the first 2 hours after your biological midnight (which initially remains at your departure time zone). Use the Timeshifter or equivalent app to calculate personalized light exposure windows.',
        ),
      ),
      callout(
        'art5-callout-2',
        'tip',
        'Meal timing is a secondary circadian entrainer. Eating exclusively during daylight hours at your destination accelerates adaptation. Fasting during the flight and eating breakfast at the local morning time can reduce adjustment time by 30-50%.',
      ),
      h2('Strategic Supplementation for Travel'),
      p(
        text(
          'Beyond melatonin, several supplements support circadian adaptation. Magnesium glycinate (400mg) at destination bedtime promotes GABA activity and sleep onset. L-theanine (200mg) reduces travel-related cortisol elevation without sedation. For very long flights, short-acting adaptogenic herbs like ashwagandha can modulate the HPA axis stress response that jet lag triggers.',
        ),
      ),
    ]),
  },

  // ──────────────────────────────────────────────
  // 6. Sleep — Premium + Quiz
  // ──────────────────────────────────────────────
  {
    title: 'Advanced Sleep Architecture and Recovery Metrics',
    slug: 'advanced-sleep-architecture-and-recovery-metrics',
    excerpt:
      'Deep sleep and REM sleep serve distinct biological functions critical for longevity. Learn to interpret your sleep data and optimize each stage for maximum recovery and cognitive performance.',
    accessLevel: 'premium',
    pillarSlug: 'sleep',
    content: lexicalRoot([
      h2('The Four Stages of Sleep and Their Longevity Implications'),
      p(
        text(
          'Sleep architecture consists of four distinct stages cycling in approximately 90-minute ultradian rhythms. N1 (light sleep) and N2 (intermediate sleep) account for 50-60% of total sleep time. N3 (slow-wave/deep sleep) and REM sleep each comprise 20-25% in healthy young adults. Each stage serves non-overlapping biological functions that are irreplaceable by other stages.',
        ),
      ),
      p(
        text(
          'N3 deep sleep is the primary window for growth hormone secretion (70-80% of daily GH output occurs in the first deep sleep cycle), glymphatic clearance of amyloid-beta and tau proteins from the brain, and immune system consolidation via increased natural killer cell activity. REM sleep is essential for emotional regulation, procedural memory consolidation, and creative problem-solving.',
        ),
      ),
      callout(
        'art6-callout-1',
        'info',
        'The glymphatic system — the brain\'s waste-clearance pathway — is 60% more active during deep sleep than during wakefulness. Reduced deep sleep is associated with accelerated accumulation of amyloid-beta, a hallmark of Alzheimer\'s disease. This is one of the strongest links between poor sleep and neurodegeneration.',
      ),
      h2('Interpreting Wearable Sleep Data'),
      p(
        text(
          'Modern wearables (WHOOP, Oura Ring, Apple Watch) estimate sleep stages using a combination of accelerometry and photoplethysmography (PPG) heart rate data. While not as accurate as polysomnography (the gold standard), recent validation studies show that the Oura Ring Gen 3 achieves 79% agreement with PSG for sleep staging. Key metrics to track weekly include: total sleep time (target 7-9 hours), deep sleep percentage (target 15-20%), REM percentage (target 20-25%), and sleep efficiency (target >85%).',
        ),
      ),
      p(
        text(
          'Heart rate variability during sleep provides additional insight. The RMSSD metric (root mean square of successive R-R interval differences) should trend upward during the first half of the night and peak during your deepest sleep cycles. A suppressed nocturnal HRV pattern suggests incomplete parasympathetic activation, often caused by late alcohol consumption, heavy evening meals, or elevated stress hormones.',
        ),
      ),
      callout(
        'art6-callout-2',
        'tip',
        'Alcohol is the most common deep sleep disruptor. Even moderate consumption (2 drinks) reduces deep sleep by 24% and fragments REM architecture. If you must drink, finish at least 3 hours before bed and limit to 1 standard drink.',
      ),
      h2('Optimizing Deep Sleep'),
      p(
        text(
          'Evidence-based strategies for increasing deep sleep include: maintaining a cool sleeping environment (65-68°F / 18-20°C), engaging in resistance training earlier in the day (which increases adenosine-mediated sleep pressure), avoiding caffeine after noon (caffeine\'s half-life is 5-6 hours, but its quarter-life extends to 12 hours), and using evening relaxation protocols such as yoga nidra or non-sleep deep rest (NSDR) to activate the parasympathetic nervous system before bed.',
        ),
      ),
      quiz(
        'art6-quiz-1',
        'During which sleep stage does the majority of daily growth hormone secretion occur?',
        [
          'N1 (light sleep)',
          'N2 (intermediate sleep)',
          'N3 (slow-wave deep sleep)',
          'REM sleep',
        ],
        2,
        'Approximately 70-80% of daily growth hormone output occurs during N3 slow-wave deep sleep, primarily in the first sleep cycle of the night. This is why the first 90 minutes of sleep are disproportionately important for physical recovery.',
      ),
      quiz(
        'art6-quiz-2',
        'What percentage of deep sleep reduction has been observed with moderate evening alcohol consumption (2 drinks)?',
        ['10%', '24%', '40%', '55%'],
        1,
        'Studies show that moderate alcohol consumption (2 standard drinks) reduces deep sleep by approximately 24%. Alcohol initially acts as a sedative (making people feel they sleep "better") but fragments sleep architecture in the second half of the night, particularly disrupting REM sleep.',
      ),
    ]),
  },

  // ──────────────────────────────────────────────
  // 7. Mental Health — Free
  // ──────────────────────────────────────────────
  {
    title: 'Stress Resilience Frameworks for High-Performers',
    slug: 'stress-resilience-frameworks-for-high-performers',
    excerpt:
      'Chronic stress accelerates biological aging by shortening telomeres and elevating inflammatory markers. Build a science-backed resilience protocol that protects your healthspan under pressure.',
    accessLevel: 'free',
    pillarSlug: 'mental-health',
    content: lexicalRoot([
      h2('The Biology of Chronic Stress and Accelerated Aging'),
      p(
        text(
          'The hypothalamic-pituitary-adrenal (HPA) axis evolved to manage acute threats — the classic "fight or flight" response mediated by cortisol and catecholamines. In modern executive environments, this system is chronically activated by psychological stressors: high-stakes decisions, constant connectivity, and relentless schedules. The result is a state of allostatic overload that measurably accelerates biological aging.',
        ),
      ),
      p(
        text(
          'Nobel Prize-winning research by Elizabeth Blackburn demonstrated that chronic psychological stress shortens telomeres — the protective caps on chromosomes — equivalent to an additional decade of biological aging in highly stressed caregivers compared to controls. Subsequent research has shown that elevated cortisol suppresses telomerase activity, impairs hippocampal neurogenesis, increases visceral adiposity, and promotes systemic inflammation via NF-κB activation.',
        ),
      ),
      callout(
        'art7-callout-1',
        'info',
        'The cortisol awakening response (CAR) — the natural spike in cortisol 30-45 minutes after waking — is a reliable biomarker of HPA axis function. A blunted CAR is associated with burnout and chronic fatigue. Track your morning cortisol if you suspect HPA dysregulation.',
      ),
      h2('Building a Resilience Protocol'),
      p(
        text(
          'Resilience is not a personality trait — it is a set of trainable physiological and psychological capacities. The most evidence-based interventions include: deliberate cold exposure (2 minutes at 50-59°F / 10-15°C) which activates the sympathetic nervous system in a controlled manner and builds stress tolerance; box breathing (4-4-4-4 pattern) which stimulates the vagus nerve and shifts autonomic balance toward parasympathetic dominance within 90 seconds; and cognitive reappraisal — the practice of consciously reframing stressors as challenges rather than threats.',
        ),
      ),
      p(
        text(
          'Heart rate variability (HRV) biofeedback provides an objective metric for tracking resilience over time. Higher resting HRV is consistently associated with greater emotional regulation capacity, faster recovery from stressors, and reduced all-cause mortality. Aim for an RMSSD above your age-adjusted median and track the 7-day trend rather than daily fluctuations.',
        ),
      ),
      callout(
        'art7-callout-2',
        'tip',
        'The "physiological sigh" — a double inhale through the nose followed by an extended exhale through the mouth — is the fastest known method for real-time stress reduction. Stanford research shows it reduces cortisol and subjective stress within one breath cycle.',
      ),
      h2('Integrating Resilience Into Executive Schedules'),
      p(
        text(
          'Effective stress management does not require hours of meditation. A minimum effective dose approach includes: 5 minutes of morning breathwork (establishes parasympathetic tone for the day), two 2-minute cold exposure sessions per week (builds hormetic stress tolerance), and 10 minutes of evening journaling focused on cognitive reappraisal. These practices compound over weeks, resulting in measurably lower resting cortisol and higher HRV within 30 days.',
        ),
      ),
    ]),
  },

  // ──────────────────────────────────────────────
  // 8. Mental Health — Regular
  // ──────────────────────────────────────────────
  {
    title: 'Cognitive Reserve: Protecting Brain Health Long-Term',
    slug: 'cognitive-reserve-protecting-brain-health-long-term',
    excerpt:
      'Cognitive reserve determines how well your brain withstands age-related decline and pathology. Learn the modifiable factors that build neural resilience across the lifespan.',
    accessLevel: 'regular',
    pillarSlug: 'mental-health',
    content: lexicalRoot([
      h2('What Is Cognitive Reserve?'),
      p(
        text(
          'Cognitive reserve is the brain\'s ability to improvise and find alternate ways of completing tasks when standard neural pathways are compromised. First described by Yaakov Stern at Columbia University, the concept emerged from autopsy studies showing that some individuals with significant Alzheimer\'s pathology in their brains had shown no clinical symptoms during their lifetime. Their brains had enough "reserve" to compensate for the damage.',
        ),
      ),
      p(
        text(
          'Cognitive reserve is built through three primary mechanisms: neural reserve (the efficiency of existing brain networks), neural compensation (the ability to recruit alternative networks), and brain maintenance (the ongoing biological processes that preserve neural structure). Unlike cognitive ability, which is partly genetic, reserve is heavily influenced by modifiable lifestyle factors across the entire lifespan.',
        ),
      ),
      callout(
        'art8-callout-1',
        'info',
        'The concept of "use it or lose it" is scientifically validated: neuroimaging studies show that cognitively stimulating activities increase cortical thickness, white matter integrity, and functional connectivity. Bilingualism alone delays dementia onset by an average of 4.5 years.',
      ),
      h2('Building Reserve Through Lifestyle'),
      p(
        text(
          'Physical exercise is the strongest modifiable factor for cognitive reserve. Aerobic exercise increases brain-derived neurotrophic factor (BDNF) — often called "Miracle-Gro for the brain" — which promotes hippocampal neurogenesis and synaptic plasticity. A landmark study in ',
        ),
        bold('PNAS'),
        text(
          ' showed that one year of moderate aerobic exercise increased hippocampal volume by 2%, effectively reversing 1-2 years of age-related shrinkage.',
        ),
      ),
      p(
        text(
          'Cognitive engagement — novel learning, complex problem-solving, social interaction — builds reserve through different pathways than exercise. The key is novelty: activities that are challenging but achievable force the brain to form new connections. Learning a musical instrument, studying a new language, or mastering a complex skill like chess all qualify. Passive consumption (watching television, scrolling social media) does not.',
        ),
      ),
      callout(
        'art8-callout-2',
        'tip',
        'Social connection is an underappreciated cognitive reserve builder. The Rush Memory and Aging Project found that individuals with the highest social engagement had a 70% reduced risk of cognitive decline compared to the most socially isolated. Prioritize meaningful in-person interactions.',
      ),
      h2('Threats to Cognitive Reserve'),
      p(
        text(
          'Several common executive lifestyle patterns actively deplete cognitive reserve: chronic sleep deprivation (reduces glymphatic clearance and BDNF), chronic stress (elevated cortisol is directly neurotoxic to hippocampal neurons), metabolic syndrome (insulin resistance impairs cerebral glucose metabolism), and social isolation (often an unintended consequence of demanding schedules). Addressing these factors is not merely preventive — it actively builds the neural infrastructure that protects against future decline.',
        ),
      ),
    ]),
  },

  // ──────────────────────────────────────────────
  // 9. Diagnostics — Free + Quiz
  // ──────────────────────────────────────────────
  {
    title: 'Essential Biomarkers Every Executive Should Track',
    slug: 'essential-biomarkers-every-executive-should-track',
    excerpt:
      'Standard annual physicals miss 80% of actionable health data. Discover the comprehensive biomarker panel that provides early warning of metabolic, cardiovascular, and hormonal imbalances.',
    accessLevel: 'free',
    pillarSlug: 'diagnostics',
    content: lexicalRoot([
      h2('Beyond the Standard Physical'),
      p(
        text(
          'The standard annual physical examination was designed for population-level screening, not for optimizing individual performance and longevity. A typical panel includes a basic metabolic panel, CBC, and lipid panel — but these miss critical markers that provide early warning of metabolic dysfunction, cardiovascular risk, and hormonal imbalance years before they manifest as disease.',
        ),
      ),
      p(
        text(
          'An executive-level biomarker panel should include four categories: metabolic health (fasting insulin, HbA1c, fasting glucose, HOMA-IR), cardiovascular risk (ApoB, Lp(a), hs-CRP, coronary artery calcium score), hormonal status (free and total testosterone, DHEA-S, thyroid panel including free T3/T4 and reverse T3), and inflammatory markers (hs-CRP, homocysteine, fibrinogen, IL-6).',
        ),
      ),
      callout(
        'art9-callout-1',
        'info',
        'ApoB is the single best predictor of cardiovascular risk — superior to LDL-C, total cholesterol, or any standard lipid metric. Each ApoB particle can penetrate the arterial wall and initiate atherosclerosis. The ideal ApoB level for longevity is below 60 mg/dL, though most standard labs do not flag levels below 90 mg/dL.',
      ),
      h2('Metabolic Biomarkers in Depth'),
      p(
        text(
          'Fasting insulin is perhaps the most underutilized biomarker in conventional medicine. Insulin resistance can be detected 10-15 years before fasting glucose becomes abnormal, providing an enormous window for intervention. The HOMA-IR score (calculated as fasting glucose × fasting insulin / 405) provides a simple proxy for insulin sensitivity. Optimal is below 1.0; above 2.5 suggests significant insulin resistance.',
        ),
      ),
      p(
        text(
          'Lipoprotein(a), or Lp(a), is a genetically determined cardiovascular risk factor present in approximately 20% of the population at elevated levels. Unlike LDL-C, Lp(a) is largely unresponsive to diet and exercise. Levels above 50 mg/dL (or 125 nmol/L) are associated with a 2-3x increased cardiovascular risk. Because it is 90% genetically determined, you only need to test it once — but that single test can fundamentally change your risk management strategy.',
        ),
      ),
      callout(
        'art9-callout-2',
        'warning',
        'Do not accept "normal" lab results without examining optimal ranges. A fasting glucose of 99 mg/dL is "normal" but already indicates prediabetic metabolic trajectory. The difference between normal and optimal ranges is where preventive medicine creates its greatest value.',
      ),
      quiz(
        'art9-quiz-1',
        'Which biomarker is considered the single best predictor of cardiovascular risk?',
        ['LDL cholesterol', 'Total cholesterol', 'ApoB', 'Triglycerides'],
        2,
        'ApoB (apolipoprotein B) is the most accurate single biomarker for cardiovascular risk because it directly measures the number of atherogenic lipoprotein particles, each of which can penetrate the arterial wall. LDL-C measures cholesterol content, which can be misleading when particle size varies.',
      ),
      quiz(
        'art9-quiz-2',
        'What is the approximate HOMA-IR threshold that suggests significant insulin resistance?',
        ['Above 0.5', 'Above 1.0', 'Above 2.5', 'Above 5.0'],
        2,
        'A HOMA-IR score above 2.5 suggests significant insulin resistance. The optimal level is below 1.0. HOMA-IR is calculated as (fasting glucose × fasting insulin) / 405, providing a simple proxy for insulin sensitivity without requiring a glucose tolerance test.',
      ),
    ]),
  },

  // ──────────────────────────────────────────────
  // 10. Diagnostics — Premium
  // ──────────────────────────────────────────────
  {
    title: 'Interpreting Advanced Bloodwork Panels',
    slug: 'interpreting-advanced-bloodwork-panels',
    excerpt:
      'Move beyond reference ranges to understand what your advanced bloodwork reveals about biological aging, immune function, and organ-specific health trajectories.',
    accessLevel: 'premium',
    pillarSlug: 'diagnostics',
    content: lexicalRoot([
      h2('From Reference Ranges to Optimal Ranges'),
      p(
        text(
          'Standard laboratory reference ranges are derived from the 2.5th to 97.5th percentile of the tested population — a population that includes individuals with undiagnosed metabolic disease, chronic inflammation, and suboptimal health. This means that "normal" results may still indicate significant deviation from physiological optimality. Longevity-focused bloodwork interpretation requires understanding optimal ranges, trending over time, and interpreting markers in context rather than isolation.',
        ),
      ),
      p(
        text(
          'Consider the complete blood count (CBC): a hemoglobin of 12.5 g/dL in a woman is "normal" but may indicate early iron deficiency that impacts energy, cognitive function, and exercise capacity. Similarly, a white blood cell count of 9.5 × 10⁹/L is within range but sits at a level associated with increased cardiovascular risk in prospective studies. Context transforms data into clinical insight.',
        ),
      ),
      callout(
        'art10-callout-1',
        'info',
        'Always request your raw lab data — not just the "normal/abnormal" flags. Track values over time in a personal spreadsheet or health dashboard. A rising trend within "normal" range is often more informative than a single abnormal value.',
      ),
      h2('Advanced Inflammatory and Immune Markers'),
      p(
        text(
          'High-sensitivity C-reactive protein (hs-CRP) is the most validated general inflammatory marker, but it lacks specificity. A comprehensive inflammatory assessment includes homocysteine (ideal <8 μmol/L, associated with cardiovascular and neurodegenerative risk when elevated), fibrinogen (an acute-phase protein that also reflects thrombotic risk), and GlycA — a newer NMR-derived marker that reflects systemic glycoprotein acetylation and has shown superior predictive value for cardiovascular events in several large cohort studies.',
        ),
      ),
      p(
        text(
          'The neutrophil-to-lymphocyte ratio (NLR), easily calculated from a standard CBC, has emerged as a powerful predictor of systemic inflammation and mortality. An NLR above 3.0 is associated with increased cardiovascular events, cancer progression, and all-cause mortality. Unlike hs-CRP, NLR is not affected by acute infections or minor injuries, making it a more stable longitudinal marker.',
        ),
      ),
      callout(
        'art10-callout-2',
        'tip',
        'Order your bloodwork at the same time, same lab, and under the same conditions (fasting duration, hydration, sleep the night before) each time. Biological variation between draws can be as high as 10-15% for some markers. Consistency in testing conditions reduces noise and makes trend analysis more reliable.',
      ),
      h2('Organ-Specific Biomarker Panels'),
      p(
        text(
          'Liver function requires looking beyond ALT and AST to include GGT (gamma-glutamyl transferase), which is an early marker of oxidative stress and metabolic syndrome even when other liver enzymes are normal. For kidney function, cystatin C provides a more accurate estimate of glomerular filtration rate (GFR) than creatinine, especially in muscular individuals whose creatinine is naturally elevated. Thyroid assessment should always include free T3, free T4, reverse T3, and thyroid antibodies — not just TSH, which can be normal in the presence of significant thyroid dysfunction.',
        ),
      ),
    ]),
  },

  // ──────────────────────────────────────────────
  // 11. Longevity Science — Free
  // ──────────────────────────────────────────────
  {
    title: 'Introduction to Hallmarks of Aging',
    slug: 'introduction-to-hallmarks-of-aging',
    excerpt:
      'The 12 hallmarks of aging provide a scientific framework for understanding why we age and which interventions target root causes rather than symptoms.',
    accessLevel: 'free',
    pillarSlug: 'longevity-science',
    content: lexicalRoot([
      h2('The Hallmarks Framework'),
      p(
        text(
          'In 2013, Carlos López-Otín and colleagues published a landmark paper in ',
        ),
        bold('Cell'),
        text(
          ' identifying nine hallmarks of aging — later expanded to twelve in their 2023 update. These hallmarks represent the fundamental biological processes that drive aging at the cellular and molecular level: genomic instability, telomere attrition, epigenetic alterations, loss of proteostasis, disabled macroautophagy, deregulated nutrient sensing, mitochondrial dysfunction, cellular senescence, stem cell exhaustion, altered intercellular communication, chronic inflammation, and dysbiosis.',
        ),
      ),
      p(
        text(
          'The framework is revolutionary because it provides a systematic classification that connects disparate aging phenomena. Rather than viewing Alzheimer\'s, cardiovascular disease, cancer, and sarcopenia as separate conditions, the hallmarks framework reveals them as downstream manifestations of shared underlying processes. This has profound implications for intervention strategies: targeting hallmarks upstream may simultaneously reduce risk across multiple age-related diseases.',
        ),
      ),
      callout(
        'art11-callout-1',
        'info',
        'The 12 hallmarks are organized into three categories: primary hallmarks (causes of cellular damage), antagonistic hallmarks (responses to damage that become harmful when chronic), and integrative hallmarks (the downstream functional consequences). Understanding this hierarchy helps prioritize interventions.',
      ),
      h2('Key Hallmarks and Their Interventions'),
      p(
        text(
          'Deregulated nutrient sensing encompasses four interconnected pathways: mTOR, AMPK, sirtuins, and insulin/IGF-1 signaling. mTOR (mechanistic target of rapamycin) is the master growth switch — when chronically activated by excess nutrition, it accelerates aging by promoting cellular growth over maintenance and repair. Caloric restriction, time-restricted eating, and the drug rapamycin all partially inhibit mTOR, shifting the balance toward autophagy and cellular repair.',
        ),
      ),
      p(
        text(
          'Epigenetic alterations — changes in gene expression without changes to DNA sequence — are now measurable through "epigenetic clocks" like the Horvath clock and GrimAge. These clocks can estimate biological age with remarkable accuracy and track the impact of lifestyle interventions. Studies show that comprehensive lifestyle programs (nutrition, exercise, sleep, stress management) can reverse epigenetic age by 1-3 years within 8 weeks.',
        ),
      ),
      callout(
        'art11-callout-2',
        'tip',
        'NAD+ (nicotinamide adenine dinucleotide) levels decline approximately 50% between ages 40 and 60. NAD+ is essential for sirtuin activation, DNA repair, and mitochondrial function. Precursors like NMN (nicotinamide mononucleotide) and NR (nicotinamide riboside) are among the most studied longevity supplements, though human data is still emerging.',
      ),
      h2('From Science to Practice'),
      p(
        text(
          'The practical takeaway from the hallmarks framework is that the most effective anti-aging interventions are those that target multiple hallmarks simultaneously. Exercise targets at least 8 of the 12 hallmarks. Caloric restriction or time-restricted eating targets 6. Quality sleep targets 5. No single pharmaceutical intervention comes close to the multi-hallmark impact of these foundational lifestyle practices — which is why they form the basis of any serious longevity protocol.',
        ),
      ),
    ]),
  },

  // ──────────────────────────────────────────────
  // 12. Longevity Science — Premium + Quiz
  // ──────────────────────────────────────────────
  {
    title: 'Senolytics and Cellular Rejuvenation: Current Research',
    slug: 'senolytics-and-cellular-rejuvenation-current-research',
    excerpt:
      'Senescent cells accumulate with age, secreting inflammatory factors that accelerate decline. Explore the emerging science of senolytic therapies and cellular reprogramming.',
    accessLevel: 'premium',
    pillarSlug: 'longevity-science',
    content: lexicalRoot([
      h2('Understanding Cellular Senescence'),
      p(
        text(
          'Cellular senescence is a state of irreversible growth arrest triggered by various stressors including telomere shortening, DNA damage, oncogene activation, and oxidative stress. While senescence evolved as a tumor-suppressive mechanism — preventing damaged cells from replicating — the accumulation of senescent cells with age creates a paradox: the very process that protects against cancer in youth drives aging and age-related disease in later life.',
        ),
      ),
      p(
        text(
          'Senescent cells exert their harmful effects primarily through the senescence-associated secretory phenotype (SASP) — a complex cocktail of pro-inflammatory cytokines (IL-6, IL-8, TNF-α), matrix metalloproteinases, growth factors, and chemokines that they continuously secrete into surrounding tissue. The SASP creates a toxic microenvironment that promotes chronic inflammation ("inflammaging"), impairs tissue repair, drives neighboring cells into senescence (paracrine senescence), and can promote tumor growth in adjacent pre-cancerous cells.',
        ),
      ),
      callout(
        'art12-callout-1',
        'info',
        'In mouse models, transplanting just a small number of senescent cells into young animals causes persistent physical dysfunction and spreads cellular senescence to host tissues. Conversely, genetically clearing senescent cells in aging mice extends median lifespan by 25-30% and reverses age-related pathology in multiple organs.',
      ),
      h2('Senolytic Therapies: Current Landscape'),
      p(
        text(
          'Senolytics are drugs that selectively eliminate senescent cells by targeting the anti-apoptotic pathways (BCL-2, BCL-XL, PI3K/AKT) that allow these cells to resist programmed cell death. The first identified senolytic combination, dasatinib plus quercetin (D+Q), was discovered by James Kirkland\'s lab at Mayo Clinic in 2015. Dasatinib (a leukemia drug) targets senescent preadipocytes, while quercetin (a plant flavonoid) targets senescent endothelial cells.',
        ),
      ),
      p(
        text(
          'Fisetin, a naturally occurring flavonoid found in strawberries, has shown potent senolytic activity in preclinical models and is currently in Phase 2 clinical trials (the AFFIRMM trial for COVID-related frailty and the AFFIRM-LITE trial for age-related frailty). Unlike D+Q, fisetin is available as a dietary supplement, leading to significant self-experimentation in the longevity community — though clinical data on optimal dosing, timing, and safety in humans remains limited.',
        ),
      ),
      callout(
        'art12-callout-2',
        'warning',
        'Self-prescribing senolytic protocols based on mouse studies is premature and potentially dangerous. Senescent cells play important roles in wound healing, tumor suppression, and tissue remodeling. Indiscriminate clearance could impair these processes. Wait for human clinical trial data before adopting senolytic regimens.',
      ),
      h2('Cellular Reprogramming: The Frontier'),
      p(
        text(
          'Partial cellular reprogramming — using Yamanaka factors (Oct4, Sox2, Klf4, c-Myc) to transiently reset the epigenetic age of cells without fully dedifferentiating them — represents the most ambitious frontier in rejuvenation science. Altos Labs, backed by $3 billion in funding, and several other companies (Calico, NewLimit, Turn Biotechnologies) are pursuing this approach. In animal models, cyclic expression of Yamanaka factors has restored youthful gene expression patterns, improved tissue function, and extended lifespan without increasing cancer risk — a concern that initially plagued the field.',
        ),
      ),
      quiz(
        'art12-quiz-1',
        'What is the SASP and why is it significant in aging?',
        [
          'A sleep analysis scoring protocol used in aging research',
          'The senescence-associated secretory phenotype — inflammatory factors secreted by senescent cells that drive tissue dysfunction',
          'A stress-activated signaling pathway in mitochondria',
          'A sarcopenia assessment scoring paradigm for muscle aging',
        ],
        1,
        'The SASP (senescence-associated secretory phenotype) is the cocktail of pro-inflammatory cytokines, chemokines, growth factors, and matrix metalloproteinases continuously secreted by senescent cells. The SASP drives chronic inflammation, impairs tissue repair, and can induce senescence in neighboring healthy cells.',
      ),
      quiz(
        'art12-quiz-2',
        'Which senolytic combination was the first to be identified and clinically tested?',
        [
          'Fisetin plus resveratrol',
          'Rapamycin plus metformin',
          'Dasatinib plus quercetin (D+Q)',
          'NAD+ plus spermidine',
        ],
        2,
        'Dasatinib plus quercetin (D+Q) was the first senolytic combination identified, discovered by James Kirkland\'s lab at Mayo Clinic in 2015. Dasatinib targets senescent preadipocytes while quercetin targets senescent endothelial cells. This combination has been tested in several human clinical trials.',
      ),
    ]),
  },
]
