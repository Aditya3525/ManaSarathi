import path from 'path';
import dotenv from 'dotenv';
import {
  ContentType,
  DifficultyLevel,
  PracticeCategory,
  Prisma,
  PrismaClient
} from '@prisma/client';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const databaseUrl = (process.env.DATABASE_URL || '').trim();
if (databaseUrl.startsWith('file:')) {
  const rawPath = databaseUrl.slice('file:'.length);
  if (rawPath.startsWith('./') || rawPath.startsWith('../')) {
    process.env.DATABASE_URL = `file:${path.resolve(__dirname, '..', rawPath).replace(/\\/g, '/')}`;
  }
}

const prisma = new PrismaClient();

const json = (value: unknown) => JSON.stringify(value);
const thumb = (label: string) =>
  `https://placehold.co/640x360/e0f2fe/0f172a?text=${encodeURIComponent(label)}`;

const NOTE =
  'Seeded by seed-admin-catalog.ts after inspecting admin PracticeForm and ContentForm variations. Source links are educational references; replace or review before public launch.';

type PracticeTemplate = {
  category: PracticeCategory;
  type: string;
  approach: 'Western' | 'Eastern' | 'Hybrid';
  format: 'Audio' | 'Video';
  focusAreas: string[];
  titles: [string, string, string];
  sourceName: string;
  sourceUrl: string;
  baseDescription: string;
  equipment?: string[];
};

const practiceTemplates: PracticeTemplate[] = [
  {
    category: PracticeCategory.MEDITATION,
    type: 'meditation',
    approach: 'Eastern',
    format: 'Audio',
    focusAreas: ['mindfulness', 'stress', 'self-compassion'],
    titles: ['Breath Awareness Meditation', 'Loving Kindness Meditation', 'Working With Difficulties Meditation'],
    sourceName: 'UCLA Mindful',
    sourceUrl: 'https://www.uclahealth.org/uclamindful/health-and-wellness-meditations',
    baseDescription: 'Guided meditation practice for present-moment awareness and emotional steadiness.'
  },
  {
    category: PracticeCategory.YOGA,
    type: 'yoga',
    approach: 'Eastern',
    format: 'Video',
    focusAreas: ['movement', 'stress', 'body-awareness'],
    titles: ['Gentle Morning Yoga Flow', 'Restorative Evening Yoga', 'Chair Yoga Reset'],
    sourceName: 'Dartmouth Student Wellness Center',
    sourceUrl: 'https://students.dartmouth.edu/wellness-center/wellness-mindfulness/mindfulness-meditation',
    baseDescription: 'Gentle movement sequence supporting body awareness, flexibility, and nervous-system regulation.',
    equipment: ['yoga mat or chair']
  },
  {
    category: PracticeCategory.BREATHING,
    type: 'breathing',
    approach: 'Western',
    format: 'Audio',
    focusAreas: ['anxiety', 'stress', 'panic'],
    titles: ['Calming Breathing for Stress', 'Box Breathing Reset', 'Long Exhale Breathing'],
    sourceName: 'NHS',
    sourceUrl: 'https://www.nhs.uk/conditions/stress-anxiety-depression/ways-relieve-stress/',
    baseDescription: 'Short breath-regulation practice for stress, anxiety, and everyday panic sensations.'
  },
  {
    category: PracticeCategory.MINDFULNESS,
    type: 'mindfulness',
    approach: 'Hybrid',
    format: 'Audio',
    focusAreas: ['mindfulness', 'focus', 'stress'],
    titles: ['Three Minute Breathing Space', 'Body Scan Practice', 'Mindful Walking Practice'],
    sourceName: 'VA Portland Mindfulness Institute',
    sourceUrl: 'https://www.va.gov/portland-health-care/programs/whole-health/mindfulness-institute-resources/',
    baseDescription: 'Mindfulness exercise for noticing breath, body, thoughts, and surroundings with less judgment.'
  },
  {
    category: PracticeCategory.JOURNALING,
    type: 'journaling',
    approach: 'Western',
    format: 'Audio',
    focusAreas: ['reflection', 'mood', 'self-awareness'],
    titles: ['Three Good Things Journal', 'Mood and Trigger Reflection', 'Self-Compassion Letter'],
    sourceName: 'Greater Good in Action',
    sourceUrl: 'https://ggia.berkeley.edu/',
    baseDescription: 'Structured reflective writing prompt for emotional clarity and meaning-making.',
    equipment: ['journal or notes app']
  },
  {
    category: PracticeCategory.CBT_TECHNIQUE,
    type: 'cbt_technique',
    approach: 'Western',
    format: 'Audio',
    focusAreas: ['cbt', 'anxiety', 'overthinking'],
    titles: ['CBT Thought Record', 'Worry Tree Practice', 'Behavioral Activation Planner'],
    sourceName: 'Psychology Tools',
    sourceUrl: 'https://www.psychologytools.com/self-help/anxiety/',
    baseDescription: 'CBT-informed skill for examining thoughts, worries, behavior patterns, and balanced alternatives.',
    equipment: ['journal or worksheet']
  },
  {
    category: PracticeCategory.GROUNDING_EXERCISE,
    type: 'grounding_exercise',
    approach: 'Hybrid',
    format: 'Audio',
    focusAreas: ['grounding', 'panic', 'overwhelm'],
    titles: ['5-4-3-2-1 Sensory Grounding', 'Feet on the Floor Grounding', 'Name and Notice Grounding'],
    sourceName: 'World Health Organization',
    sourceUrl: 'https://www.who.int/news-room/questions-and-answers/item/stress',
    baseDescription: 'Present-moment grounding practice for stress, panic, or emotional overwhelm.'
  },
  {
    category: PracticeCategory.SELF_REFLECTION,
    type: 'self_reflection',
    approach: 'Hybrid',
    format: 'Audio',
    focusAreas: ['values', 'identity', 'goals'],
    titles: ['Values Check-In', 'Needs and Boundaries Reflection', 'Strengths Reflection'],
    sourceName: 'WHO stress management guide',
    sourceUrl: 'https://iris.who.int/bitstream/handle/10665/331901/9789240011670-eng.pdf',
    baseDescription: 'Reflective practice for identifying values, needs, strengths, and next helpful actions.',
    equipment: ['journal or notes app']
  },
  {
    category: PracticeCategory.MOVEMENT,
    type: 'movement',
    approach: 'Hybrid',
    format: 'Video',
    focusAreas: ['movement', 'energy', 'stress'],
    titles: ['Mindful Stretch Break', 'Tension Release Movement', 'Five Minute Energy Walk'],
    sourceName: 'Mind',
    sourceUrl: 'https://www.mind.org.uk/information-support/tips-for-everyday-living/physical-activity-and-your-mental-health/',
    baseDescription: 'Low-intensity movement practice designed to support mood, energy, and stress release.',
    equipment: ['comfortable space']
  },
  {
    category: PracticeCategory.SLEEP_HYGIENE,
    type: 'sleep',
    approach: 'Western',
    format: 'Audio',
    focusAreas: ['sleep', 'relaxation', 'routine'],
    titles: ['Progressive Muscle Relaxation for Sleep', 'Sleep Hygiene Wind Down', 'Body Scan for Sleep'],
    sourceName: 'NIMH',
    sourceUrl: 'https://www.nimh.nih.gov/health/topics/caring-for-your-mental-health',
    baseDescription: 'Evening routine or relaxation practice to lower arousal and prepare for sleep.'
  }
];

const practiceVideoIdsByCategory: Partial<Record<PracticeCategory, string[]>> = {
  [PracticeCategory.YOGA]: ['hJbRpHZr_d0', 'tD_l3fDTFyg', 'r0jxM7oo0Xg'],
  [PracticeCategory.MOVEMENT]: ['FuEcLeNQe2Q', 'QjP9UGWxTLM', '3cXGt2d1RyQ']
};

function buildPractices(): Prisma.PracticeUncheckedCreateInput[] {
  return practiceTemplates.flatMap((template) =>
    template.titles.map((title, index) => {
      const immediateCategories: PracticeCategory[] = [
        PracticeCategory.BREATHING,
        PracticeCategory.GROUNDING_EXERCISE,
        PracticeCategory.MOVEMENT
      ];
      const isImmediate = immediateCategories.includes(template.category);
      const duration = template.category === PracticeCategory.YOGA ? [10, 20, 8][index] : [5, 10, 15][index];
      const intensity = index === 0 ? DifficultyLevel.BEGINNER : index === 1 ? DifficultyLevel.INTERMEDIATE : DifficultyLevel.ADVANCED;
      const difficulty = index === 0 ? 'Beginner' : index === 1 ? 'Intermediate' : 'Advanced';

      return {
        id: `admin-practice-${template.category.toLowerCase()}-${index + 1}`,
        title,
        type: template.type,
        category: template.category,
        duration,
        difficulty,
        intensityLevel: intensity,
        approach: template.approach,
        format: template.type === 'sleep' ? 'Audio' : template.format,
        description: `${template.baseDescription} (${difficulty})`,
        audioUrl:
          template.format === 'Audio' || template.type === 'sleep'
            ? template.sourceUrl
            : null,
        videoUrl: null,
        youtubeUrl: template.format === 'Video' && template.type !== 'sleep'
          ? practiceVideoIdsByCategory[template.category]?.[index] ?? null
          : null,
        thumbnailUrl: thumb(title),
        tags: [template.type, template.category.toLowerCase(), ...template.focusAreas, difficulty.toLowerCase()].join(','),
        instructions: json([
          'Choose a quiet enough setting and settle your body.',
          `Follow the ${title.toLowerCase()} guidance at a comfortable pace.`,
          'Pause or stop if distress increases.',
          'Close by naming one useful observation from the practice.'
        ]),
        benefits: 'Can support emotional regulation, self-awareness, and repeatable coping skills when practiced regularly.',
        precautions: 'Educational wellness practice only. Use professional or crisis support for severe symptoms or immediate danger.',
        focusAreas: json(template.focusAreas),
        immediateRelief: isImmediate || index === 0,
        crisisEligible: template.category === PracticeCategory.BREATHING || template.category === PracticeCategory.GROUNDING_EXERCISE,
        requiredEquipment: json(template.equipment ?? []),
        environment: json(index === 2 ? ['home', 'work', 'public'] : ['home']),
        timeOfDay: json(template.type === 'sleep' ? ['evening', 'night'] : ['morning', 'afternoon', 'evening']),
        sensoryEngagement: json(template.format === 'Video' ? ['visual', 'movement', 'breath'] : ['audio', 'breath', 'body']),
        steps: json([
          { step: 1, instruction: 'Prepare your space and check comfort.', duration: 1 },
          { step: 2, instruction: `Practice ${title}.`, duration: Math.max(duration - 2, 1) },
          { step: 3, instruction: 'Reflect briefly and transition slowly.', duration: 1 }
        ]),
        contraindications: json(['Stop if symptoms worsen', 'Seek professional support for severe or persistent distress']),
        isPublished: true,
        sourceName: template.sourceName,
        sourceUrl: template.sourceUrl,
        confidence: 0.88,
        notes: NOTE
      };
    })
  );
}

type ContentTemplate = {
  contentType: ContentType;
  type: 'video' | 'audio' | 'article' | 'playlist' | 'story';
  category: string;
  approach: 'western' | 'eastern' | 'hybrid';
  titles: [string, string, string];
  sourceName: string;
  sourceUrl: string;
  description: string;
};

const contentTemplates: ContentTemplate[] = [
  {
    contentType: ContentType.VIDEO,
    type: 'video',
    category: 'Anxiety',
    approach: 'western',
    titles: ['Anxiety Disorders in Adults', 'Depression Mental Health Minute', 'Understanding Panic Symptoms'],
    sourceName: 'National Institute of Mental Health',
    sourceUrl: 'https://www.nimh.nih.gov/news/media/2021/mental-health-minute-anxiety-disorders-in-adults',
    description: 'Short educational video resource from a public mental health authority.'
  },
  {
    contentType: ContentType.AUDIO_MEDITATION,
    type: 'audio',
    category: 'Mindfulness',
    approach: 'hybrid',
    titles: ['Body Scan Audio Meditation', 'Loving Kindness Audio Meditation', 'Breath Sound Body Meditation'],
    sourceName: 'UCLA Mindful',
    sourceUrl: 'https://www.uclahealth.org/uclamindful/health-and-wellness-meditations',
    description: 'Guided audio meditation from UCLA Mindful for awareness and emotional regulation.'
  },
  {
    contentType: ContentType.BREATHING_EXERCISE,
    type: 'article',
    category: 'Stress Management',
    approach: 'western',
    titles: ['Calming Breathing Technique', 'Breathing for Hyperventilation Awareness', 'Breath as an Attention Anchor'],
    sourceName: 'NHS',
    sourceUrl: 'https://www.nhs.uk/conditions/stress-anxiety-depression/ways-relieve-stress/',
    description: 'Breathing exercise guidance for stress, anxiety, or panic symptoms.'
  },
  {
    contentType: ContentType.ARTICLE,
    type: 'article',
    category: 'Anxiety',
    approach: 'western',
    titles: ['Anxiety Disorders Overview', 'Depression Overview', 'Panic Disorder Overview'],
    sourceName: 'National Institute of Mental Health',
    sourceUrl: 'https://www.nimh.nih.gov/health/topics/anxiety-disorders',
    description: 'Public mental health education article covering signs, symptoms, support, and treatment options.'
  },
  {
    contentType: ContentType.STORY,
    type: 'story',
    category: 'Emotional Intelligence',
    approach: 'eastern',
    titles: ['The Empty Boat Reflection', 'Two Arrows Reflection', 'The Guest House Reflection'],
    sourceName: 'In-app editorial synthesis',
    sourceUrl: 'https://www.who.int/news-room/questions-and-answers/item/stress',
    description: 'Brief reflective story for perspective-taking, acceptance, and emotional awareness.'
  },
  {
    contentType: ContentType.JOURNAL_PROMPT,
    type: 'article',
    category: 'Emotional Intelligence',
    approach: 'hybrid',
    titles: ['Three Good Things Prompt', 'Mood and Trigger Journal Prompt', 'Needs and Boundaries Prompt'],
    sourceName: 'Greater Good in Action',
    sourceUrl: 'https://ggia.berkeley.edu/',
    description: 'Structured journaling prompt for self-awareness, gratitude, and emotional clarity.'
  },
  {
    contentType: ContentType.CBT_WORKSHEET,
    type: 'article',
    category: 'Anxiety',
    approach: 'western',
    titles: ['CBT Thought Record Worksheet', 'Worry Time Worksheet', 'Behavioral Activation Worksheet'],
    sourceName: 'Psychology Tools',
    sourceUrl: 'https://www.psychologytools.com/self-help/anxiety/',
    description: 'CBT-informed worksheet for thoughts, worries, avoidance, and behavior change.'
  },
  {
    contentType: ContentType.YOGA_SEQUENCE,
    type: 'article',
    category: 'Relaxation',
    approach: 'eastern',
    titles: ['Gentle Chair Yoga Sequence', 'Restorative Evening Yoga Sequence', 'Morning Mobility Yoga Sequence'],
    sourceName: 'Dartmouth Student Wellness Center',
    sourceUrl: 'https://students.dartmouth.edu/wellness-center/wellness-mindfulness/mindfulness-meditation',
    description: 'Gentle yoga sequence for relaxation, movement, and mindful body awareness.'
  },
  {
    contentType: ContentType.MINDFULNESS_EXERCISE,
    type: 'audio',
    category: 'Mindfulness',
    approach: 'hybrid',
    titles: ['Three Minute Breathing Space', 'Mindful Walking Exercise', 'Body Awareness Exercise'],
    sourceName: 'VA Portland Mindfulness Institute',
    sourceUrl: 'https://www.va.gov/portland-health-care/programs/whole-health/mindfulness-institute-resources/',
    description: 'Brief mindfulness practice for grounding and present-moment awareness.'
  },
  {
    contentType: ContentType.PSYCHOEDUCATION,
    type: 'article',
    category: 'Stress Management',
    approach: 'western',
    titles: ['Doing What Matters in Times of Stress', 'Caring for Your Mental Health', 'Understanding Perceived Stress'],
    sourceName: 'World Health Organization',
    sourceUrl: 'https://iris.who.int/bitstream/handle/10665/331901/9789240011670-eng.pdf',
    description: 'Psychoeducation resource explaining stress, coping skills, and help-seeking.'
  },
  {
    contentType: ContentType.CRISIS_RESOURCE,
    type: 'article',
    category: 'Stress Management',
    approach: 'hybrid',
    titles: ['When to Seek Urgent Help', 'Crisis Grounding and Safety Steps', 'How to Support Someone in Crisis'],
    sourceName: '988 Suicide & Crisis Lifeline',
    sourceUrl: 'https://988lifeline.org/',
    description: 'Crisis-oriented education and safety guidance. Not a substitute for emergency services.'
  }
];

const contentVideoByIndex = [
  {
    id: 'UjPRVKS4OBg',
    title: 'Mental Health Minute: Anxiety Disorders in Adults',
    sourceName: 'National Institute of Mental Health',
    sourceUrl: 'https://www.nimh.nih.gov/news/media/2021/mental-health-minute-anxiety-disorders-in-adults'
  },
  {
    id: 'lQhpetkwWnM',
    title: 'Mental Health Minute: Depression',
    sourceName: 'National Institute of Mental Health',
    sourceUrl: 'https://www.nimh.nih.gov/news/media/2020/depression-mental-health-minute'
  },
  {
    id: 'wr4N-SdekqY',
    title: 'Mental Health Minute: Stress and Anxiety in Adolescents',
    sourceName: 'National Institute of Mental Health',
    sourceUrl: 'https://www.youtube.com/watch?v=wr4N-SdekqY'
  }
];

function bodyForContent(template: ContentTemplate, title: string) {
  if (template.type === 'story') {
    return `${title}\n\nRead the story slowly. Notice the emotion it brings up, the interpretation your mind adds, and one gentler way to respond. This is a reflective wellness exercise, not clinical advice.`;
  }
  if (template.contentType === ContentType.JOURNAL_PROMPT) {
    return `Prompt: ${title}\n\n1. What am I noticing right now?\n2. What emotion or need is underneath it?\n3. What is one small action that would support me today?`;
  }
  if (template.contentType === ContentType.CBT_WORKSHEET) {
    return `Worksheet: ${title}\n\nSituation:\nEmotion intensity:\nAutomatic thought:\nEvidence for:\nEvidence against:\nBalanced alternative:\nNext helpful action:`;
  }
  if (template.contentType === ContentType.YOGA_SEQUENCE) {
    return `Sequence: ${title}\n\nMove gently, pair movement with breath, and stop for pain or dizziness. Suggested flow: arrive, warm up, complete three to five gentle postures, rest, and reflect.`;
  }
  return template.sourceUrl;
}

function buildContents(): Prisma.ContentUncheckedCreateInput[] {
  return contentTemplates.flatMap((template) =>
    template.titles.map((title, index) => {
      const intensity = index === 0 ? DifficultyLevel.BEGINNER : index === 1 ? DifficultyLevel.INTERMEDIATE : DifficultyLevel.ADVANCED;
      const difficulty = index === 0 ? 'Beginner' : index === 1 ? 'Intermediate' : 'Advanced';
      const duration = template.type === 'video' ? [2, 3, 5][index] : template.type === 'audio' ? [5, 10, 15][index] : [6, 10, 14][index];
      const isCrisis = template.contentType === ContentType.CRISIS_RESOURCE;
      const video = template.contentType === ContentType.VIDEO ? contentVideoByIndex[index] : null;

      return {
        id: `admin-content-${template.contentType.toLowerCase()}-${index + 1}`,
        title: video?.title ?? title,
        type: template.type,
        contentType: template.contentType,
        category: template.category,
        approach: template.approach,
        content: video ? `https://www.youtube.com/watch?v=${video.id}` : bodyForContent(template, title),
        description: `${template.description} (${difficulty})`,
        youtubeUrl: video?.id ?? null,
        thumbnailUrl: video ? `https://img.youtube.com/vi/${video.id}/hqdefault.jpg` : thumb(title),
        duration,
        difficulty,
        intensityLevel: intensity,
        tags: [template.type, template.contentType.toLowerCase(), template.category.toLowerCase(), difficulty.toLowerCase()].join(','),
        focusAreas: json([template.category.toLowerCase(), template.contentType.toLowerCase().replace(/_/g, '-')]),
        immediateRelief:
          isCrisis ||
          template.contentType === ContentType.BREATHING_EXERCISE ||
          template.contentType === ContentType.MINDFULNESS_EXERCISE,
        crisisEligible: isCrisis || template.contentType === ContentType.BREATHING_EXERCISE,
        timeOfDay: json(['morning', 'afternoon', 'evening']),
        environment: json(['home', 'work']),
        culturalContext: template.approach === 'eastern' ? 'Eastern contemplative tradition' : 'Public health and clinical education',
        hasSubtitles: template.type === 'video',
        transcript: template.type === 'video' ? `${video?.title ?? title}: short educational video summary and reflection notes.` : null,
        completions: 0,
        averageRating: 4.6 + index * 0.1,
        effectiveness: 7.8 + index * 0.2,
        isPublished: true,
        sourceName: video?.sourceName ?? template.sourceName,
        sourceUrl: video?.sourceUrl ?? template.sourceUrl,
        confidence: template.sourceName.includes('In-app') ? 0.72 : 0.9,
        notes: NOTE
      };
    })
  );
}

async function clearCurrentCatalog() {
  await prisma.contentEngagement.deleteMany();
  await prisma.content.deleteMany();
  await prisma.practice.deleteMany();
  console.log('Removed existing content engagement, content, and practice rows.');
}

async function seedCatalog() {
  const practices = buildPractices();
  const contents = buildContents();

  await prisma.practice.createMany({ data: practices });
  await prisma.content.createMany({ data: contents });

  console.log(`Created ${practices.length} practices across ${practiceTemplates.length} admin categories.`);
  console.log(`Created ${contents.length} content items across ${contentTemplates.length} admin content types.`);
}

export async function seedAdminCatalog() {
  console.log('Replacing admin practice/content catalog...');
  await clearCurrentCatalog();
  await seedCatalog();
  console.log('Admin catalog seed complete.');
}

if (require.main === module) {
  seedAdminCatalog()
    .catch((error) => {
      console.error('Admin catalog seed failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
