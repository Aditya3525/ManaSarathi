import { PrismaClient, PracticeCategory, ContentType, DifficultyLevel } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Master Varieties - Batch 2...');

  // --- PRACTICES DATA (Batch 2) ---
  const practices = [
    // 8. Mindfulness (Hybrid, Text, Intermediate)
    {
      title: 'Mindful Walking Exercise',
      type: 'mindfulness',
      category: PracticeCategory.MINDFULNESS,
      duration: 20,
      difficulty: 'Intermediate',
      intensityLevel: DifficultyLevel.INTERMEDIATE,
      approach: 'Hybrid',
      format: 'Text',
      description: 'Turn your commute or evening stroll into an active mindfulness practice by focusing entirely on the sensory aspects of walking.',
      instructions: 'Walk at a natural pace. Notice the shift of weight from heel to toe. Feel the air against your skin. When thoughts drift, bring them back to your footsteps.',
      benefits: 'Combines light physical activity with mental grounding, reducing scattered thoughts.',
      precautions: 'Stay aware of your surroundings and traffic.',
      focusAreas: JSON.stringify(['Stress', 'Distraction', 'ADHD']),
      immediateRelief: false,
      tags: 'walking,mindfulness,movement,nature'
    },
    // 9. Journaling (Western, Text, Beginner)
    {
      title: 'Stream of Consciousness / Morning Pages',
      type: 'journaling',
      category: PracticeCategory.JOURNALING,
      duration: 15,
      difficulty: 'Beginner',
      intensityLevel: DifficultyLevel.BEGINNER,
      approach: 'Western',
      format: 'Text/Interactive',
      description: 'Write continuously for 15 minutes or 3 pages without stopping, editing, or filtering.',
      instructions: 'Open your notebook. Put pen to paper. Do not stop writing, even if you just write "I don\'t know what to write" until something else emerges.',
      benefits: 'Clears the mental cache, uncovers hidden anxieties, boosts creativity.',
      precautions: 'Keep the pages private to ensure you write honestly.',
      focusAreas: JSON.stringify(['Anxiety', 'Creativity', 'Overthinking']),
      immediateRelief: true,
      tags: 'journaling,morning-pages,brain-dump'
    },
    // 10. Self-Reflection (Western, Video/Text, Advanced)
    {
      title: 'Core Values Audit',
      type: 'self_reflection',
      category: PracticeCategory.SELF_REFLECTION,
      duration: 45,
      difficulty: 'Advanced',
      intensityLevel: DifficultyLevel.ADVANCED,
      approach: 'Western',
      format: 'Video/Text',
      description: 'A deep-dive exercise into identifying your top 5 core values and seeing where your current life aligns or misaligns with them.',
      instructions: 'Review the provided list of 100 values. Narrow it to 10. Then 5. Next to each, rate how well you are honoring this value today (1-10).',
      benefits: 'Restores a sense of purpose, explains chronic frustrations caused by misaligned living.',
      precautions: 'Can trigger feelings of regret if misalignment is high.',
      focusAreas: JSON.stringify(['Purpose', 'Life-Transition', 'Depression']),
      immediateRelief: false,
      tags: 'values,audit,meaning,purpose'
    }
  ];

  // --- CONTENT LIBRARY DATA (Batch 2) ---
  const contents = [
    // 7. Video (Western, Advanced, Multi-Environment)
    {
      title: 'The Polyvagal Theory in Practice',
      type: 'video',
      contentType: ContentType.VIDEO,
      category: 'Therapeutic Education',
      approach: 'western',
      content: 'https://youtube.com/watch?placeholder_polyvagal', // Placeholder URL
      description: 'An advanced animated breakdown of the autonomic nervous system detailing the dorsal vagal shutdown and ventral vagal safety states.',
      duration: 1200,
      difficulty: 'Advanced',
      intensityLevel: DifficultyLevel.ADVANCED,
      tags: 'video,polyvagal,nervous-system,trauma',
      focusAreas: JSON.stringify(['Trauma', 'Chronic-Freeze', 'Depression']),
      immediateRelief: false,
      crisisEligible: false,
      timeOfDay: JSON.stringify(['morning', 'afternoon']),
      environment: JSON.stringify(['home', 'work']),
      culturalContext: 'Neuroscience',
      hasSubtitles: true,
      completions: 0,
      averageRating: 4.7,
      youtubeUrl: 'https://youtube.com/watch?placeholder_polyvagal'
    },
    // 8. Yoga Sequence (Eastern, Beginner, Morning)
    {
      title: 'Sun Salutation A (Surya Namaskar)',
      type: 'yoga_sequence',
      contentType: ContentType.YOGA_SEQUENCE,
      category: 'Movement',
      approach: 'eastern',
      content: '1. Mountain Pose (Tadasana)\n2. Upward Salute (Urdhva Hastasana)\n3. Standing Forward Bend (Uttanasana)\n4. Half Forward Bend (Ardha Uttanasana)\n5. Plank Pose\n6. Chaturanga Dandasana\n7. Upward-Facing Dog (Urdhva Mukha Svanasana)\n8. Downward-Facing Dog (Adho Mukha Svanasana)\nReturn to start.',
      description: 'A traditional 12-step sequence linking breath with movement to generate heat and wake up the body.',
      duration: 600,
      difficulty: 'Beginner',
      intensityLevel: DifficultyLevel.BEGINNER,
      tags: 'yoga,morning,flow,energy',
      focusAreas: JSON.stringify(['Lethargy', 'Physical Tension', 'Focus']),
      immediateRelief: true,
      crisisEligible: false,
      timeOfDay: JSON.stringify(['morning']),
      environment: JSON.stringify(['home', 'nature']),
      culturalContext: 'Traditional Yoga',
      hasSubtitles: false,
      completions: 0
    },
    // 9. Article (Hybrid, Beginner)
    {
      title: 'The Link Between Gut Health and Anxiety',
      type: 'article',
      contentType: ContentType.ARTICLE,
      category: 'Health & Nutrition',
      approach: 'hybrid',
      content: 'The gut-brain axis is a bidirectional communication network. Over 90% of serotonin is produced in the gut. Eastern traditions like Ayurveda have emphasized digestive fire (Agni) for thousands of years, which Western science now corroborates through microbiome research. Eating fermented foods, reducing extreme sugars, and practicing mindful eating can directly reduce baseline anxiety.',
      description: 'Explore the fascinating connection between what you eat and how you feel.',
      duration: 400,
      difficulty: 'Beginner',
      intensityLevel: DifficultyLevel.BEGINNER,
      tags: 'health,gut-brain,anxiety,nutrition',
      focusAreas: JSON.stringify(['Anxiety', 'Digestive Issues', 'General-Health']),
      immediateRelief: false,
      crisisEligible: false,
      timeOfDay: JSON.stringify(['morning', 'afternoon', 'evening']),
      environment: JSON.stringify(['home', 'public']),
      culturalContext: 'Western Medicine & Ayurveda',
      hasSubtitles: false,
      completions: 0
    },
    // 10. Breathing Exercise (Western, Beginner, Crisis)
    {
      title: '4-7-8 Sleep Breathing',
      type: 'breathing_exercise',
      contentType: ContentType.BREATHING_EXERCISE,
      category: 'Sleep Hygiene',
      approach: 'western',
      content: 'The 4-7-8 breathing technique acts as a natural tranquilizer for the nervous system. \n1. Exhale completely through your mouth, making a whoosh sound. \n2. Close your mouth and inhale quietly through your nose to a mental count of 4. \n3. Hold your breath for a count of 7. \n4. Exhale completely through your mouth, making a whoosh sound to a count of 8. \n5. Repeat the cycle 4 times.',
      description: 'Dr. Andrew Weil\'s famous technique to bring immediate calm and induce sleep.',
      duration: 120,
      difficulty: 'Beginner',
      intensityLevel: DifficultyLevel.BEGINNER,
      tags: 'breathing,4-7-8,insomnia,quick-relief',
      focusAreas: JSON.stringify(['Insomnia', 'Panic', 'Restlessness']),
      immediateRelief: true,
      crisisEligible: true,
      timeOfDay: JSON.stringify(['evening', 'night']),
      environment: JSON.stringify(['home']),
      culturalContext: 'Clinical/Integrative Medicine',
      hasSubtitles: false,
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

  console.log('--- BATCH 2 SEEDING COMPLETE ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });