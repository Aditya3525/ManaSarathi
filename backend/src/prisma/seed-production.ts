/**
 * Production seed: populates essential app data if it doesn't already exist.
 * Safe to run on every deploy — each section checks for existing data first.
 * Seeds: Assessment templates, Practices, Content, FAQs, Crisis Resources, Therapists, Admin user.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedAssessments() {
  const count = await prisma.assessmentDefinition.count();
  if (count > 0) {
    console.log(`  ✅ Assessment templates already exist (${count}) — skipping`);
    return;
  }
  console.log('  🌱 Seeding assessment templates...');
  const { execSync } = await import('child_process');
  execSync('npx ts-node src/prisma/seed.ts', {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env
  });
  console.log('  ✅ Assessment templates seeded');
}

async function seedPractices() {
  const count = await prisma.practice.count();
  if (count > 0) {
    console.log(`  ✅ Practices already exist (${count}) — skipping`);
    return;
  }
  console.log('  🌱 Seeding practices...');
  const result = await prisma.practice.createMany({
    data: [
      {
        title: "Calm Breathing Intro",
        description: "4-7-8 breathing technique for instant calm",
        duration: 5, type: "breathing", category: "BREATHING",
        difficulty: "beginner", approach: "hybrid", format: "Audio", isPublished: true
      },
      {
        title: "Evening Sleep Preparation",
        description: "Wind down ritual for better sleep",
        duration: 10, type: "sleep", category: "SLEEP_HYGIENE",
        difficulty: "beginner", approach: "western", format: "Audio", isPublished: true
      },
      {
        title: "Morning Yoga Flow",
        description: "Energizing gentle yoga sequence",
        duration: 15, type: "yoga", category: "MOVEMENT",
        difficulty: "intermediate", approach: "eastern", format: "Video", isPublished: true
      },
      {
        title: "Mindful Walking",
        description: "Walking meditation practice",
        duration: 20, type: "meditation", category: "MINDFULNESS",
        difficulty: "beginner", approach: "eastern", format: "Audio", isPublished: true
      },
      {
        title: "Loving-Kindness Meditation",
        description: "Cultivate compassion for self and others",
        duration: 12, type: "meditation", category: "MEDITATION",
        difficulty: "intermediate", approach: "eastern", format: "Audio", isPublished: true
      }
    ],
    skipDuplicates: true
  });
  console.log(`  ✅ Created ${result.count} practices`);
}

async function seedContent() {
  const count = await prisma.content.count();
  if (count > 0) {
    console.log(`  ✅ Content already exists (${count}) — skipping`);
    return;
  }
  console.log('  🌱 Seeding content...');
  const result = await prisma.content.createMany({
    data: [
      {
        title: "Understanding Anxiety Basics", type: "article", category: "anxiety",
        approach: "hybrid", description: "Core concepts about anxiety and how to approach it.",
        content: "Anxiety is a natural response to stress. Learn to recognize it and manage it effectively. This article covers breathing techniques, cognitive reframing, and when to seek professional help.",
        tags: "anxiety,basics,education", isPublished: true
      },
      {
        title: "Guided Body Scan Meditation", type: "audio", category: "relaxation",
        approach: "hybrid", description: "Full-body awareness practice for grounding and calm.",
        content: "/audio/body-scan.mp3", duration: 900,
        tags: "meditation,relaxation,body-scan", isPublished: true
      },
      {
        title: "Mindful Minute Video", type: "video", category: "mindfulness",
        approach: "eastern", description: "A one-minute reset to center your thoughts.",
        content: "https://youtube.com/watch?v=mindful-minute",
        youtubeUrl: "https://youtube.com/watch?v=mindful-minute", duration: 60,
        tags: "mindfulness,quick,video", isPublished: true
      },
      {
        title: "CBT Thought Tracking Worksheet", type: "article", category: "cbt",
        approach: "western", description: "Learn to identify and challenge cognitive distortions.",
        content: "Cognitive Behavioral Therapy teaches us to recognize automatic thoughts and challenge them. Use this worksheet to track your thoughts, identify patterns, and develop healthier thinking habits.",
        tags: "cbt,worksheet,cognitive", isPublished: true
      },
      {
        title: "Sleep Hygiene Guide", type: "article", category: "sleep",
        approach: "western", description: "Practical tips for better sleep quality.",
        content: "Good sleep hygiene involves consistent routines, comfortable environment, and relaxation techniques. Learn about optimal sleep temperature, light exposure, and pre-bed rituals.",
        tags: "sleep,hygiene,tips", isPublished: true
      }
    ],
    skipDuplicates: true
  });
  console.log(`  ✅ Created ${result.count} content items`);
}

async function seedFAQs() {
  const count = await prisma.fAQ.count();
  if (count > 0) {
    console.log(`  ✅ FAQs already exist (${count}) — skipping`);
    return;
  }
  console.log('  🌱 Seeding FAQs...');
  const result = await prisma.fAQ.createMany({
    data: [
      { question: 'How do I get started with the Mental Wellbeing AI App?', answer: 'Getting started is easy! First, create an account or log in. Then, take one of our initial assessments to help us understand your mental health needs. Based on your results, we\'ll recommend personalized practices, content, and resources.', category: 'GENERAL', order: 1, tags: 'onboarding, getting started, beginner', createdBy: 'system' },
      { question: 'Is my personal information and mental health data secure?', answer: 'Yes, we take your privacy very seriously. All your data is encrypted both in transit and at rest. We never share your personal information or assessment results with third parties without your explicit consent.', category: 'PRIVACY', order: 2, tags: 'privacy, security, data protection', createdBy: 'system' },
      { question: 'How accurate are the mental health assessments?', answer: 'Our assessments are based on clinically validated scales (PHQ-9 for depression, GAD-7 for anxiety, etc.). While they provide valuable insights, they are not diagnostic tools. Always consult with a qualified mental health professional for an official diagnosis.', category: 'ASSESSMENTS', order: 3, tags: 'assessments, accuracy, validation', createdBy: 'system' },
      { question: 'Can the AI chatbot replace therapy?', answer: 'No, our AI chatbot is designed to provide support, coping strategies, and mindfulness exercises—not to replace professional therapy. If you\'re experiencing severe mental health issues, please reach out to a licensed therapist or crisis hotline.', category: 'CHATBOT', order: 4, tags: 'chatbot, therapy, limitations', createdBy: 'system' },
      { question: 'What if I\'m in a mental health crisis?', answer: 'If you\'re experiencing a mental health crisis, please contact emergency services immediately (911 in the US) or reach out to a crisis hotline. You can find crisis resources in the Help & Safety section under "Crisis Resources".', category: 'SAFETY', order: 5, tags: 'crisis, emergency, safety', createdBy: 'system' },
      { question: 'How much does the app cost?', answer: 'We offer both free and premium plans. The free plan includes basic assessments, mood tracking, and limited content access. Premium plans unlock personalized recommendations, unlimited AI chatbot conversations, advanced analytics, and priority support.', category: 'BILLING', order: 6, tags: 'pricing, subscription, premium', createdBy: 'system' },
      { question: 'The app is not loading properly. What should I do?', answer: 'Try these steps: 1) Clear your browser cache and cookies, 2) Make sure you\'re using an updated browser, 3) Check your internet connection, 4) Try logging out and back in. If issues persist, contact support.', category: 'TECHNICAL', order: 7, tags: 'troubleshooting, loading issues, technical', createdBy: 'system' },
      { question: 'Can I delete my account and data?', answer: 'Yes, you have full control over your data. Go to Settings > Account > Delete Account. This will permanently remove all your personal information, assessment results, and activity history. This action cannot be undone.', category: 'PRIVACY', order: 8, tags: 'account deletion, data removal, GDPR', createdBy: 'system' }
    ],
    skipDuplicates: true
  });
  console.log(`  ✅ Created ${result.count} FAQs`);
}

async function seedCrisisResources() {
  const count = await prisma.crisisResource.count();
  if (count > 0) {
    console.log(`  ✅ Crisis resources already exist (${count}) — skipping`);
    return;
  }
  console.log('  🌱 Seeding crisis resources...');
  const result = await prisma.crisisResource.createMany({
    data: [
      // US
      { name: '988 Suicide & Crisis Lifeline', type: 'HOTLINE', phoneNumber: '988', website: 'https://988lifeline.org/', description: 'Free and confidential support for people in distress, 24/7.', availability: '24/7', country: 'US', language: 'English, Spanish', order: 1, tags: 'suicide prevention, crisis hotline, 24/7' },
      { name: 'Crisis Text Line', type: 'TEXT_LINE', textNumber: '741741', website: 'https://www.crisistextline.org/', description: 'Free, 24/7 support via text message. Text "HELLO" to 741741.', availability: '24/7', country: 'US', language: 'English', order: 2, tags: 'text support, crisis text, 24/7' },
      { name: 'SAMHSA National Helpline', type: 'HOTLINE', phoneNumber: '1-800-662-4357', website: 'https://www.samhsa.gov/find-help/national-helpline', description: 'Treatment referral and information for mental health and substance use disorders.', availability: '24/7', country: 'US', language: 'English, Spanish', order: 3, tags: 'substance abuse, mental health, treatment referral' },
      { name: '911 Emergency Services', type: 'EMERGENCY', phoneNumber: '911', description: 'For immediate life-threatening emergencies. Call if someone is in immediate danger.', availability: '24/7', country: 'US', language: 'English', order: 8, tags: 'emergency, 911, immediate danger' },
      // India
      { name: 'Tele MANAS', type: 'HOTLINE', phoneNumber: '14416', website: 'https://telemanas.mohfw.gov.in/', description: 'National Tele Mental Health Programme — free, confidential counseling in 20+ languages.', availability: '24/7', country: 'IN', language: 'Hindi, English, 20+ regional languages', order: 1, tags: 'mental health, counseling, government, 24/7' },
      { name: 'iCall Psychosocial Helpline', type: 'HOTLINE', phoneNumber: '9152987821', website: 'https://icallhelpline.org/', description: 'Free professional counseling by TISS for emotional distress.', availability: 'Mon-Sat 8am-10pm IST', country: 'IN', language: 'English, Hindi, Marathi', order: 2, tags: 'counseling, emotional support, professional' },
      { name: 'Vandrevala Foundation Helpline', type: 'HOTLINE', phoneNumber: '1860-2662-345', website: 'https://www.vandrevalafoundation.com/', description: 'Free, professional, multilingual mental health support 24/7.', availability: '24/7', country: 'IN', language: 'English, Hindi, and regional languages', order: 3, tags: 'crisis, suicide prevention, multilingual, 24/7' },
      { name: 'Emergency Services India', type: 'EMERGENCY', phoneNumber: '112', description: 'Unified emergency number for police, fire, and ambulance in India.', availability: '24/7', country: 'IN', language: 'Hindi, English', order: 4, tags: 'emergency, 112, immediate danger' },
      // UK
      { name: 'Samaritans', type: 'HOTLINE', phoneNumber: '116 123', website: 'https://www.samaritans.org/', description: 'Free, confidential emotional support 24/7/365.', availability: '24/7', country: 'UK', language: 'English, Welsh', order: 1, tags: 'emotional support, crisis, suicide prevention, 24/7' },
      { name: 'Shout Crisis Text Line', type: 'TEXT_LINE', textNumber: '85258', website: 'https://giveusashout.org/', description: 'Free, confidential, 24/7 text support. Text SHOUT to 85258.', availability: '24/7', country: 'UK', language: 'English', order: 2, tags: 'text support, crisis, mental health, 24/7' },
      { name: '999 Emergency Services', type: 'EMERGENCY', phoneNumber: '999', description: 'For immediate life-threatening emergencies in the UK.', availability: '24/7', country: 'UK', language: 'English', order: 4, tags: 'emergency, 999, immediate danger' },
      // Canada
      { name: '988 Suicide Crisis Helpline', type: 'HOTLINE', phoneNumber: '988', website: 'https://988.ca/', description: 'Canada\'s national suicide crisis helpline. Call or text 988 for 24/7 support.', availability: '24/7', country: 'CA', language: 'English, French', order: 1, tags: 'suicide prevention, crisis, 24/7' },
      { name: '911 Emergency Services (Canada)', type: 'EMERGENCY', phoneNumber: '911', description: 'For immediate life-threatening emergencies in Canada.', availability: '24/7', country: 'CA', language: 'English, French', order: 4, tags: 'emergency, 911, immediate danger' },
      // Australia
      { name: 'Lifeline Australia', type: 'HOTLINE', phoneNumber: '13 11 14', textNumber: '0477 13 11 14', website: 'https://www.lifeline.org.au/', description: 'Free, 24-hour crisis support and suicide prevention.', availability: '24/7', country: 'AU', language: 'English', order: 1, tags: 'crisis support, suicide prevention, 24/7' },
      { name: 'Beyond Blue', type: 'HOTLINE', phoneNumber: '1300 22 4636', website: 'https://www.beyondblue.org.au/', description: 'Support for anxiety, depression, and suicide prevention 24/7.', availability: '24/7', country: 'AU', language: 'English', order: 2, tags: 'anxiety, depression, mental health, 24/7' },
      { name: '000 Emergency Services', type: 'EMERGENCY', phoneNumber: '000', description: 'For immediate life-threatening emergencies in Australia.', availability: '24/7', country: 'AU', language: 'English', order: 4, tags: 'emergency, 000, immediate danger' },
    ],
    skipDuplicates: true
  });
  console.log(`  ✅ Created ${result.count} crisis resources`);
}

async function seedTherapists() {
  const count = await prisma.therapist.count();
  if (count > 0) {
    console.log(`  ✅ Therapists already exist (${count}) — skipping`);
    return;
  }
  console.log('  🌱 Seeding therapist directory...');
  const result = await prisma.therapist.createMany({
    data: [
      {
        name: 'Dr. Sarah Johnson', credential: 'PSYCHOLOGIST', title: 'Clinical Psychologist, PhD',
        bio: 'Specializes in CBT and mindfulness-based interventions with 15+ years of experience helping clients manage anxiety, depression, and stress.',
        specialtiesJson: JSON.stringify(['Anxiety', 'Depression', 'Stress Management', 'CBT', 'Mindfulness']),
        email: 'sarah.johnson@example.com', phone: '(555) 123-4567',
        city: 'San Francisco', state: 'CA', country: 'US',
        acceptsInsurance: true, sessionFee: 150, offersSliding: true,
        yearsExperience: 15, languages: 'English, Spanish', isVerified: true, isActive: true
      },
      {
        name: 'Michael Chen, LCSW', credential: 'LCSW', title: 'Licensed Clinical Social Worker',
        bio: 'Specializes in trauma-informed care and EMDR therapy for individuals who have experienced trauma, PTSD, grief, and relationship issues.',
        specialtiesJson: JSON.stringify(['Trauma', 'PTSD', 'EMDR', 'Grief', 'Relationship Issues']),
        email: 'michael.chen@example.com', phone: '(555) 234-5678',
        city: 'Los Angeles', state: 'CA', country: 'US',
        acceptsInsurance: true, sessionFee: 120, offersSliding: true,
        yearsExperience: 10, languages: 'English, Mandarin', isVerified: true, isActive: true
      },
      {
        name: 'Dr. Emily Rodriguez', credential: 'PSYCHIATRIST', title: 'Board-Certified Psychiatrist, MD',
        bio: 'Expertise in medication management for depression, anxiety, bipolar disorder. Takes a holistic approach combining medication with therapy referrals.',
        specialtiesJson: JSON.stringify(['Medication Management', 'Depression', 'Anxiety', 'Bipolar Disorder']),
        email: 'emily.rodriguez@example.com', phone: '(555) 345-6789',
        city: 'New York', state: 'NY', country: 'US',
        acceptsInsurance: true, sessionFee: 200, offersSliding: false,
        yearsExperience: 12, languages: 'English, Spanish', isVerified: true, isActive: true
      },
      {
        name: 'Jessica Williams, LMFT', credential: 'LMFT', title: 'Licensed Marriage and Family Therapist',
        bio: 'Specializes in couples therapy, family therapy, and relationship counseling with a collaborative, strengths-based approach.',
        specialtiesJson: JSON.stringify(['Couples Therapy', 'Family Therapy', 'Relationship Issues', 'Communication']),
        email: 'jessica.williams@example.com', phone: '(555) 456-7890',
        city: 'Seattle', state: 'WA', country: 'US',
        acceptsInsurance: true, sessionFee: 140, offersSliding: true,
        yearsExperience: 8, languages: 'English', isVerified: true, isActive: true
      },
      {
        name: 'Dr. James Thompson', credential: 'PSYCHOLOGIST', title: 'Clinical Psychologist, PsyD',
        bio: 'Specializes in treating OCD, panic disorder, and phobias using Exposure and Response Prevention (ERP) and CBT.',
        specialtiesJson: JSON.stringify(['OCD', 'Panic Disorder', 'Phobias', 'ERP', 'CBT', 'Anxiety Disorders']),
        email: 'james.thompson@example.com', phone: '(555) 567-8901',
        city: 'Boston', state: 'MA', country: 'US',
        acceptsInsurance: true, sessionFee: 160, offersSliding: false,
        yearsExperience: 18, languages: 'English', isVerified: true, isActive: true
      }
    ],
    skipDuplicates: true
  });
  console.log(`  ✅ Created ${result.count} therapists`);
}

async function seedAdminUser() {
  const adminEmail = (process.env.ADMIN_EMAILS || 'admin@example.com').split(',')[0].trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.log(`  ✅ Admin user already exists (${adminEmail}) — skipping`);
    return;
  }
  console.log(`  🌱 Creating admin user (${adminEmail})...`);
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      name: 'Admin',
      isOnboarded: true,
    }
  });
  console.log(`  ✅ Admin user created (${adminEmail}). Default password: admin123 — CHANGE IT IMMEDIATELY.`);
}

async function main() {
  console.log('🌱 Production seed — checking all data categories...\n');

  await seedAdminUser();
  await seedAssessments();
  await seedPractices();
  await seedContent();
  await seedFAQs();
  await seedCrisisResources();
  await seedTherapists();

  console.log('\n🎉 Production seed complete!');
}

main().catch(e => {
  console.error('❌ Production seed failed:', e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
