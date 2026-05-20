import { logger } from '../utils/logger';

const exercisesLogger = logger.child({ module: 'StructuredExercises' });

/**
 * Types for Structured Exercises
 */
export interface Exercise {
  id: string;
  type: 'breathing' | 'cbt-thought-record' | 'progressive-muscle-relaxation' | 'grounding' | 'mindfulness';
  title: string;
  description: string;
  duration: number; // in minutes
  instructions: string[];
  benefits: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface BreathingExercise extends Exercise {
  type: 'breathing';
  pattern: {
    inhale: number;
    hold: number;
    exhale: number;
    pause?: number;
  };
  rounds: number;
}

export interface CBTThoughtRecord extends Exercise {
  type: 'cbt-thought-record';
  steps: {
    step: number;
    title: string;
    prompt: string;
    example: string;
  }[];
}

export interface GroundingExercise extends Exercise {
  type: 'grounding';
  technique: '5-4-3-2-1' | 'body-scan' | 'safe-place-visualization';
  steps: string[];
}

export type ExerciseCardType =
  | 'breathing-animation'
  | 'grounding-checklist'
  | 'cbt-thought-record'
  | 'body-scan-visual'
  | 'worry-dump-timer';

export interface ExerciseCardMeta {
  exerciseCard: ExerciseCardType;
  exerciseId: string;
  title: string;
  duration: number;
  difficulty: Exercise['difficulty'];
  pattern?: {
    inhale: number;
    hold: number;
    exhale: number;
    pause?: number;
  };
  rounds?: number;
  steps?: string[];
  cbtSteps?: { step: number; title: string; prompt: string }[];
}

/**
 * Structured Exercises Service
 * Provides guided therapeutic exercises in chat
 */
export class StructuredExercisesService {
  
  /**
   * Get all available exercises
   */
  getAllExercises(): Exercise[] {
    return [
      ...this.getBreathingExercises(),
      ...this.getCBTExercises(),
      ...this.getGroundingExercises(),
      ...this.getProgressiveMuscleRelaxation(),
      ...this.getMindfulnessExercises()
    ];
  }

  /**
   * Get breathing exercises
   */
  getBreathingExercises(): BreathingExercise[] {
    return [
      {
        id: 'breathing-box',
        type: 'breathing',
        title: 'Box Breathing (4-4-4-4)',
        description: 'Also known as square breathing, used by Navy SEALs to stay calm under pressure',
        duration: 5,
        pattern: {
          inhale: 4,
          hold: 4,
          exhale: 4,
          pause: 4
        },
        rounds: 5,
        instructions: [
          'Find a comfortable seated position',
          'Inhale through your nose for 4 counts',
          'Hold your breath for 4 counts',
          'Exhale through your mouth for 4 counts',
          'Pause for 4 counts',
          'Repeat for 5 rounds'
        ],
        benefits: ['Reduces stress', 'Improves focus', 'Regulates nervous system'],
        difficulty: 'beginner'
      },
      {
        id: 'breathing-478',
        type: 'breathing',
        title: '4-7-8 Breathing',
        description: 'Dr. Andrew Weil\'s relaxing breath technique for anxiety and sleep',
        duration: 3,
        pattern: {
          inhale: 4,
          hold: 7,
          exhale: 8
        },
        rounds: 4,
        instructions: [
          'Sit with your back straight',
          'Place the tip of your tongue against the ridge behind your upper teeth',
          'Exhale completely through your mouth, making a whoosh sound',
          'Close your mouth and inhale quietly through your nose for 4 counts',
          'Hold your breath for 7 counts',
          'Exhale completely through your mouth for 8 counts, making a whoosh sound',
          'Repeat for 4 rounds'
        ],
        benefits: ['Promotes sleep', 'Reduces anxiety', 'Calms the mind'],
        difficulty: 'beginner'
      },
      {
        id: 'breathing-diaphragmatic',
        type: 'breathing',
        title: 'Diaphragmatic Breathing',
        description: 'Deep belly breathing to activate the relaxation response',
        duration: 5,
        pattern: {
          inhale: 4,
          hold: 0,
          exhale: 6
        },
        rounds: 10,
        instructions: [
          'Lie on your back or sit comfortably',
          'Place one hand on your chest and one on your belly',
          'Breathe in slowly through your nose for 4 counts, feeling your belly rise',
          'Exhale slowly through your mouth for 6 counts, feeling your belly fall',
          'The hand on your chest should remain relatively still',
          'Repeat for 10 rounds'
        ],
        benefits: ['Activates parasympathetic nervous system', 'Reduces blood pressure', 'Improves oxygen flow'],
        difficulty: 'beginner'
      }
    ];
  }

  /**
   * Get CBT thought record exercises
   */
  getCBTExercises(): CBTThoughtRecord[] {
    return [
      {
        id: 'cbt-thought-record',
        type: 'cbt-thought-record',
        title: 'CBT Thought Record',
        description: 'Identify and challenge negative automatic thoughts using cognitive restructuring',
        duration: 10,
        instructions: [],
        benefits: ['Identifies thinking patterns', 'Challenges cognitive distortions', 'Builds balanced thinking'],
        difficulty: 'intermediate',
        steps: [
          {
            step: 1,
            title: 'Identify the Situation',
            prompt: 'What happened? Describe the situation objectively.',
            example: 'My boss sent me an email asking to meet tomorrow'
          },
          {
            step: 2,
            title: 'Notice Your Automatic Thought',
            prompt: 'What thought went through your mind? What did you tell yourself?',
            example: 'I must have done something wrong. I\'m going to get fired.'
          },
          {
            step: 3,
            title: 'Identify Your Emotions',
            prompt: 'What emotions did you feel? Rate the intensity (0-100%).',
            example: 'Anxiety (85%), Fear (75%)'
          },
          {
            step: 4,
            title: 'Examine the Evidence For',
            prompt: 'What evidence supports this thought?',
            example: 'They used a serious tone. They want to meet in person.'
          },
          {
            step: 5,
            title: 'Examine the Evidence Against',
            prompt: 'What evidence contradicts this thought?',
            example: 'My recent performance review was positive. They often schedule regular check-ins. They haven\'t mentioned any concerns.'
          },
          {
            step: 6,
            title: 'Create a Balanced Thought',
            prompt: 'What would be a more balanced, realistic way to think about this?',
            example: 'My boss wants to meet, which could be for many reasons - a new project, regular check-in, or feedback. It\'s probably routine. If there\'s an issue, I can address it.'
          },
          {
            step: 7,
            title: 'Re-rate Your Emotions',
            prompt: 'How intense are your emotions now? Rate them again (0-100%).',
            example: 'Anxiety (35%), Fear (20%)'
          }
        ]
      },
      {
        id: 'cbt-cognitive-distortions',
        type: 'cbt-thought-record',
        title: 'Identify Cognitive Distortions',
        description: 'Recognize common thinking traps that worsen anxiety and depression',
        duration: 8,
        instructions: [],
        benefits: ['Recognizes thinking errors', 'Reduces emotional reactivity', 'Improves thought awareness'],
        difficulty: 'intermediate',
        steps: [
          {
            step: 1,
            title: 'Write Your Thought',
            prompt: 'What negative thought are you having?',
            example: 'I always mess everything up'
          },
          {
            step: 2,
            title: 'Identify the Distortion',
            prompt: 'Which thinking trap(s) does this fit? (All-or-Nothing, Overgeneralization, Mental Filter, Disqualifying Positives, Jumping to Conclusions, Magnification/Minimization, Emotional Reasoning, Should Statements, Labeling, Personalization)',
            example: 'All-or-Nothing Thinking, Overgeneralization'
          },
          {
            step: 3,
            title: 'Challenge the Distortion',
            prompt: 'What evidence contradicts this thinking pattern?',
            example: 'I successfully completed a project last week. I received positive feedback from a colleague yesterday.'
          },
          {
            step: 4,
            title: 'Reframe',
            prompt: 'What\'s a more balanced, accurate thought?',
            example: 'Sometimes I make mistakes, and sometimes I succeed. I\'m learning and improving.'
          }
        ]
      }
    ];
  }

  /**
   * Get grounding exercises
   */
  getGroundingExercises(): GroundingExercise[] {
    return [
      {
        id: 'grounding-54321',
        type: 'grounding',
        title: '5-4-3-2-1 Sensory Grounding',
        description: 'Use your five senses to anchor yourself in the present moment',
        duration: 5,
        technique: '5-4-3-2-1',
        instructions: [],
        benefits: ['Stops panic attacks', 'Reduces dissociation', 'Brings awareness to present'],
        difficulty: 'beginner',
        steps: [
          'Name 5 things you can SEE around you',
          'Name 4 things you can TOUCH (notice the texture)',
          'Name 3 things you can HEAR',
          'Name 2 things you can SMELL',
          'Name 1 thing you can TASTE'
        ]
      },
      {
        id: 'grounding-body-scan',
        type: 'grounding',
        title: 'Body Scan Grounding',
        description: 'Systematically focus attention on different parts of your body',
        duration: 10,
        technique: 'body-scan',
        instructions: [],
        benefits: ['Releases physical tension', 'Improves body awareness', 'Promotes relaxation'],
        difficulty: 'beginner',
        steps: [
          'Sit or lie down comfortably',
          'Close your eyes and take three deep breaths',
          'Focus on your toes - notice any sensations, tension, or warmth',
          'Move attention slowly up through your feet, ankles, calves',
          'Continue through legs, hips, abdomen, chest',
          'Notice your hands, arms, shoulders, neck',
          'Finally scan your head, face, and jaw',
          'Release any tension you notice with each exhale'
        ]
      },
      {
        id: 'grounding-safe-place',
        type: 'grounding',
        title: 'Safe Place Visualization',
        description: 'Mentally visit a calming, safe place to reduce anxiety',
        duration: 7,
        technique: 'safe-place-visualization',
        instructions: [],
        benefits: ['Creates sense of safety', 'Reduces anxiety', 'Provides emotional refuge'],
        difficulty: 'intermediate',
        steps: [
          'Close your eyes and take three slow breaths',
          'Imagine a place where you feel completely safe and calm (real or imaginary)',
          'Picture the details - what do you see? Notice colors, shapes, light',
          'What sounds do you hear? Birds, water, silence?',
          'What scents are present?',
          'What do you feel? Sun on your skin? A cool breeze?',
          'Stay in this safe place for a few minutes',
          'Know you can return here anytime you need to'
        ]
      }
    ];
  }

  /**
   * Get progressive muscle relaxation exercises
   */
  getProgressiveMuscleRelaxation(): Exercise[] {
    return [
      {
        id: 'pmr-full-body',
        type: 'progressive-muscle-relaxation',
        title: 'Full Body Progressive Muscle Relaxation',
        description: 'Systematically tense and relax muscle groups to release physical tension',
        duration: 15,
        instructions: [
          'Find a quiet space and lie down or sit comfortably',
          'Take three deep breaths to begin',
          'For each muscle group: tense for 5 seconds, then release for 30 seconds',
          'Hands: Make tight fists, then release',
          'Forearms & Biceps: Bend arms and tense, then release',
          'Shoulders: Raise shoulders to ears, then drop',
          'Neck: Gently tilt head back, then relax',
          'Face: Scrunch facial muscles, then soften',
          'Chest: Take deep breath and hold, then exhale',
          'Stomach: Tighten abdominal muscles, then release',
          'Buttocks: Squeeze glutes, then release',
          'Thighs: Tense thigh muscles, then relax',
          'Calves: Point toes down, then relax',
          'Feet: Curl toes, then relax',
          'Finish with three deep breaths, noticing the relaxation'
        ],
        benefits: ['Releases muscle tension', 'Reduces stress', 'Improves sleep', 'Lowers blood pressure'],
        difficulty: 'beginner'
      },
      {
        id: 'pmr-quick',
        type: 'progressive-muscle-relaxation',
        title: 'Quick PMR (4 Muscle Groups)',
        description: 'A shorter version focusing on major muscle groups',
        duration: 5,
        instructions: [
          'Hands & Arms: Make fists and tense arms (5 sec), release (30 sec)',
          'Face & Neck: Scrunch face and tense neck (5 sec), release (30 sec)',
          'Chest, Shoulders & Back: Take deep breath and squeeze shoulder blades (5 sec), release (30 sec)',
          'Legs & Feet: Tense legs and point toes (5 sec), release (30 sec)',
          'Take three final deep breaths'
        ],
        benefits: ['Quick stress relief', 'Can be done anywhere', 'Reduces tension headaches'],
        difficulty: 'beginner'
      }
    ];
  }

  /**
   * Get mindfulness exercises
   */
  getMindfulnessExercises(): Exercise[] {
    return [
      {
        id: 'mindfulness-breath-awareness',
        type: 'mindfulness',
        title: 'Mindful Breath Awareness',
        description: 'Simple meditation focusing on the natural rhythm of breathing',
        duration: 10,
        instructions: [
          'Sit comfortably with your back straight',
          'Close your eyes or lower your gaze',
          'Notice your natural breath without changing it',
          'Feel the sensation of breath entering your nostrils',
          'Notice the rise and fall of your chest or belly',
          'When your mind wanders (and it will), gently return to the breath',
          'No judgment - just return to the breath each time',
          'Continue for 10 minutes'
        ],
        benefits: ['Improves focus', 'Reduces rumination', 'Increases present-moment awareness'],
        difficulty: 'beginner'
      },
      {
        id: 'mindfulness-loving-kindness',
        type: 'mindfulness',
        title: 'Loving-Kindness Meditation (Metta)',
        description: 'Cultivate compassion for yourself and others',
        duration: 12,
        instructions: [
          'Sit comfortably and close your eyes',
          'Take a few deep breaths to settle',
          'Begin with yourself: "May I be happy. May I be healthy. May I be safe. May I live with ease."',
          'Repeat these phrases for 2 minutes, feeling the intention',
          'Think of someone you love: "May you be happy. May you be healthy. May you be safe. May you live with ease."',
          'Think of a neutral person: offer them the same wishes',
          'If comfortable, think of someone difficult: offer them the same wishes',
          'Expand to all beings: "May all beings be happy. May all beings be healthy. May all beings be safe. May all beings live with ease."',
          'Rest in the warmth of loving-kindness for a moment',
          'Slowly open your eyes'
        ],
        benefits: ['Increases self-compassion', 'Reduces negative emotions', 'Improves relationships', 'Boosts positive emotions'],
        difficulty: 'intermediate'
      },
      {
        id: 'mindfulness-walking',
        type: 'mindfulness',
        title: 'Mindful Walking',
        description: 'Bring full attention to the act of walking',
        duration: 10,
        instructions: [
          'Find a quiet place to walk (indoors or outdoors)',
          'Walk slowly and deliberately',
          'Notice the sensation of your feet touching the ground',
          'Feel the weight shift from one foot to the other',
          'Notice the movement in your legs, hips, arms',
          'If your mind wanders, gently return to the sensations of walking',
          'You can walk in a straight line or in a circle',
          'Continue for 10 minutes, maintaining awareness of each step'
        ],
        benefits: ['Combines movement with mindfulness', 'Grounds energy', 'Improves balance and coordination'],
        difficulty: 'beginner'
      }
    ];
  }

  /**
   * Get exercise by ID
   */
  getExerciseById(id: string): Exercise | null {
    const allExercises = this.getAllExercises();
    return allExercises.find(ex => ex.id === id) || null;
  }

  /**
   * Get exercises by type
   */
  getExercisesByType(type: Exercise['type']): Exercise[] {
    return this.getAllExercises().filter(ex => ex.type === type);
  }

  /**
   * Get recommended exercise based on user state
   */
  getRecommendedExercise(userState: {
    emotion: 'anxiety' | 'stress' | 'depression' | 'anger' | 'overwhelm';
    timeAvailable: number; // in minutes
    experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  }): Exercise | null {
    const allExercises = this.getAllExercises();

    // Filter by time and difficulty
    let suitable = allExercises.filter(ex => 
      ex.duration <= userState.timeAvailable &&
      (userState.experienceLevel === 'advanced' || 
       ex.difficulty === userState.experienceLevel ||
       (userState.experienceLevel === 'intermediate' && ex.difficulty === 'beginner'))
    );

    // Recommend based on emotion
    switch (userState.emotion) {
      case 'anxiety':
        // Prefer breathing and grounding
        const anxietyEx = suitable.find(ex => ex.id === 'breathing-478' || ex.id === 'grounding-54321');
        return anxietyEx || suitable[0] || null;

      case 'stress':
        // Prefer PMR and breathing
        const stressEx = suitable.find(ex => ex.id === 'pmr-quick' || ex.id === 'breathing-diaphragmatic');
        return stressEx || suitable[0] || null;

      case 'depression':
        // Prefer mindfulness and loving-kindness
        const depressionEx = suitable.find(ex => ex.id === 'mindfulness-loving-kindness' || ex.id === 'mindfulness-walking');
        return depressionEx || suitable[0] || null;

      case 'anger':
        // Prefer breathing and PMR
        const angerEx = suitable.find(ex => ex.id === 'breathing-box' || ex.id === 'pmr-full-body');
        return angerEx || suitable[0] || null;

      case 'overwhelm':
        // Prefer grounding and short breathing
        const overwhelmEx = suitable.find(ex => ex.id === 'grounding-54321' || ex.id === 'breathing-box');
        return overwhelmEx || suitable[0] || null;

      default:
        return suitable[0] || null;
    }
  }

  /**
   * Format exercise for chat display
   */
  formatExerciseForChat(exercise: Exercise): { content: string; metadata: ExerciseCardMeta } {
    let formatted = `🧘 **${exercise.title}**\n\n`;
    formatted += `📝 ${exercise.description}\n\n`;
    formatted += `⏱️ Duration: ${exercise.duration} minutes\n`;
    formatted += `🎯 Difficulty: ${exercise.difficulty}\n\n`;

    const metadata: ExerciseCardMeta = {
      exerciseCard: this.mapTypeToCard(exercise),
      exerciseId: exercise.id,
      title: exercise.title,
      duration: exercise.duration,
      difficulty: exercise.difficulty
    };

    if ('pattern' in exercise && exercise.type === 'breathing') {
      const breathEx = exercise as BreathingExercise;
      metadata.pattern = breathEx.pattern;
      metadata.rounds = breathEx.rounds;
      formatted += `**Breathing Pattern:**\n`;
      formatted += `• Inhale: ${breathEx.pattern.inhale} seconds\n`;
      if (breathEx.pattern.hold) formatted += `• Hold: ${breathEx.pattern.hold} seconds\n`;
      formatted += `• Exhale: ${breathEx.pattern.exhale} seconds\n`;
      if (breathEx.pattern.pause) formatted += `• Pause: ${breathEx.pattern.pause} seconds\n`;
      formatted += `• Rounds: ${breathEx.rounds}\n\n`;
    }

    if ('steps' in exercise && exercise.type === 'cbt-thought-record') {
      const cbtEx = exercise as CBTThoughtRecord;
      metadata.cbtSteps = cbtEx.steps.map((step) => ({
        step: step.step,
        title: step.title,
        prompt: step.prompt
      }));
      formatted += `**Steps:**\n`;
      cbtEx.steps.forEach(step => {
        formatted += `\n${step.step}. **${step.title}**\n`;
        formatted += `   ${step.prompt}\n`;
        formatted += `   _Example: ${step.example}_\n`;
      });
      formatted += '\n';
    } else if ('steps' in exercise) {
      metadata.steps = (exercise as GroundingExercise).steps;
      formatted += `**Instructions:**\n`;
      (exercise as GroundingExercise).steps.forEach((step, i) => {
        formatted += `${i + 1}. ${step}\n`;
      });
      formatted += '\n';
    } else if (exercise.instructions.length > 0) {
      formatted += `**Instructions:**\n`;
      exercise.instructions.forEach((inst, i) => {
        formatted += `${i + 1}. ${inst}\n`;
      });
      formatted += '\n';
    }

    formatted += `**Benefits:**\n`;
    exercise.benefits.forEach(benefit => {
      formatted += `✓ ${benefit}\n`;
    });

    return {
      content: formatted,
      metadata
    };
  }

  private mapTypeToCard(exercise: Exercise): ExerciseCardType {
    if (exercise.type === 'breathing') {
      return 'breathing-animation';
    }

    if (exercise.type === 'cbt-thought-record') {
      return 'cbt-thought-record';
    }

    if (exercise.type === 'grounding') {
      const grounding = exercise as GroundingExercise;
      return grounding.technique === 'body-scan' ? 'body-scan-visual' : 'grounding-checklist';
    }

    return 'worry-dump-timer';
  }
}

export const structuredExercisesService = new StructuredExercisesService();
