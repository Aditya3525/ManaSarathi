/**
 * Basic Assessment Definitions
 * 
 * Short screening versions of full clinical assessments.
 * Hardcoded to ensure offline availability and consistent question counts.
 * Ported from webapp's basicAssessmentDefinitions.ts
 */

export interface BasicAssessmentOption {
  id: string;
  value: number;
  text: string;
}

export interface BasicAssessmentQuestion {
  id: string;
  text: string;
  type: 'likert' | 'yes-no' | 'multiple-choice';
  options: BasicAssessmentOption[];
}

export interface BasicAssessmentDefinition {
  assessmentType: string;
  title: string;
  description: string;
  questions: BasicAssessmentQuestion[];
  estimatedMinutes: number;
}

export const BASIC_ASSESSMENT_DEFINITIONS: Record<string, BasicAssessmentDefinition> = {
  anxiety_gad2: {
    assessmentType: 'anxiety_gad2',
    title: 'Anxiety (GAD-2)',
    description: 'Two quick check-in questions about recent anxious feelings.',
    estimatedMinutes: 2,
    questions: [
      {
        id: 'gad2_q1',
        text: 'Over the last 2 weeks, how often have you been bothered by feeling nervous, anxious, or on edge?',
        type: 'likert',
        options: [
          { id: 'gad2_q1_opt0', value: 0, text: 'Not at all' },
          { id: 'gad2_q1_opt1', value: 1, text: 'Several days' },
          { id: 'gad2_q1_opt2', value: 2, text: 'More than half the days' },
          { id: 'gad2_q1_opt3', value: 3, text: 'Nearly every day' },
        ],
      },
      {
        id: 'gad2_q2',
        text: 'Over the last 2 weeks, how often have you been bothered by not being able to stop or control worrying?',
        type: 'likert',
        options: [
          { id: 'gad2_q2_opt0', value: 0, text: 'Not at all' },
          { id: 'gad2_q2_opt1', value: 1, text: 'Several days' },
          { id: 'gad2_q2_opt2', value: 2, text: 'More than half the days' },
          { id: 'gad2_q2_opt3', value: 3, text: 'Nearly every day' },
        ],
      },
    ],
  },

  depression_phq2: {
    assessmentType: 'depression_phq2',
    title: 'Depression (PHQ-2)',
    description: 'Notice mood shifts and energy with this brief screener.',
    estimatedMinutes: 2,
    questions: [
      {
        id: 'phq2_q1',
        text: 'Over the last 2 weeks, how often have you been bothered by little interest or pleasure in doing things?',
        type: 'likert',
        options: [
          { id: 'phq2_q1_opt0', value: 0, text: 'Not at all' },
          { id: 'phq2_q1_opt1', value: 1, text: 'Several days' },
          { id: 'phq2_q1_opt2', value: 2, text: 'More than half the days' },
          { id: 'phq2_q1_opt3', value: 3, text: 'Nearly every day' },
        ],
      },
      {
        id: 'phq2_q2',
        text: 'Over the last 2 weeks, how often have you been bothered by feeling down, depressed, or hopeless?',
        type: 'likert',
        options: [
          { id: 'phq2_q2_opt0', value: 0, text: 'Not at all' },
          { id: 'phq2_q2_opt1', value: 1, text: 'Several days' },
          { id: 'phq2_q2_opt2', value: 2, text: 'More than half the days' },
          { id: 'phq2_q2_opt3', value: 3, text: 'Nearly every day' },
        ],
      },
    ],
  },

  stress_pss4: {
    assessmentType: 'stress_pss4',
    title: 'Stress (PSS-4)',
    description: 'Gauge how overwhelmed or in-control life has felt lately.',
    estimatedMinutes: 3,
    questions: [
      {
        id: 'pss4_q1',
        text: 'In the last month, how often have you felt that you were unable to control the important things in your life?',
        type: 'likert',
        options: [
          { id: 'pss4_q1_opt0', value: 0, text: 'Never' },
          { id: 'pss4_q1_opt1', value: 1, text: 'Almost never' },
          { id: 'pss4_q1_opt2', value: 2, text: 'Sometimes' },
          { id: 'pss4_q1_opt3', value: 3, text: 'Fairly often' },
          { id: 'pss4_q1_opt4', value: 4, text: 'Very often' },
        ],
      },
      {
        id: 'pss4_q2',
        text: 'In the last month, how often have you felt confident about your ability to handle your personal problems?',
        type: 'likert',
        options: [
          { id: 'pss4_q2_opt0', value: 0, text: 'Never' },
          { id: 'pss4_q2_opt1', value: 1, text: 'Almost never' },
          { id: 'pss4_q2_opt2', value: 2, text: 'Sometimes' },
          { id: 'pss4_q2_opt3', value: 3, text: 'Fairly often' },
          { id: 'pss4_q2_opt4', value: 4, text: 'Very often' },
        ],
      },
      {
        id: 'pss4_q3',
        text: 'In the last month, how often have you felt that things were going your way?',
        type: 'likert',
        options: [
          { id: 'pss4_q3_opt0', value: 0, text: 'Never' },
          { id: 'pss4_q3_opt1', value: 1, text: 'Almost never' },
          { id: 'pss4_q3_opt2', value: 2, text: 'Sometimes' },
          { id: 'pss4_q3_opt3', value: 3, text: 'Fairly often' },
          { id: 'pss4_q3_opt4', value: 4, text: 'Very often' },
        ],
      },
      {
        id: 'pss4_q4',
        text: 'In the last month, how often have you felt difficulties were piling up so high that you could not overcome them?',
        type: 'likert',
        options: [
          { id: 'pss4_q4_opt0', value: 0, text: 'Never' },
          { id: 'pss4_q4_opt1', value: 1, text: 'Almost never' },
          { id: 'pss4_q4_opt2', value: 2, text: 'Sometimes' },
          { id: 'pss4_q4_opt3', value: 3, text: 'Fairly often' },
          { id: 'pss4_q4_opt4', value: 4, text: 'Very often' },
        ],
      },
    ],
  },

  overthinking_rrs4: {
    assessmentType: 'overthinking_rrs4',
    title: 'Overthinking (RRS-4)',
    description: 'Spot rumination loops and looping thought patterns.',
    estimatedMinutes: 3,
    questions: [
      {
        id: 'rrs4_q1',
        text: 'How often do you think about a recent situation, wishing it had gone better?',
        type: 'likert',
        options: [
          { id: 'rrs4_q1_opt0', value: 0, text: 'Almost never' },
          { id: 'rrs4_q1_opt1', value: 1, text: 'Sometimes' },
          { id: 'rrs4_q1_opt2', value: 2, text: 'Often' },
          { id: 'rrs4_q1_opt3', value: 3, text: 'Almost always' },
        ],
      },
      {
        id: 'rrs4_q2',
        text: 'How often do you think "Why do I always react this way?"',
        type: 'likert',
        options: [
          { id: 'rrs4_q2_opt0', value: 0, text: 'Almost never' },
          { id: 'rrs4_q2_opt1', value: 1, text: 'Sometimes' },
          { id: 'rrs4_q2_opt2', value: 2, text: 'Often' },
          { id: 'rrs4_q2_opt3', value: 3, text: 'Almost always' },
        ],
      },
      {
        id: 'rrs4_q3',
        text: 'How often do you think about your feelings and problems to try to understand them?',
        type: 'likert',
        options: [
          { id: 'rrs4_q3_opt0', value: 0, text: 'Almost never' },
          { id: 'rrs4_q3_opt1', value: 1, text: 'Sometimes' },
          { id: 'rrs4_q3_opt2', value: 2, text: 'Often' },
          { id: 'rrs4_q3_opt3', value: 3, text: 'Almost always' },
        ],
      },
      {
        id: 'rrs4_q4',
        text: 'How often do you go over past events in your mind repeatedly?',
        type: 'likert',
        options: [
          { id: 'rrs4_q4_opt0', value: 0, text: 'Almost never' },
          { id: 'rrs4_q4_opt1', value: 1, text: 'Sometimes' },
          { id: 'rrs4_q4_opt2', value: 2, text: 'Often' },
          { id: 'rrs4_q4_opt3', value: 3, text: 'Almost always' },
        ],
      },
    ],
  },

  trauma_pcptsd5: {
    assessmentType: 'trauma_pcptsd5',
    title: 'Trauma & Fear (PC-PTSD-5)',
    description: 'A gentle opt-in check around trauma reminders and safety.',
    estimatedMinutes: 3,
    questions: [
      {
        id: 'pcptsd5_q1',
        text: 'Have you had nightmares about a stressful experience or thought about it when you did not want to?',
        type: 'yes-no',
        options: [
          { id: 'pcptsd5_q1_opt0', value: 0, text: 'No' },
          { id: 'pcptsd5_q1_opt1', value: 1, text: 'Yes' },
        ],
      },
      {
        id: 'pcptsd5_q2',
        text: 'Have you tried hard not to think about a stressful experience or went out of your way to avoid situations that reminded you of it?',
        type: 'yes-no',
        options: [
          { id: 'pcptsd5_q2_opt0', value: 0, text: 'No' },
          { id: 'pcptsd5_q2_opt1', value: 1, text: 'Yes' },
        ],
      },
      {
        id: 'pcptsd5_q3',
        text: 'Have you been constantly on guard, watchful, or easily startled?',
        type: 'yes-no',
        options: [
          { id: 'pcptsd5_q3_opt0', value: 0, text: 'No' },
          { id: 'pcptsd5_q3_opt1', value: 1, text: 'Yes' },
        ],
      },
      {
        id: 'pcptsd5_q4',
        text: 'Have you felt numb or detached from people, activities, or your surroundings?',
        type: 'yes-no',
        options: [
          { id: 'pcptsd5_q4_opt0', value: 0, text: 'No' },
          { id: 'pcptsd5_q4_opt1', value: 1, text: 'Yes' },
        ],
      },
      {
        id: 'pcptsd5_q5',
        text: 'Have you felt guilty or unable to stop blaming yourself or others for the stressful experience or problems that resulted from it?',
        type: 'yes-no',
        options: [
          { id: 'pcptsd5_q5_opt0', value: 0, text: 'No' },
          { id: 'pcptsd5_q5_opt1', value: 1, text: 'Yes' },
        ],
      },
    ],
  },

  emotional_intelligence_eq5: {
    assessmentType: 'emotional_intelligence_eq5',
    title: 'Emotional Intelligence (EQ-5)',
    description: 'Understand emotional awareness and regulation strengths.',
    estimatedMinutes: 4,
    questions: [
      {
        id: 'eq5_q1',
        text: 'I can easily understand my emotions and what causes them.',
        type: 'likert',
        options: [
          { id: 'eq5_q1_opt0', value: 0, text: 'Strongly disagree' },
          { id: 'eq5_q1_opt1', value: 1, text: 'Disagree' },
          { id: 'eq5_q1_opt2', value: 2, text: 'Neutral' },
          { id: 'eq5_q1_opt3', value: 3, text: 'Agree' },
          { id: 'eq5_q1_opt4', value: 4, text: 'Strongly agree' },
        ],
      },
      {
        id: 'eq5_q2',
        text: 'I find it easy to manage my emotions when facing challenges.',
        type: 'likert',
        options: [
          { id: 'eq5_q2_opt0', value: 0, text: 'Strongly disagree' },
          { id: 'eq5_q2_opt1', value: 1, text: 'Disagree' },
          { id: 'eq5_q2_opt2', value: 2, text: 'Neutral' },
          { id: 'eq5_q2_opt3', value: 3, text: 'Agree' },
          { id: 'eq5_q2_opt4', value: 4, text: 'Strongly agree' },
        ],
      },
      {
        id: 'eq5_q3',
        text: 'I am good at understanding how others are feeling.',
        type: 'likert',
        options: [
          { id: 'eq5_q3_opt0', value: 0, text: 'Strongly disagree' },
          { id: 'eq5_q3_opt1', value: 1, text: 'Disagree' },
          { id: 'eq5_q3_opt2', value: 2, text: 'Neutral' },
          { id: 'eq5_q3_opt3', value: 3, text: 'Agree' },
          { id: 'eq5_q3_opt4', value: 4, text: 'Strongly agree' },
        ],
      },
      {
        id: 'eq5_q4',
        text: 'I can motivate myself to keep going even when things are difficult.',
        type: 'likert',
        options: [
          { id: 'eq5_q4_opt0', value: 0, text: 'Strongly disagree' },
          { id: 'eq5_q4_opt1', value: 1, text: 'Disagree' },
          { id: 'eq5_q4_opt2', value: 2, text: 'Neutral' },
          { id: 'eq5_q4_opt3', value: 3, text: 'Agree' },
          { id: 'eq5_q4_opt4', value: 4, text: 'Strongly agree' },
        ],
      },
      {
        id: 'eq5_q5',
        text: 'I handle social situations and relationships effectively.',
        type: 'likert',
        options: [
          { id: 'eq5_q5_opt0', value: 0, text: 'Strongly disagree' },
          { id: 'eq5_q5_opt1', value: 1, text: 'Disagree' },
          { id: 'eq5_q5_opt2', value: 2, text: 'Neutral' },
          { id: 'eq5_q5_opt3', value: 3, text: 'Agree' },
          { id: 'eq5_q5_opt4', value: 4, text: 'Strongly agree' },
        ],
      },
    ],
  },

  personality_bigfive10: {
    assessmentType: 'personality_bigfive10',
    title: 'Personality (Big Five)',
    description: 'A quick look at five core personality traits and energies.',
    estimatedMinutes: 4,
    questions: [
      {
        id: 'bigfive10_q1',
        text: 'I see myself as extraverted, enthusiastic.',
        type: 'likert',
        options: [
          { id: 'bigfive10_q1_opt0', value: 0, text: 'Disagree strongly' },
          { id: 'bigfive10_q1_opt1', value: 1, text: 'Disagree a little' },
          { id: 'bigfive10_q1_opt2', value: 2, text: 'Neutral' },
          { id: 'bigfive10_q1_opt3', value: 3, text: 'Agree a little' },
          { id: 'bigfive10_q1_opt4', value: 4, text: 'Agree strongly' },
        ],
      },
      {
        id: 'bigfive10_q2',
        text: 'I see myself as critical, quarrelsome.',
        type: 'likert',
        options: [
          { id: 'bigfive10_q2_opt0', value: 0, text: 'Disagree strongly' },
          { id: 'bigfive10_q2_opt1', value: 1, text: 'Disagree a little' },
          { id: 'bigfive10_q2_opt2', value: 2, text: 'Neutral' },
          { id: 'bigfive10_q2_opt3', value: 3, text: 'Agree a little' },
          { id: 'bigfive10_q2_opt4', value: 4, text: 'Agree strongly' },
        ],
      },
      {
        id: 'bigfive10_q3',
        text: 'I see myself as dependable, self-disciplined.',
        type: 'likert',
        options: [
          { id: 'bigfive10_q3_opt0', value: 0, text: 'Disagree strongly' },
          { id: 'bigfive10_q3_opt1', value: 1, text: 'Disagree a little' },
          { id: 'bigfive10_q3_opt2', value: 2, text: 'Neutral' },
          { id: 'bigfive10_q3_opt3', value: 3, text: 'Agree a little' },
          { id: 'bigfive10_q3_opt4', value: 4, text: 'Agree strongly' },
        ],
      },
      {
        id: 'bigfive10_q4',
        text: 'I see myself as anxious, easily upset.',
        type: 'likert',
        options: [
          { id: 'bigfive10_q4_opt0', value: 0, text: 'Disagree strongly' },
          { id: 'bigfive10_q4_opt1', value: 1, text: 'Disagree a little' },
          { id: 'bigfive10_q4_opt2', value: 2, text: 'Neutral' },
          { id: 'bigfive10_q4_opt3', value: 3, text: 'Agree a little' },
          { id: 'bigfive10_q4_opt4', value: 4, text: 'Agree strongly' },
        ],
      },
      {
        id: 'bigfive10_q5',
        text: 'I see myself as open to new experiences, complex.',
        type: 'likert',
        options: [
          { id: 'bigfive10_q5_opt0', value: 0, text: 'Disagree strongly' },
          { id: 'bigfive10_q5_opt1', value: 1, text: 'Disagree a little' },
          { id: 'bigfive10_q5_opt2', value: 2, text: 'Neutral' },
          { id: 'bigfive10_q5_opt3', value: 3, text: 'Agree a little' },
          { id: 'bigfive10_q5_opt4', value: 4, text: 'Agree strongly' },
        ],
      },
      {
        id: 'bigfive10_q6',
        text: 'I see myself as reserved, quiet.',
        type: 'likert',
        options: [
          { id: 'bigfive10_q6_opt0', value: 0, text: 'Disagree strongly' },
          { id: 'bigfive10_q6_opt1', value: 1, text: 'Disagree a little' },
          { id: 'bigfive10_q6_opt2', value: 2, text: 'Neutral' },
          { id: 'bigfive10_q6_opt3', value: 3, text: 'Agree a little' },
          { id: 'bigfive10_q6_opt4', value: 4, text: 'Agree strongly' },
        ],
      },
      {
        id: 'bigfive10_q7',
        text: 'I see myself as sympathetic, warm.',
        type: 'likert',
        options: [
          { id: 'bigfive10_q7_opt0', value: 0, text: 'Disagree strongly' },
          { id: 'bigfive10_q7_opt1', value: 1, text: 'Disagree a little' },
          { id: 'bigfive10_q7_opt2', value: 2, text: 'Neutral' },
          { id: 'bigfive10_q7_opt3', value: 3, text: 'Agree a little' },
          { id: 'bigfive10_q7_opt4', value: 4, text: 'Agree strongly' },
        ],
      },
      {
        id: 'bigfive10_q8',
        text: 'I see myself as disorganized, careless.',
        type: 'likert',
        options: [
          { id: 'bigfive10_q8_opt0', value: 0, text: 'Disagree strongly' },
          { id: 'bigfive10_q8_opt1', value: 1, text: 'Disagree a little' },
          { id: 'bigfive10_q8_opt2', value: 2, text: 'Neutral' },
          { id: 'bigfive10_q8_opt3', value: 3, text: 'Agree a little' },
          { id: 'bigfive10_q8_opt4', value: 4, text: 'Agree strongly' },
        ],
      },
      {
        id: 'bigfive10_q9',
        text: 'I see myself as calm, emotionally stable.',
        type: 'likert',
        options: [
          { id: 'bigfive10_q9_opt0', value: 0, text: 'Disagree strongly' },
          { id: 'bigfive10_q9_opt1', value: 1, text: 'Disagree a little' },
          { id: 'bigfive10_q9_opt2', value: 2, text: 'Neutral' },
          { id: 'bigfive10_q9_opt3', value: 3, text: 'Agree a little' },
          { id: 'bigfive10_q9_opt4', value: 4, text: 'Agree strongly' },
        ],
      },
      {
        id: 'bigfive10_q10',
        text: 'I see myself as conventional, uncreative.',
        type: 'likert',
        options: [
          { id: 'bigfive10_q10_opt0', value: 0, text: 'Disagree strongly' },
          { id: 'bigfive10_q10_opt1', value: 1, text: 'Disagree a little' },
          { id: 'bigfive10_q10_opt2', value: 2, text: 'Neutral' },
          { id: 'bigfive10_q10_opt3', value: 3, text: 'Agree a little' },
          { id: 'bigfive10_q10_opt4', value: 4, text: 'Agree strongly' },
        ],
      },
    ],
  },
};

/** Check if a given assessment type is a basic assessment */
export const isBasicAssessment = (assessmentType: string): boolean =>
  assessmentType in BASIC_ASSESSMENT_DEFINITIONS;

/** Get basic assessment definition by type */
export const getBasicAssessmentDefinition = (
  assessmentType: string,
): BasicAssessmentDefinition | null =>
  BASIC_ASSESSMENT_DEFINITIONS[assessmentType] || null;

/** Get all basic assessment types as array */
export const getAllBasicAssessmentTypes = (): BasicAssessmentDefinition[] =>
  Object.values(BASIC_ASSESSMENT_DEFINITIONS);

/** Calculate total estimated time for selected basic assessments */
export const getEstimatedTime = (selectedTypes: string[]): number =>
  selectedTypes.reduce((total, type) => {
    const def = BASIC_ASSESSMENT_DEFINITIONS[type];
    return total + (def?.estimatedMinutes ?? 3);
  }, 0);
