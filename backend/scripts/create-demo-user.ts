import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createDemoUser() {
  console.log('🎭 Creating comprehensive demo user data...\n');

  try {
    // 1. Create Demo User
    console.log('👤 Creating demo user...');
    const hashedPassword = await bcrypt.hash('Demo@123', 10);
    
    const demoUser = await prisma.user.upsert({
      where: { email: 'demo@mentalwellness.app' },
      update: {
        password: hashedPassword,
        isEmailVerified: true,
      },
      create: {
        email: 'demo@mentalwellness.app',
        name: 'Sarah Mitchell',
        password: hashedPassword,
        isEmailVerified: true,
        firstName: 'Sarah',
        lastName: 'Mitchell',
        isOnboarded: true,
        approach: 'hybrid',
        birthday: new Date('1995-06-15'),
        gender: 'Female',
        region: 'North America',
        language: 'en',
        emergencyContact: 'John Mitchell',
        emergencyPhone: '+1-555-0123',
        dataConsent: true,
        clinicianSharing: false,
      }
    });
    console.log(`✅ Demo user created: ${demoUser.email}\n`);

    // 2. Create Assessment Results (Past Month - Progressive Improvement)
    console.log('📊 Creating assessment history...');
    const now = new Date();
    const assessments = [
      // Week 1 - Initial baseline (higher anxiety/depression)
      { 
        date: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000),
        type: 'anxiety_gad7',
        score: 75.0,
        responses: JSON.stringify([3, 3, 2, 3, 2, 3, 3]) // Severe anxiety
      },
      {
        date: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000),
        type: 'depression_phq9',
        score: 72.22,
        responses: JSON.stringify([2, 3, 2, 3, 2, 2, 3, 2, 2]) // Moderately severe depression
      },
      {
        date: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000),
        type: 'stress_pss10',
        score: 77.5,
        responses: JSON.stringify([4, 4, 3, 3, 4, 3, 4, 3, 3, 4]) // High stress
      },
      
      // Week 2 - Slight improvement
      {
        date: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000),
        type: 'anxiety_gad7',
        score: 67.86,
        responses: JSON.stringify([2, 3, 2, 2, 2, 3, 2])
      },
      {
        date: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000),
        type: 'depression_phq9',
        score: 66.67,
        responses: JSON.stringify([2, 2, 2, 3, 2, 2, 2, 2, 2])
      },
      {
        date: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
        type: 'emotional_teique',
        score: 58.33,
        responses: JSON.stringify(Array(30).fill(0).map((_, i) => i % 3 === 0 ? 4 : i % 3 === 1 ? 3 : 5))
      },
      
      // Week 3 - Noticeable progress
      {
        date: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
        type: 'anxiety_gad7',
        score: 53.57,
        responses: JSON.stringify([2, 2, 1, 2, 1, 2, 2])
      },
      {
        date: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
        type: 'depression_phq9',
        score: 55.56,
        responses: JSON.stringify([2, 2, 1, 2, 1, 2, 2, 1, 2])
      },
      {
        date: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000),
        type: 'stress_pss10',
        score: 62.5,
        responses: JSON.stringify([3, 3, 2, 2, 3, 2, 3, 2, 2, 3])
      },
      {
        date: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
        type: 'overthinking_ptq',
        score: 60.0,
        responses: JSON.stringify(Array(15).fill(0).map((_, i) => i % 2 === 0 ? 3 : 2))
      },
      
      // Week 4 - Current week (significant improvement)
      {
        date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        type: 'anxiety_gad7',
        score: 42.86,
        responses: JSON.stringify([1, 2, 1, 1, 1, 2, 1])
      },
      {
        date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        type: 'depression_phq9',
        score: 44.44,
        responses: JSON.stringify([1, 2, 1, 1, 1, 2, 1, 1, 2])
      },
      {
        date: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
        type: 'stress_pss10',
        score: 47.5,
        responses: JSON.stringify([2, 2, 1, 2, 2, 1, 2, 2, 1, 2])
      },
      {
        date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        type: 'personality_mini_ipip',
        score: 68.75,
        responses: JSON.stringify(Array(20).fill(0).map((_, i) => i % 4 + 2))
      },
      {
        date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        type: 'trauma_pcl5',
        score: 35.0,
        responses: JSON.stringify(Array(20).fill(0).map(() => Math.floor(Math.random() * 2)))
      },
      
      // Recent - Today
      {
        date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        type: 'anxiety_gad2',
        score: 33.33,
        responses: JSON.stringify([1, 1])
      },
      {
        date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        type: 'depression_phq2',
        score: 33.33,
        responses: JSON.stringify([1, 1])
      },
    ];

    for (const assessment of assessments) {
      await prisma.assessmentResult.create({
        data: {
          userId: demoUser.id,
          assessmentType: assessment.type,
          score: assessment.score,
          responses: assessment.responses,
          completedAt: assessment.date,
        }
      });
    }
    console.log(`✅ Created ${assessments.length} assessment results\n`);

    // 3. Create Mood Entries (Daily for past month)
    console.log('😊 Creating mood entries...');
    const moods = ['Struggling', 'Anxious', 'Okay', 'Good', 'Great'];
    const moodNotes = [
      'Feeling overwhelmed with work stress',
      'Had a rough day, but trying to stay positive',
      'Practiced mindfulness today, feeling a bit better',
      'Good session with breathing exercises',
      'Really productive day! Feeling accomplished',
      'Some anxiety, but manageable',
      'Meditation helped calm my mind',
      'Grateful for small victories today',
      'Struggling with sleep, feeling tired',
      'Better focus after morning routine',
      'Anxious about upcoming presentation',
      'Yoga session was really helpful',
      'Feeling more balanced lately',
      'Had a breakthrough moment in journaling',
      'Peaceful evening, practiced gratitude',
      'Challenging day but pushed through',
      'Really connecting with the CBT exercises',
      'Feeling hopeful about progress',
      'Great conversation with support system',
      'Noticed I\'m worrying less',
      'Energy levels improving',
      'Proud of how far I\'ve come',
      'Still have tough moments, but coping better',
      'Mindfulness becoming second nature',
      'Feeling centered and calm',
      'Had a setback but recovering faster',
      'Celebrating small wins today',
      'Really noticing the positive changes',
    ];

    const moodEntries = [];
    for (let i = 0; i < 30; i++) {
      const daysAgo = 30 - i;
      // Progressive improvement: more struggling at start, more good/great at end
      let moodIndex;
      if (daysAgo > 21) {
        moodIndex = Math.floor(Math.random() * 2); // Struggling/Anxious
      } else if (daysAgo > 14) {
        moodIndex = Math.floor(Math.random() * 3); // Struggling/Anxious/Okay
      } else if (daysAgo > 7) {
        moodIndex = Math.floor(Math.random() * 3) + 1; // Anxious/Okay/Good
      } else {
        moodIndex = Math.floor(Math.random() * 3) + 2; // Okay/Good/Great
      }

      moodEntries.push({
        userId: demoUser.id,
        mood: moods[moodIndex],
        notes: moodNotes[i] || 'Regular check-in',
        createdAt: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
      });
    }

    await prisma.moodEntry.createMany({ data: moodEntries });
    console.log(`✅ Created ${moodEntries.length} mood entries\n`);

    // 4. Create Chat Conversations (Realistic therapy-like conversations)
    console.log('💬 Creating chat conversations...');
    const conversations = [
      // Conversation 1 - Week 1 (Initial contact, high anxiety)
      {
        day: 28,
        messages: [
          { role: 'user', content: 'I\'ve been feeling really anxious lately. My mind is constantly racing and I can\'t seem to calm down.' },
          { role: 'assistant', content: 'I hear that you\'re experiencing a lot of anxiety with racing thoughts. That must feel overwhelming. Can you tell me more about when you notice these feelings are strongest?' },
          { role: 'user', content: 'Usually at night when I\'m trying to sleep, or when I think about work deadlines. It\'s like my brain won\'t shut off.' },
          { role: 'assistant', content: 'Racing thoughts at night and work-related stress are common anxiety triggers. Let\'s explore some grounding techniques that might help. Have you tried any relaxation exercises before?' },
          { role: 'user', content: 'Not really. I\'ve heard about meditation but never really tried it seriously.' },
          { role: 'assistant', content: 'That\'s a great place to start! I\'d recommend beginning with simple breathing exercises - just 5 minutes before bed. Would you like me to guide you through a basic technique?' },
          { role: 'user', content: 'Yes, that would be helpful.' },
          { role: 'assistant', content: 'Perfect! Try this: Breathe in slowly for 4 counts, hold for 4, exhale for 4, hold for 4. Repeat 5-10 times. This activates your parasympathetic nervous system and signals safety to your body. You can find guided versions in the Resources section.' },
        ]
      },
      // Conversation 2 - Week 1.5 (Sleep struggles)
      {
        day: 25,
        messages: [
          { role: 'user', content: 'I tried the breathing exercise but I\'m still having trouble sleeping. My mind just keeps going.' },
          { role: 'assistant', content: 'It\'s common for new techniques to take some practice. The fact that you tried is a positive step! Let\'s add a journaling component - sometimes getting thoughts out of your head and onto paper can help. What time do you usually try to sleep?' },
          { role: 'user', content: 'Around 11 PM, but I end up lying awake until 1 or 2 AM.' },
          { role: 'assistant', content: 'I see. Let\'s try a "worry dump" exercise 30 minutes before bed. Write down everything on your mind - no filter. Then close the journal and tell yourself "I\'ve captured these thoughts, I can address them tomorrow." Would you be willing to try this tonight?' },
          { role: 'user', content: 'I can try that. It makes sense to get it out of my head.' },
        ]
      },
      // Conversation 3 - Week 2 (Work stress deep dive)
      {
        day: 20,
        messages: [
          { role: 'user', content: 'The journaling is helping a bit, but I\'m really stressed about this big presentation at work next week.' },
          { role: 'assistant', content: 'Work presentations can be a significant source of anxiety. Let\'s break this down - what specifically about the presentation worries you most?' },
          { role: 'user', content: 'I guess I\'m afraid of messing up in front of my colleagues and my boss. What if I forget what to say or someone asks a question I can\'t answer?' },
          { role: 'assistant', content: 'Those are very common fears. Let\'s use a CBT technique called "cognitive restructuring." First, can you rate how likely it is (0-100%) that you\'ll completely forget everything?' },
          { role: 'user', content: 'Realistically? Maybe 10%? I know my material pretty well.' },
          { role: 'assistant', content: 'Exactly! And if someone asks a question you can\'t answer immediately?' },
          { role: 'user', content: 'I guess I could say "That\'s a great question, let me get back to you with the specific data."' },
          { role: 'assistant', content: 'Perfect! You already have coping strategies. Your anxiety is making unlikely scenarios feel very real. Let\'s practice some visualization - imagine yourself giving the presentation successfully. Can you picture that?' },
        ]
      },
      // Conversation 4 - Week 2.5 (Progress check-in)
      {
        day: 17,
        messages: [
          { role: 'user', content: 'The presentation went okay! I was still nervous but I didn\'t panic like I thought I would.' },
          { role: 'assistant', content: 'That\'s wonderful progress, Sarah! Notice how you prepared, challenged your anxious thoughts, and got through it. How are you feeling now?' },
          { role: 'user', content: 'Relieved. And kind of proud of myself actually. I used the breathing technique right before I started.' },
          { role: 'assistant', content: 'You should be proud! You used multiple coping strategies - preparation, cognitive restructuring, and breathing exercises. This is real growth. How has your sleep been?' },
          { role: 'user', content: 'Better this week. I\'m falling asleep faster with the worry dump technique.' },
        ]
      },
      // Conversation 5 - Week 3 (Exploring deeper patterns)
      {
        day: 13,
        messages: [
          { role: 'user', content: 'I\'ve been thinking... I notice a pattern. Whenever I have something important coming up, I start catastrophizing days before.' },
          { role: 'assistant', content: 'That\'s a really insightful observation! Recognizing your patterns is a major step in managing anxiety. Can you tell me more about what catastrophizing looks like for you?' },
          { role: 'user', content: 'I imagine the worst possible outcome and then spiral thinking about all the terrible things that could happen as a result.' },
          { role: 'assistant', content: 'This is called "catastrophic thinking" and it\'s very common with anxiety. Your brain is trying to prepare you for threats, but it\'s overestimating danger. When you notice this happening, try asking yourself: "What\'s the evidence for this thought? What\'s the evidence against it?"' },
          { role: 'user', content: 'So like, evidence-based thinking instead of fear-based?' },
          { role: 'assistant', content: 'Exactly! You\'re getting really good at this. Let\'s also explore where this pattern might have originated. Do you remember when you first started responding to stress this way?' },
          { role: 'user', content: 'Maybe in college? I had a bad experience with a failed exam and I think I\'ve been overcompensating ever since.' },
          { role: 'assistant', content: 'That connection makes sense. Your brain learned "important events = potential failure" but you\'ve had many successes since then. The presentation last week is proof! We can work on updating that old belief.' },
        ]
      },
      // Conversation 6 - Week 3.5 (Practicing self-compassion)
      {
        day: 9,
        messages: [
          { role: 'user', content: 'I had a rough day yesterday. I snapped at a coworker and felt terrible about it all evening.' },
          { role: 'assistant', content: 'It sounds like you\'re being hard on yourself about this. What would you say to a friend who made the same mistake?' },
          { role: 'user', content: 'I\'d probably tell them everyone has bad days and one moment doesn\'t define them.' },
          { role: 'assistant', content: 'Beautiful. Can you extend that same compassion to yourself? You\'re human, you had a moment of frustration. Did you apologize to your coworker?' },
          { role: 'user', content: 'Yes, this morning. They were really understanding about it.' },
          { role: 'assistant', content: 'So you recognized the issue, took accountability, and made it right. That\'s emotional maturity, not failure. How about we practice a self-compassion exercise together?' },
          { role: 'user', content: 'Okay, I\'m willing to try.' },
          { role: 'assistant', content: 'Place your hand on your heart. Take a deep breath. Now say to yourself: "I\'m having a hard time, and that\'s okay. I\'m doing my best. I deserve kindness, including from myself." How does that feel?' },
          { role: 'user', content: 'Honestly? A little awkward but also... kind of comforting?' },
        ]
      },
      // Conversation 7 - Week 4 (Celebrating progress)
      {
        day: 5,
        messages: [
          { role: 'user', content: 'I\'ve been using the app for almost a month now and I\'m noticing real changes. My anxiety isn\'t gone but it\'s much more manageable.' },
          { role: 'assistant', content: 'That\'s incredible progress, Sarah! What changes have you noticed most?' },
          { role: 'user', content: 'I\'m sleeping better, I catch myself catastrophizing and can redirect my thoughts, and I\'m generally feeling more in control.' },
          { role: 'assistant', content: 'Those are significant improvements! You\'ve built a real toolkit - breathing exercises, cognitive restructuring, journaling, self-compassion. What feels most helpful?' },
          { role: 'user', content: 'The combination of everything, really. But I think recognizing my thought patterns has been the biggest game-changer.' },
          { role: 'assistant', content: 'Awareness is the foundation of change. You\'ve done the hard work of developing that awareness and then applying strategies. How do you feel about continuing these practices?' },
          { role: 'user', content: 'I want to keep going. I feel like I\'m finally getting my life back from anxiety.' },
        ]
      },
      // Conversation 8 - Recent (Maintenance and future goals)
      {
        day: 2,
        messages: [
          { role: 'user', content: 'Quick check-in - had a stressful situation today but I handled it really differently than I would have a month ago.' },
          { role: 'assistant', content: 'I\'d love to hear about it! What happened and how did you respond?' },
          { role: 'user', content: 'My car broke down on the way to an important meeting. Old me would have had a panic attack. Today I took some deep breaths, called my boss to explain, arranged a ride, and problem-solved.' },
          { role: 'assistant', content: 'Sarah, that\'s amazing! Do you see how far you\'ve come? You accessed multiple coping strategies in a genuinely stressful situation. How did you feel afterward?' },
          { role: 'user', content: 'Honestly proud of myself. And less anxious than I would have expected.' },
          { role: 'assistant', content: 'You should be proud! This is what resilience looks like - not avoiding stress, but having tools to navigate it. What are your goals moving forward?' },
          { role: 'user', content: 'I want to keep building on this foundation. Maybe explore some of the deeper emotional work around perfectionism and where that comes from.' },
          { role: 'assistant', content: 'That\'s a great next step. You\'ve stabilized the anxiety symptoms and now you\'re ready to explore root causes. I\'m here to support you through that journey.' },
        ]
      },
    ];

    let chatMessageCount = 0;
    for (const conv of conversations) {
      const convDate = new Date(now.getTime() - conv.day * 24 * 60 * 60 * 1000);
      
      for (let i = 0; i < conv.messages.length; i++) {
        const msg = conv.messages[i];
        await prisma.chatMessage.create({
          data: {
            userId: demoUser.id,
            type: msg.role,
            content: msg.content,
            createdAt: new Date(convDate.getTime() + i * 2 * 60 * 1000), // 2 min apart
          }
        });
        chatMessageCount++;
      }
    }
    console.log(`✅ Created ${chatMessageCount} chat messages across ${conversations.length} conversations\n`);

    // 5. Create Conversation Memory
    console.log('🧠 Creating conversation memory...');
    await prisma.conversationMemory.upsert({
      where: { userId: demoUser.id },
      update: {
        topics: JSON.stringify({
          'work_stress': { count: 15, lastMentioned: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() },
          'sleep_issues': { count: 12, lastMentioned: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString() },
          'anxiety_management': { count: 18, lastMentioned: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString() },
          'self_compassion': { count: 8, lastMentioned: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString() },
          'catastrophic_thinking': { count: 10, lastMentioned: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000).toISOString() }
        }),
        emotionalPatterns: JSON.stringify({
          primaryEmotions: ['anxious', 'stressed', 'hopeful', 'proud'],
          copingStrategies: ['breathing exercises', 'journaling', 'CBT techniques', 'self-compassion'],
          triggers: ['work deadlines', 'presentations', 'nighttime', 'important events'],
          improvements: ['sleep quality', 'thought awareness', 'stress management', 'resilience']
        }),
        importantMoments: JSON.stringify([
          { date: new Date(now.getTime() - 17 * 24 * 60 * 60 * 1000).toISOString(), content: 'Successfully completed work presentation despite anxiety' },
          { date: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000).toISOString(), content: 'Recognized catastrophic thinking pattern from college experience' },
          { date: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString(), content: 'Breakthrough in self-compassion practice' },
          { date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), content: 'Handled car breakdown with resilience - major milestone' }
        ]),
        conversationMetrics: JSON.stringify({
          totalMessages: chatMessageCount,
          averageSessionLength: 8,
          preferredTopics: ['anxiety management', 'work stress', 'sleep improvement'],
          engagementLevel: 'high',
          progressRating: 'significant improvement'
        }),
      },
      create: {
        userId: demoUser.id,
        topics: JSON.stringify({
          'work_stress': { count: 15, lastMentioned: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() },
          'sleep_issues': { count: 12, lastMentioned: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString() },
          'anxiety_management': { count: 18, lastMentioned: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString() },
          'self_compassion': { count: 8, lastMentioned: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString() },
          'catastrophic_thinking': { count: 10, lastMentioned: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000).toISOString() }
        }),
        emotionalPatterns: JSON.stringify({
          primaryEmotions: ['anxious', 'stressed', 'hopeful', 'proud'],
          copingStrategies: ['breathing exercises', 'journaling', 'CBT techniques', 'self-compassion'],
          triggers: ['work deadlines', 'presentations', 'nighttime', 'important events'],
          improvements: ['sleep quality', 'thought awareness', 'stress management', 'resilience']
        }),
        importantMoments: JSON.stringify([
          { date: new Date(now.getTime() - 17 * 24 * 60 * 60 * 1000).toISOString(), content: 'Successfully completed work presentation despite anxiety' },
          { date: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000).toISOString(), content: 'Recognized catastrophic thinking pattern from college experience' },
          { date: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString(), content: 'Breakthrough in self-compassion practice' },
          { date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), content: 'Handled car breakdown with resilience - major milestone' }
        ]),
        conversationMetrics: JSON.stringify({
          totalMessages: chatMessageCount,
          averageSessionLength: 8,
          preferredTopics: ['anxiety management', 'work stress', 'sleep improvement'],
          engagementLevel: 'high',
          progressRating: 'significant improvement'
        }),
      }
    });
    console.log('✅ Conversation memory created\n');

    // 6. Create Progress Tracking
    console.log('📈 Creating progress tracking...');
    const trackingData = [
      // Daily breathing exercises tracking
      ...Array(30).fill(0).map((_, i) => ({
        metric: 'breathing_exercises',
        value: 1,
        date: new Date(now.getTime() - (30 - i) * 24 * 60 * 60 * 1000),
        notes: i % 5 === 0 ? 'Completed 10-minute session' : null,
      })),
      // Anxiety scores over time (showing improvement)
      { metric: 'anxiety_score', value: 75.0, date: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000), notes: 'Initial assessment' },
      { metric: 'anxiety_score', value: 67.86, date: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000), notes: 'Week 2 check-in' },
      { metric: 'anxiety_score', value: 53.57, date: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), notes: 'Week 3 progress' },
      { metric: 'anxiety_score', value: 42.86, date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), notes: 'Week 4 improvement' },
      { metric: 'anxiety_score', value: 33.33, date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), notes: 'Current status' },
      // Sleep quality tracking (1-10 scale)
      ...Array(30).fill(0).map((_, i) => {
        const daysAgo = 30 - i;
        let quality = daysAgo > 21 ? Math.floor(Math.random() * 3) + 3 : // 3-5 (poor)
                     daysAgo > 14 ? Math.floor(Math.random() * 2) + 5 : // 5-6 (fair)
                     daysAgo > 7 ? Math.floor(Math.random() * 2) + 6 : // 6-7 (good)
                     Math.floor(Math.random() * 2) + 7; // 7-8 (great)
        return {
          metric: 'sleep_quality',
          value: quality,
          date: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
          notes: null,
        };
      }),
      // Stress levels
      { metric: 'stress_level', value: 77.5, date: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000), notes: null },
      { metric: 'stress_level', value: 62.5, date: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000), notes: null },
      { metric: 'stress_level', value: 47.5, date: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000), notes: null },
      // Mood ratings (converted to numeric)
      ...Array(30).fill(0).map((_, i) => {
        const daysAgo = 30 - i;
        let mood = daysAgo > 21 ? Math.floor(Math.random() * 2) + 2 : // 2-3 (struggling/anxious)
                   daysAgo > 14 ? Math.floor(Math.random() * 2) + 3 : // 3-4 (anxious/okay)
                   daysAgo > 7 ? Math.floor(Math.random() * 2) + 4 : // 4-5 (okay/good)
                   Math.floor(Math.random() * 2) + 5; // 5-6 (good/great)
        return {
          metric: 'daily_mood',
          value: mood,
          date: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
          notes: null,
        };
      }),
    ];

    for (const data of trackingData) {
      await prisma.progressTracking.create({
        data: {
          userId: demoUser.id,
          metric: data.metric,
          value: data.value,
          date: data.date,
          notes: data.notes,
        }
      });
    }
    console.log(`✅ Created ${trackingData.length} progress tracking entries\n`);

    console.log('🎉 Demo user creation complete!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📧 Email: demo@mentalwellness.app');
    console.log('🔑 Password: Demo@123');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n📊 Data Summary:');
    console.log(`   • ${assessments.length} assessment results (showing improvement)`);
    console.log(`   • ${moodEntries.length} mood entries (daily for 30 days)`);
    console.log(`   • ${chatMessageCount} chat messages (${conversations.length} conversations)`);
    console.log(`   • ${trackingData.length} progress tracking data points`);
    console.log('   • Conversation memory with topics, patterns, and important moments');
    console.log('   • Complete profile data\n');

  } catch (error) {
    console.error('❌ Error creating demo user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createDemoUser()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
