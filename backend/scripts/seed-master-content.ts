import { PrismaClient, PracticeCategory, ContentType, DifficultyLevel } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Master Varieties of Practice and Content Library elements...');

  // --- PRACTICES DATA ---
  const practices = [
    // 1. Meditation (Eastern, Audio, Beginner)
    {
      title: 'Metta (Loving-Kindness) Meditation',
      type: 'meditation',
      category: PracticeCategory.MEDITATION,
      duration: 10,
      difficulty: 'Beginner',
      intensityLevel: DifficultyLevel.BEGINNER,
      approach: 'Eastern',
      format: 'Audio',
      description: 'Cultivate compassion and love for yourself and others through silent repetition of supportive phrases.',
      instructions: '1. Sit comfortably. 2. Breathe naturally. 3. Repeat mentally: May I be happy, may I be healthy, may I be safe.',
      benefits: 'Increases positive emotions, reduces self-criticism.',
      precautions: 'Might bring up unexpected emotional sadness initially.',
      focusAreas: JSON.stringify(['Self-Compassion', 'Relationships', 'Depression']),
      immediateRelief: false,
      tags: 'metta,compassion,buddhism'
    },
    // 2. Yoga (Eastern/Hybrid, Video, Intermediate)
    {
      title: 'Restorative Yin Yoga for Lower Back',
      type: 'yoga',
      category: PracticeCategory.YOGA,
      duration: 30,
      difficulty: 'Intermediate',
      intensityLevel: DifficultyLevel.INTERMEDIATE,
      approach: 'Eastern',
      format: 'Video',
      description: 'Long-held, passive floor poses that mainly work the lower part of the body to release deep connective tissues.',
      instructions: 'Hold each pose, such as Butterfly or Child\'s Pose, for 3-5 minutes. Breathe into the stretch.',
      benefits: 'Releases chronic physical tension, regulates circadian rhythm.',
      precautions: 'Do not push through sharp pain. Use props as needed.',
      focusAreas: JSON.stringify(['Physical Tension', 'Stress', 'Sleep']),
      immediateRelief: false,
      tags: 'yin,yoga,stretch,flexibility'
    },
    // 3. Breathing (Western, Text/Audio, Advanced)
    {
      title: 'Cyclic Sighing (Physiological Sigh)',
      type: 'breathing',
      category: PracticeCategory.BREATHING,
      duration: 5,
      difficulty: 'Beginner',
      intensityLevel: DifficultyLevel.BEGINNER,
      approach: 'Western',
      format: 'Audio',
      description: 'A scientifically validated breathing pattern to offload CO2 and bring immediate autonomous nervous system stabilization.',
      instructions: 'Perform two inhales through the nose (the second a quick top-off), followed by a long, extended exhale through the mouth. Repeat for 5 minutes.',
      benefits: 'Rapidly lowers heart rate, clinically shown to improve mood more effectively than mindfulness meditation.',
      precautions: 'Stop if lightheadedness occurs.',
      focusAreas: JSON.stringify(['Panic', 'Anxiety', 'Acute-Stress']),
      immediateRelief: true,
      tags: 'huberman,cyclic-sighing,rapid-calm'
    },
    // 4. Grounding Exercise (Hybrid, Audio, Beginner)
    {
      title: '5-4-3-2-1 Sensory Grounding',
      type: 'grounding_exercise',
      category: PracticeCategory.GROUNDING_EXERCISE,
      duration: 2,
      difficulty: 'Beginner',
      intensityLevel: DifficultyLevel.BEGINNER,
      approach: 'Hybrid',
      format: 'Audio',
      description: 'Bring your mind back to the physical present by engaging the 5 senses.',
      instructions: 'Name 5 things you see, 4 you feel, 3 you hear, 2 you smell, 1 you taste.',
      benefits: 'Instantly halts dissociative or panic spirals.',
      precautions: 'None. Safe anytime.',
      focusAreas: JSON.stringify(['Panic-Attack', 'Dissociation', 'Trauma']),
      immediateRelief: true,
      tags: 'grounding,senses,crisis'
    },
    // 5. CBT Technique (Western, Interactive, Intermediate)
    {
      title: 'The Worry Tree',
      type: 'cbt_technique',
      category: PracticeCategory.CBT_TECHNIQUE,
      duration: 15,
      difficulty: 'Intermediate',
      intensityLevel: DifficultyLevel.INTERMEDIATE,
      approach: 'Western',
      format: 'Text',
      description: 'A cognitive-behavioral flowchart to separate hypothetical worries from actionable problems.',
      instructions: 'Ask: "What am I worrying about?" Then ask: "Is there anything I can do about it right now?" If yes, make a plan. If no, practice letting the worry go.',
      benefits: 'Breaks rumination loops, encourages problem-solving.',
      precautions: 'Requires focus; might be hard during acute panic.',
      focusAreas: JSON.stringify(['Rumination', 'Anxiety', 'Overthinking']),
      immediateRelief: false,
      tags: 'cbt,worry-tree,cognitive-restructuring'
    },
    // 6. Movement (Hybrid, Video, Advanced)
    {
      title: 'Somatic Shaking Therapy (TRE)',
      type: 'movement',
      category: PracticeCategory.MOVEMENT,
      duration: 20,
      difficulty: 'Advanced',
      intensityLevel: DifficultyLevel.ADVANCED,
      approach: 'Hybrid',
      format: 'Video',
      description: 'A series of exercises that assist the body in releasing deep muscular patterns of stress, tension, and trauma.',
      instructions: 'Stand shoulder width and bounce softly on the knees. Gradually let the shaking move up into your hips, torso, and arms.',
      benefits: 'Releases trauma held in the nervous system.',
      precautions: 'Not recommended for individuals with severe, untreated PTSD without a practitioner.',
      focusAreas: JSON.stringify(['Trauma', 'Burnout', 'Physical Tension']),
      immediateRelief: true,
      tags: 'somatic,shaking,trauma-release'
    },
    // 7. Sleep Hygiene (Western, Audio, Beginner)
    {
      title: 'Progressive Muscle Relaxation (PMR)',
      type: 'sleep_hygiene',
      category: PracticeCategory.SLEEP_HYGIENE,
      duration: 15,
      difficulty: 'Beginner',
      intensityLevel: DifficultyLevel.BEGINNER,
      approach: 'Western',
      format: 'Audio',
      description: 'Tensing and releasing muscle groups to promote deep physical relaxation before sleep.',
      instructions: 'Lie in bed. Inhale and tense your feet tightly for 5 seconds. Exhale and release completely. Move up to calves, thighs, glutes, all the way to the face.',
      benefits: 'Cures insomnia, reduces restless leg syndrome.',
      precautions: 'Avoid clenching injured areas.',
      focusAreas: JSON.stringify(['Insomnia', 'Stress', 'Physical Tension']),
      immediateRelief: true,
      tags: 'pmr,sleep,relaxation'
    }
  ];

  // --- CONTENT LIBRARY DATA ---
  const contents = [
    // 1. Article / Psychoeducation (Western, Intermediate)
    {
      title: 'Understanding the Window of Tolerance',
      type: 'article',
      contentType: ContentType.PSYCHOEDUCATION,
      category: 'Nervous System',
      approach: 'western',
      content: 'The "Window of Tolerance" is a concept developed by Dr. Dan Siegel. It describes the optimal zone of arousal for a person to function and thrive. When you are outside this window, you are either in hyper-arousal (fight or flight, anxiety, panic) or hypo-arousal (freeze, numb, depression). Knowing your window helps you identify when you need upregulation (movement) or downregulation (breathing) tools.',
      description: 'Learn to map your nervous system and understand why you feel hyper or numb.',
      duration: 300,
      difficulty: 'Intermediate',
      intensityLevel: DifficultyLevel.INTERMEDIATE,
      tags: 'psychology,trauma,window-of-tolerance',
      focusAreas: JSON.stringify(['Self-Awareness', 'Trauma', 'Anxiety']),
      immediateRelief: false,
      crisisEligible: false,
      timeOfDay: JSON.stringify(['morning', 'afternoon']),
      environment: JSON.stringify(['home', 'work', 'public']),
      culturalContext: 'Global/Clinical',
      hasSubtitles: false,
      completions: 0,
      averageRating: 4.8,
      effectiveness: 8.5
    },
    // 2. Story (Eastern, Beginner, Bedtime)
    {
      title: 'The Empty Boat: An Eastern Parable',
      type: 'story',
      contentType: ContentType.STORY,
      category: 'Mindfulness',
      approach: 'eastern',
      content: 'A man is crossing a river in a small boat. Suddenly, another boat crashes into his. He yells in anger, "Watch where you are going!" But as the mist clears, he sees the other boat is completely empty. It just drifted into him. His anger immediately dissolves into laughter. The world is often the empty boat—things just happen. It is our projection of a ""driver"" that creates our anger.',
      description: 'An ancient Zen story to reframe anger and interpersonal conflicts.',
      duration: 180,
      difficulty: 'Beginner',
      intensityLevel: DifficultyLevel.BEGINNER,
      tags: 'story,zen,anger,perspective',
      focusAreas: JSON.stringify(['Anger', 'Conflict', 'Stress']),
      immediateRelief: true,
      crisisEligible: false,
      timeOfDay: JSON.stringify(['evening', 'night']),
      environment: JSON.stringify(['home']),
      culturalContext: 'Zen Buddhism',
      hasSubtitles: false,
      completions: 0,
      averageRating: 4.9,
      effectiveness: 9.0
    },
    // 3. CBT Worksheet (Western, Intermediate)
    {
      title: 'Cognitive Behavioral Thought Record',
      type: 'cbt_worksheet',
      contentType: ContentType.CBT_WORKSHEET,
      category: 'Therapy Workbook',
      approach: 'western',
      content: '1. Situation: What triggered the thought? \n2. Emotion: What did I feel? (Rate 1-100) \n3. Automatic Thought: What was going through my mind? \n4. Evidence For: What facts support this thought? \n5. Evidence Against: What facts contradict it? \n6. Alternative Thought: What is a more balanced way to look at this? \n7. Re-rate Emotion: How do I feel now? (Rate 1-100)',
      description: 'The golden standard CBT worksheet for restructuring negative, distorted thinking.',
      duration: 600,
      difficulty: 'Intermediate',
      intensityLevel: DifficultyLevel.INTERMEDIATE,
      tags: 'cbt,worksheet,depression',
      focusAreas: JSON.stringify(['Depression', 'Negative-Thinking', 'Self-Esteem']),
      immediateRelief: false,
      crisisEligible: false,
      timeOfDay: JSON.stringify(['morning', 'afternoon', 'evening']),
      environment: JSON.stringify(['home']),
      culturalContext: 'Clinical',
      hasSubtitles: false,
      completions: 0
    },
    // 4. Mindfulness Exercise (Hybrid, Beginner, Crisis Eligible)
    {
      title: 'Ice Water / Dive Reflex Activation',
      type: 'mindfulness_exercise',
      contentType: ContentType.MINDFULNESS_EXERCISE,
      category: 'Crisis Intervention',
      approach: 'hybrid',
      content: 'In moments of intense emotional distress or severe panic, you need a physiological circuit breaker. \nStep 1: Fill a bowl with cold water and ice cubes.\nStep 2: Take a deep breath.\nStep 3: Submerge your face (or place an ice pack on your eyes/cheeks) for 15-30 seconds.\nStep 4: Notice the immediate drop in heart rate. This triggers the Mammalian Dive Reflex, instantly down-regulating the parasympathetic nervous system.',
      description: 'A DBT-based distress tolerance skill using temperature to halt panic.',
      duration: 60,
      difficulty: 'Beginner',
      intensityLevel: DifficultyLevel.BEGINNER,
      tags: 'dbt,crisis,panic-attack,ice',
      focusAreas: JSON.stringify(['Panic', 'Self-Harm Urges', 'Extreme-Anger']),
      immediateRelief: true,
      crisisEligible: true,
      timeOfDay: JSON.stringify(['morning', 'afternoon', 'evening', 'night']),
      environment: JSON.stringify(['home']),
      culturalContext: 'DBT Therapy',
      hasSubtitles: false,
      completions: 0
    },
    // 5. Journal Prompt (Western, Beginner, Morning)
    {
      title: 'Morning Intentions & Boundary Setting',
      type: 'journal_prompt',
      contentType: ContentType.JOURNAL_PROMPT,
      category: 'Self-Reflection',
      approach: 'western',
      content: '1. What is one overarching feeling I want to cultivate today? \n2. What is one realistic boundary I need to enforce to protect that feeling? (e.g., "I will close my laptop at 6 PM" or "I will not answer texts while eating".)',
      description: 'Set your compass for the day by identifying emotional goals and protective boundaries.',
      duration: 300,
      difficulty: 'Beginner',
      intensityLevel: DifficultyLevel.BEGINNER,
      tags: 'journal,morning,boundaries',
      focusAreas: JSON.stringify(['Productivity', 'Self-Care', 'Relationships']),
      immediateRelief: false,
      crisisEligible: false,
      timeOfDay: JSON.stringify(['morning']),
      environment: JSON.stringify(['home', 'work']),
      culturalContext: 'Contemporary Wellness',
      hasSubtitles: false,
      completions: 0
    },
    // 6. Audio Meditation (Eastern, Advanced)
    {
      title: 'Yoga Nidra for Deep Rest',
      type: 'audio_meditation',
      contentType: ContentType.AUDIO_MEDITATION,
      category: 'Sleep',
      approach: 'eastern',
      content: '(Audio Track Script): "Welcome to Yoga Nidra, the state of dynamic sleep. Settle into Savasana. Close your eyes. We will rotate consciousness rapidly. Right thumb, right index finger, middle finger... Notice the heaviness of the body, sinking into the earth... you are awake and relaxed..."',
      description: 'A 45-minute guided meditation that mimics the restorative properties of multiple hours of REM sleep.',
      duration: 2700,
      difficulty: 'Advanced',
      intensityLevel: DifficultyLevel.ADVANCED,
      tags: 'yoga-nidra,nsdr,sleep,rest',
      focusAreas: JSON.stringify(['Insomnia', 'Burnout', 'Exhaustion']),
      immediateRelief: false,
      crisisEligible: false,
      timeOfDay: JSON.stringify(['afternoon', 'night']),
      environment: JSON.stringify(['home']),
      culturalContext: 'Tantric Yoga',
      hasSubtitles: true,
      completions: 0
    }
  ];

  for (const practice of practices) {
    const created = await prisma.practice.create({
      data: practice
    });
    console.log(`Created Practice: ${created.title}`);
  }
  
  for (const content of contents) {
    const created = await prisma.content.create({
      data: content
    });
    console.log(`Created Content: ${created.title}`);
  }

  console.log('--- SEEDING COMPLETE ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });