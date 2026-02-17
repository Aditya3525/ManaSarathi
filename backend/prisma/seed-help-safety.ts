import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedHelpSafetyData() {
  console.log('🌱 Seeding Help & Safety system data...');

  try {
    // ===== SEED FAQs =====
    console.log('Creating FAQs...');
    const faqs = await prisma.fAQ.createMany({
      data: [
        {
          question: 'How do I get started with the Mental Wellbeing AI App?',
          answer: 'Getting started is easy! First, create an account or log in. Then, take one of our initial assessments to help us understand your mental health needs. Based on your results, we\'ll recommend personalized practices, content, and resources.',
          category: 'GENERAL',
          order: 1,
          tags: 'onboarding, getting started, beginner',
          createdBy: 'system'
        },
        {
          question: 'Is my personal information and mental health data secure?',
          answer: 'Yes, we take your privacy very seriously. All your data is encrypted both in transit and at rest. We never share your personal information or assessment results with third parties without your explicit consent. You can read more in our Privacy Policy.',
          category: 'PRIVACY',
          order: 2,
          tags: 'privacy, security, data protection',
          createdBy: 'system'
        },
        {
          question: 'How accurate are the mental health assessments?',
          answer: 'Our assessments are based on clinically validated scales (PHQ-9 for depression, GAD-7 for anxiety, etc.). While they provide valuable insights, they are not diagnostic tools. Always consult with a qualified mental health professional for an official diagnosis.',
          category: 'ASSESSMENTS',
          order: 3,
          tags: 'assessments, accuracy, validation',
          createdBy: 'system'
        },
        {
          question: 'Can the AI chatbot replace therapy?',
          answer: 'No, our AI chatbot is designed to provide support, coping strategies, and mindfulness exercises—not to replace professional therapy. If you\'re experiencing severe mental health issues, please reach out to a licensed therapist or crisis hotline.',
          category: 'CHATBOT',
          order: 4,
          tags: 'chatbot, therapy, limitations',
          createdBy: 'system'
        },
        {
          question: 'What if I\'m in a mental health crisis?',
          answer: 'If you\'re experiencing a mental health crisis, please contact emergency services immediately (911 in the US) or reach out to a crisis hotline. You can find crisis resources in the Help & Safety section under "Crisis Resources".',
          category: 'SAFETY',
          order: 5,
          tags: 'crisis, emergency, safety',
          createdBy: 'system'
        },
        {
          question: 'How much does the app cost?',
          answer: 'We offer both free and premium plans. The free plan includes basic assessments, mood tracking, and limited content access. Premium plans unlock personalized recommendations, unlimited AI chatbot conversations, advanced analytics, and priority support.',
          category: 'BILLING',
          order: 6,
          tags: 'pricing, subscription, premium',
          createdBy: 'system'
        },
        {
          question: 'The app is not loading properly. What should I do?',
          answer: 'Try these steps: 1) Clear your browser cache and cookies, 2) Make sure you\'re using an updated browser (Chrome, Firefox, Safari, or Edge), 3) Check your internet connection, 4) Try logging out and back in. If issues persist, contact support.',
          category: 'TECHNICAL',
          order: 7,
          tags: 'troubleshooting, loading issues, technical',
          createdBy: 'system'
        },
        {
          question: 'Can I delete my account and data?',
          answer: 'Yes, you have full control over your data. Go to Settings > Account > Delete Account. This will permanently remove all your personal information, assessment results, and activity history. This action cannot be undone.',
          category: 'PRIVACY',
          order: 8,
          tags: 'account deletion, data removal, GDPR',
          createdBy: 'system'
        }
      ]
    });
    console.log(`✅ Created ${faqs.count} FAQs`);

    // ===== SEED CRISIS RESOURCES =====
    console.log('Creating crisis resources...');
    const crisisResources = await prisma.crisisResource.createMany({
      data: [
        {
          name: '988 Suicide & Crisis Lifeline',
          type: 'HOTLINE',
          phoneNumber: '988',
          website: 'https://988lifeline.org/',
          description: 'Free and confidential support for people in distress, 24/7. Available for anyone experiencing suicidal thoughts, mental health crisis, or emotional distress.',
          availability: '24/7',
          country: 'US',
          language: 'English, Spanish',
          order: 1,
          tags: 'suicide prevention, crisis hotline, 24/7'
        },
        {
          name: 'Crisis Text Line',
          type: 'TEXT_LINE',
          textNumber: '741741',
          website: 'https://www.crisistextline.org/',
          description: 'Free, 24/7 support via text message. Text "HELLO" to 741741 to connect with a trained Crisis Counselor.',
          availability: '24/7',
          country: 'US',
          language: 'English',
          order: 2,
          tags: 'text support, crisis text, 24/7'
        },
        {
          name: 'SAMHSA National Helpline',
          type: 'HOTLINE',
          phoneNumber: '1-800-662-4357',
          website: 'https://www.samhsa.gov/find-help/national-helpline',
          description: 'Treatment referral and information service for individuals and families facing mental health and/or substance use disorders.',
          availability: '24/7',
          country: 'US',
          language: 'English, Spanish',
          order: 3,
          tags: 'substance abuse, mental health, treatment referral'
        },
        {
          name: 'NAMI Helpline',
          type: 'HOTLINE',
          phoneNumber: '1-800-950-6264',
          website: 'https://www.nami.org/help',
          description: 'National Alliance on Mental Illness helpline provides information, resource referrals, and support for people living with mental illness.',
          availability: 'Mon-Fri 10am-10pm ET',
          country: 'US',
          language: 'English',
          order: 4,
          tags: 'NAMI, mental illness support, information'
        },
        {
          name: 'The Trevor Project',
          type: 'HOTLINE',
          phoneNumber: '1-866-488-7386',
          textNumber: '678678',
          website: 'https://www.thetrevorproject.org/',
          description: 'Crisis intervention and suicide prevention for LGBTQ+ youth under 25. Call, text, or chat available.',
          availability: '24/7',
          country: 'US',
          language: 'English',
          order: 5,
          tags: 'LGBTQ+, youth, suicide prevention'
        },
        {
          name: 'Veterans Crisis Line',
          type: 'HOTLINE',
          phoneNumber: '988 (Press 1)',
          textNumber: '838255',
          website: 'https://www.veteranscrisisline.net/',
          description: 'Free, confidential support for Veterans in crisis, their families, and friends. Call 988 and press 1, text 838255, or chat online.',
          availability: '24/7',
          country: 'US',
          language: 'English',
          order: 6,
          tags: 'veterans, military, crisis support'
        },
        {
          name: '7 Cups',
          type: 'CHAT_SERVICE',
          website: 'https://www.7cups.com/',
          description: 'Free, anonymous, and confidential conversations with trained listeners. Available via chat 24/7.',
          availability: '24/7',
          country: 'Global',
          language: 'Multiple languages',
          order: 7,
          tags: 'emotional support, chat, anonymous'
        },
        {
          name: '911 Emergency Services',
          type: 'EMERGENCY',
          phoneNumber: '911',
          description: 'For immediate life-threatening emergencies only. Call 911 if someone is in immediate danger or experiencing a medical emergency.',
          availability: '24/7',
          country: 'US',
          language: 'English',
          order: 8,
          tags: 'emergency, 911, immediate danger'
        },

        // ===== INDIA =====
        {
          name: 'Tele MANAS',
          type: 'HOTLINE',
          phoneNumber: '14416',
          website: 'https://telemanas.mohfw.gov.in/',
          description: 'National Tele Mental Health Programme providing free, confidential mental health counseling and support. Available in 20+ languages via call and video consultation.',
          availability: '24/7',
          country: 'IN',
          language: 'Hindi, English, 20+ regional languages',
          order: 1,
          tags: 'mental health, counseling, government, 24/7'
        },
        {
          name: 'iCall Psychosocial Helpline',
          type: 'HOTLINE',
          phoneNumber: '9152987821',
          website: 'https://icallhelpline.org/',
          description: 'Free professional counseling service by Tata Institute of Social Sciences for emotional distress, relationship issues, and mental health concerns.',
          availability: 'Mon-Sat 8am-10pm IST',
          country: 'IN',
          language: 'English, Hindi, Marathi',
          order: 2,
          tags: 'counseling, emotional support, professional'
        },
        {
          name: 'Vandrevala Foundation Helpline',
          type: 'HOTLINE',
          phoneNumber: '1860-2662-345',
          website: 'https://www.vandrevalafoundation.com/',
          description: 'Free, professional, multilingual mental health support for individuals in psychological distress or suicidal crisis.',
          availability: '24/7',
          country: 'IN',
          language: 'English, Hindi, and regional languages',
          order: 3,
          tags: 'crisis, suicide prevention, multilingual, 24/7'
        },
        {
          name: 'Emergency Services India',
          type: 'EMERGENCY',
          phoneNumber: '112',
          description: 'Unified emergency number for police, fire, and ambulance services in India. Call in case of immediate life-threatening emergencies.',
          availability: '24/7',
          country: 'IN',
          language: 'Hindi, English',
          order: 4,
          tags: 'emergency, 112, immediate danger'
        },

        // ===== UNITED KINGDOM =====
        {
          name: 'Samaritans',
          type: 'HOTLINE',
          phoneNumber: '116 123',
          website: 'https://www.samaritans.org/',
          description: 'Free, confidential emotional support for anyone in distress or struggling to cope. Available 24 hours a day, 365 days a year. You can also email jo@samaritans.org.',
          availability: '24/7',
          country: 'UK',
          language: 'English, Welsh',
          order: 1,
          tags: 'emotional support, crisis, suicide prevention, 24/7'
        },
        {
          name: 'Shout Crisis Text Line',
          type: 'TEXT_LINE',
          textNumber: '85258',
          website: 'https://giveusashout.org/',
          description: 'Free, confidential, 24/7 text support. Text SHOUT to 85258 to connect with a trained volunteer for help with anxiety, stress, suicidal thoughts, or any mental health crisis.',
          availability: '24/7',
          country: 'UK',
          language: 'English',
          order: 2,
          tags: 'text support, crisis, mental health, 24/7'
        },
        {
          name: 'NHS 111 Mental Health',
          type: 'HOTLINE',
          phoneNumber: '111',
          website: 'https://www.nhs.uk/nhs-services/urgent-and-emergency-care-services/when-to-call-111/',
          description: 'Call NHS 111 and select the mental health option for urgent mental health support, assessment, and referral to local crisis teams.',
          availability: '24/7',
          country: 'UK',
          language: 'English',
          order: 3,
          tags: 'NHS, mental health, urgent care, 24/7'
        },
        {
          name: '999 Emergency Services',
          type: 'EMERGENCY',
          phoneNumber: '999',
          description: 'For immediate life-threatening emergencies in the UK. Call 999 if someone is in immediate danger of harming themselves or others.',
          availability: '24/7',
          country: 'UK',
          language: 'English',
          order: 4,
          tags: 'emergency, 999, immediate danger'
        },

        // ===== CANADA =====
        {
          name: '988 Suicide Crisis Helpline',
          type: 'HOTLINE',
          phoneNumber: '988',
          website: 'https://988.ca/',
          description: 'Canada\'s national suicide crisis helpline. Call or text 988 for immediate support in English or French, 24 hours a day, 7 days a week.',
          availability: '24/7',
          country: 'CA',
          language: 'English, French',
          order: 1,
          tags: 'suicide prevention, crisis, 24/7'
        },
        {
          name: 'Kids Help Phone',
          type: 'HOTLINE',
          phoneNumber: '1-800-668-6868',
          textNumber: '686868',
          website: 'https://kidshelpphone.ca/',
          description: 'Free, 24/7 confidential support for youth aged 5-29. Call 1-800-668-6868 or text CONNECT to 686868 for professional counseling.',
          availability: '24/7',
          country: 'CA',
          language: 'English, French',
          order: 2,
          tags: 'youth, children, counseling, 24/7'
        },
        {
          name: 'Hope for Wellness Helpline',
          type: 'HOTLINE',
          phoneNumber: '1-855-242-3310',
          website: 'https://www.hopeforwellness.ca/',
          description: 'Culturally competent counseling for First Nations, Inuit, and Métis Peoples. Available in English, French, Cree, Ojibway, and Inuktitut.',
          availability: '24/7',
          country: 'CA',
          language: 'English, French, Cree, Ojibway, Inuktitut',
          order: 3,
          tags: 'Indigenous, First Nations, culturally safe, 24/7'
        },
        {
          name: '911 Emergency Services',
          type: 'EMERGENCY',
          phoneNumber: '911',
          description: 'For immediate life-threatening emergencies in Canada. Call 911 if someone is in immediate danger.',
          availability: '24/7',
          country: 'CA',
          language: 'English, French',
          order: 4,
          tags: 'emergency, 911, immediate danger'
        },

        // ===== AUSTRALIA =====
        {
          name: 'Lifeline Australia',
          type: 'HOTLINE',
          phoneNumber: '13 11 14',
          textNumber: '0477 13 11 14',
          website: 'https://www.lifeline.org.au/',
          description: 'Free, 24-hour crisis support and suicide prevention service. Call, text, or chat online with trained counselors for confidential support.',
          availability: '24/7',
          country: 'AU',
          language: 'English',
          order: 1,
          tags: 'crisis support, suicide prevention, 24/7'
        },
        {
          name: 'Beyond Blue',
          type: 'HOTLINE',
          phoneNumber: '1300 22 4636',
          website: 'https://www.beyondblue.org.au/',
          description: 'Support for anxiety, depression, and suicide prevention. Free counseling via phone, chat, or email from trained mental health professionals.',
          availability: '24/7',
          country: 'AU',
          language: 'English',
          order: 2,
          tags: 'anxiety, depression, mental health, 24/7'
        },
        {
          name: 'Suicide Call Back Service',
          type: 'HOTLINE',
          phoneNumber: '1300 659 467',
          website: 'https://www.suicidecallbackservice.org.au/',
          description: 'Free, nationwide telephone and online counseling for anyone affected by suicidal thoughts, available 24 hours a day.',
          availability: '24/7',
          country: 'AU',
          language: 'English',
          order: 3,
          tags: 'suicide prevention, counseling, 24/7'
        },
        {
          name: '000 Emergency Services',
          type: 'EMERGENCY',
          phoneNumber: '000',
          description: 'For immediate life-threatening emergencies in Australia. Call 000 for police, fire, or ambulance services.',
          availability: '24/7',
          country: 'AU',
          language: 'English',
          order: 4,
          tags: 'emergency, 000, immediate danger'
        },

        // ===== GERMANY =====
        {
          name: 'TelefonSeelsorge',
          type: 'HOTLINE',
          phoneNumber: '0800 111 0111',
          website: 'https://online.telefonseelsorge.de/',
          description: 'Kostenlose, anonyme Krisenberatung rund um die Uhr. Free, anonymous crisis counseling available 24/7 via phone, email, and chat.',
          availability: '24/7',
          country: 'DE',
          language: 'German',
          order: 1,
          tags: 'crisis, counseling, anonymous, 24/7'
        },
        {
          name: 'TelefonSeelsorge (Alt)',
          type: 'HOTLINE',
          phoneNumber: '0800 111 0222',
          website: 'https://online.telefonseelsorge.de/',
          description: 'Alternative free crisis hotline number. Same service as TelefonSeelsorge, offering 24/7 anonymous emotional support and crisis intervention.',
          availability: '24/7',
          country: 'DE',
          language: 'German',
          order: 2,
          tags: 'crisis, counseling, anonymous, 24/7'
        },
        {
          name: 'Nummer gegen Kummer (Youth)',
          type: 'HOTLINE',
          phoneNumber: '116 111',
          website: 'https://www.nummergegenkummer.de/',
          description: 'Free helpline for children and young people. Professional emotional support for youth dealing with problems, worries, or crises.',
          availability: 'Mon-Sat 2pm-8pm',
          country: 'DE',
          language: 'German',
          order: 3,
          tags: 'youth, children, emotional support'
        },
        {
          name: '112 Emergency Services',
          type: 'EMERGENCY',
          phoneNumber: '112',
          description: 'European emergency number for police, fire, and medical emergencies in Germany. Call for immediate life-threatening situations.',
          availability: '24/7',
          country: 'DE',
          language: 'German, English',
          order: 4,
          tags: 'emergency, 112, immediate danger'
        },

        // ===== FRANCE =====
        {
          name: '3114 – Numéro National de Prévention du Suicide',
          type: 'HOTLINE',
          phoneNumber: '3114',
          website: 'https://www.3114.fr/',
          description: 'National suicide prevention helpline. Free, confidential, 24/7 professional support for anyone experiencing suicidal thoughts or concerns about someone else.',
          availability: '24/7',
          country: 'FR',
          language: 'French',
          order: 1,
          tags: 'suicide prevention, crisis, national, 24/7'
        },
        {
          name: 'SOS Help (English)',
          type: 'HOTLINE',
          phoneNumber: '01 46 21 46 46',
          website: 'https://www.soshelp.org/',
          description: 'Free, confidential support in English for the international community in France. Provides emotional listening and crisis support.',
          availability: '3pm-11pm daily',
          country: 'FR',
          language: 'English',
          order: 2,
          tags: 'English support, international, emotional listening'
        },
        {
          name: 'Fil Santé Jeunes (Youth)',
          type: 'HOTLINE',
          phoneNumber: '0800 235 236',
          description: 'Free, anonymous helpline for children and adolescents. Professional support for health, relationships, and emotional wellbeing.',
          availability: '9am-11pm daily',
          country: 'FR',
          language: 'French',
          order: 3,
          tags: 'youth, adolescents, health, anonymous'
        },
        {
          name: '112 Emergency Services',
          type: 'EMERGENCY',
          phoneNumber: '112',
          description: 'European emergency number for immediate life-threatening emergencies in France. Also call 15 (SAMU) for medical emergencies.',
          availability: '24/7',
          country: 'FR',
          language: 'French, English',
          order: 4,
          tags: 'emergency, 112, immediate danger'
        },

        // ===== SPAIN =====
        {
          name: '024 – Línea de Atención a la Conducta Suicida',
          type: 'HOTLINE',
          phoneNumber: '024',
          description: 'Spain\'s national suicide prevention hotline. Free, confidential, 24/7 crisis support for suicidal behavior, operated by the Ministry of Health.',
          availability: '24/7',
          country: 'ES',
          language: 'Spanish',
          order: 1,
          tags: 'suicide prevention, crisis, national, 24/7'
        },
        {
          name: 'Teléfono de la Esperanza',
          type: 'HOTLINE',
          phoneNumber: '717 003 717',
          website: 'https://www.telefonodelaesperanza.org/',
          description: 'Free emotional support and crisis intervention helpline. Provides professional support for people in emotional distress or crisis.',
          availability: '24/7',
          country: 'ES',
          language: 'Spanish',
          order: 2,
          tags: 'emotional support, crisis intervention, 24/7'
        },
        {
          name: 'ANAR Foundation (Youth)',
          type: 'HOTLINE',
          phoneNumber: '900 202 010',
          website: 'https://www.anar.org/',
          description: 'Free helpline for children and adolescents providing psychological support, crisis intervention, and suicide prevention resources.',
          availability: '24/7',
          country: 'ES',
          language: 'Spanish',
          order: 3,
          tags: 'youth, children, psychological support, 24/7'
        },
        {
          name: '112 Emergency Services',
          type: 'EMERGENCY',
          phoneNumber: '112',
          description: 'European emergency number for immediate life-threatening emergencies in Spain.',
          availability: '24/7',
          country: 'ES',
          language: 'Spanish, English',
          order: 4,
          tags: 'emergency, 112, immediate danger'
        },

        // ===== BRAZIL =====
        {
          name: 'CVV – Centro de Valorização da Vida',
          type: 'HOTLINE',
          phoneNumber: '188',
          website: 'https://www.cvv.org.br/',
          description: 'Free, confidential emotional support and suicide prevention. Volunteers available 24/7 via phone, chat, and email for anyone in emotional distress.',
          availability: '24/7',
          country: 'BR',
          language: 'Portuguese',
          order: 1,
          tags: 'suicide prevention, emotional support, 24/7'
        },
        {
          name: 'CAPS – Centro de Atenção Psicossocial',
          type: 'CHAT_SERVICE',
          website: 'https://www.gov.br/saude/',
          description: 'Brazil\'s national network of community mental health centers providing free psychiatric and psychological care through the public health system (SUS).',
          availability: 'Varies by location',
          country: 'BR',
          language: 'Portuguese',
          order: 2,
          tags: 'community mental health, public health, psychiatric care'
        },
        {
          name: 'SAMU Emergency',
          type: 'EMERGENCY',
          phoneNumber: '192',
          description: 'Mobile Emergency Care Service (SAMU) for medical and psychiatric emergencies in Brazil.',
          availability: '24/7',
          country: 'BR',
          language: 'Portuguese',
          order: 3,
          tags: 'emergency, 192, medical emergency'
        },

        // ===== JAPAN =====
        {
          name: 'Yorisoi Hotline',
          type: 'HOTLINE',
          phoneNumber: '0120-279-338',
          description: 'Free, 24-hour hotline offering multilingual support for people in distress. Provides counseling for mental health, living difficulties, domestic violence, and more.',
          availability: '24/7',
          country: 'JP',
          language: 'Japanese, English, and other languages',
          order: 1,
          tags: 'crisis, multilingual, 24/7, domestic violence'
        },
        {
          name: 'TELL Lifeline',
          type: 'HOTLINE',
          phoneNumber: '03-5774-0992',
          website: 'https://telljp.com/',
          description: 'Free, confidential support in English for individuals experiencing distress or suicidal thoughts in Japan. Professional counseling available.',
          availability: '9am-11pm daily',
          country: 'JP',
          language: 'English',
          order: 2,
          tags: 'English support, counseling, suicide prevention'
        },
        {
          name: 'Inochi no Denwa (いのちの電話)',
          type: 'HOTLINE',
          phoneNumber: '0570-783-556',
          description: 'Japanese mental health and suicide prevention hotline. Provides emotional support and crisis intervention by trained volunteers.',
          availability: '24/7',
          country: 'JP',
          language: 'Japanese',
          order: 3,
          tags: 'suicide prevention, mental health, 24/7'
        },
        {
          name: '119 Emergency Services',
          type: 'EMERGENCY',
          phoneNumber: '119',
          description: 'For immediate life-threatening emergencies and medical emergencies in Japan. Call 110 for police.',
          availability: '24/7',
          country: 'JP',
          language: 'Japanese',
          order: 4,
          tags: 'emergency, 119, immediate danger'
        },

        // ===== SINGAPORE =====
        {
          name: 'National mindline 1771',
          type: 'HOTLINE',
          phoneNumber: '1771',
          website: 'https://mindline.sg/',
          description: 'Singapore\'s national mental health support line. Free, confidential 24/7 support via call, WhatsApp (6669 1771), and online chat.',
          availability: '24/7',
          country: 'SG',
          language: 'English, Mandarin, Malay, Tamil',
          order: 1,
          tags: 'mental health, national, multilingual, 24/7'
        },
        {
          name: 'Samaritans of Singapore (SOS)',
          type: 'HOTLINE',
          phoneNumber: '1-767',
          website: 'https://www.sos.org.sg/',
          description: 'Free, 24-hour crisis hotline providing emotional support for anyone in crisis, thinking about suicide, or affected by suicide.',
          availability: '24/7',
          country: 'SG',
          language: 'English',
          order: 2,
          tags: 'crisis, suicide prevention, 24/7'
        },
        {
          name: 'Institute of Mental Health (IMH)',
          type: 'HOTLINE',
          phoneNumber: '6389 2222',
          website: 'https://www.imh.com.sg/',
          description: 'Singapore\'s national psychiatric hospital helpline. Provides mental health assessment, treatment referrals, and 24/7 emergency psychiatric services.',
          availability: '24/7',
          country: 'SG',
          language: 'English, Mandarin',
          order: 3,
          tags: 'psychiatric services, hospital, treatment referral'
        },
        {
          name: '995 Emergency Services',
          type: 'EMERGENCY',
          phoneNumber: '995',
          description: 'For immediate life-threatening emergencies in Singapore. Call 995 for ambulance and fire services, or 999 for police.',
          availability: '24/7',
          country: 'SG',
          language: 'English',
          order: 4,
          tags: 'emergency, 995, immediate danger'
        },

        // ===== UNITED ARAB EMIRATES =====
        {
          name: 'Hope Line – Mental Health Support',
          type: 'HOTLINE',
          phoneNumber: '800-HOPE (4673)',
          website: 'https://www.mohap.gov.ae/',
          description: 'Free, confidential mental health support line operated by the UAE Ministry of Health and Prevention. Provides counseling and crisis support.',
          availability: '24/7',
          country: 'AE',
          language: 'Arabic, English',
          order: 1,
          tags: 'mental health, counseling, government, 24/7'
        },
        {
          name: 'Dubai Community Health Center',
          type: 'HOTLINE',
          phoneNumber: '800-4673',
          website: 'https://www.dha.gov.ae/',
          description: 'Mental health support and referral services for Dubai residents. Provides counseling, psychiatric assessments, and treatment referrals.',
          availability: 'Sun-Thu 8am-8pm',
          country: 'AE',
          language: 'Arabic, English',
          order: 2,
          tags: 'mental health, counseling, Dubai'
        },
        {
          name: 'Emirates Health Services (EHS) Helpline',
          type: 'HOTLINE',
          phoneNumber: '800-2342',
          website: 'https://www.ehs.gov.ae/',
          description: 'Government health helpline providing mental health information, referrals, and support across the UAE.',
          availability: '24/7',
          country: 'AE',
          language: 'Arabic, English',
          order: 3,
          tags: 'health, government, referral, 24/7'
        },
        {
          name: '999 Emergency Services',
          type: 'EMERGENCY',
          phoneNumber: '999',
          description: 'For immediate life-threatening emergencies in the UAE. Call 999 for police, or 998 for ambulance services.',
          availability: '24/7',
          country: 'AE',
          language: 'Arabic, English',
          order: 4,
          tags: 'emergency, 999, immediate danger'
        }
      ]
    });
    console.log(`✅ Created ${crisisResources.count} crisis resources`);

    // ===== SEED THERAPISTS =====
    console.log('Creating therapist directory...');
    const therapists = await prisma.therapist.createMany({
      data: [
        {
          name: 'Dr. Sarah Johnson',
          credential: 'PSYCHOLOGIST',
          title: 'Clinical Psychologist, PhD',
          bio: 'Dr. Johnson specializes in cognitive-behavioral therapy (CBT) and mindfulness-based interventions. With over 15 years of experience, she helps clients manage anxiety, depression, and stress. She creates a warm, non-judgmental space where clients can explore their thoughts and feelings.',
          specialtiesJson: JSON.stringify(['Anxiety', 'Depression', 'Stress Management', 'CBT', 'Mindfulness']),
          email: 'sarah.johnson@example.com',
          phone: '(555) 123-4567',
          website: 'https://www.drjohnsontherapy.com',
          street: '123 Main Street, Suite 200',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94102',
          country: 'US',
          acceptsInsurance: true,
          insurances: JSON.stringify(['Aetna', 'Blue Cross Blue Shield', 'UnitedHealthcare', 'Cigna']),
          sessionFee: 150,
          offersSliding: true,
          availabilityJson: JSON.stringify([
            { day: 'Monday', times: ['9:00 AM - 5:00 PM'] },
            { day: 'Tuesday', times: ['9:00 AM - 5:00 PM'] },
            { day: 'Wednesday', times: ['9:00 AM - 5:00 PM'] },
            { day: 'Thursday', times: ['9:00 AM - 5:00 PM'] }
          ]),
          yearsExperience: 15,
          languages: 'English, Spanish',
          isVerified: true,
          isActive: true
        },
        {
          name: 'Michael Chen, LCSW',
          credential: 'LCSW',
          title: 'Licensed Clinical Social Worker',
          bio: 'Michael Chen is a compassionate therapist specializing in trauma-informed care and EMDR therapy. He works with individuals who have experienced trauma, PTSD, grief, and relationship issues. His approach is client-centered and evidence-based.',
          specialtiesJson: JSON.stringify(['Trauma', 'PTSD', 'EMDR', 'Grief', 'Relationship Issues']),
          email: 'michael.chen@example.com',
          phone: '(555) 234-5678',
          website: 'https://www.chentherapy.com',
          street: '456 Oak Avenue, Building B',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90001',
          country: 'US',
          acceptsInsurance: true,
          insurances: JSON.stringify(['Aetna', 'Kaiser Permanente', 'Blue Shield', 'Medicare']),
          sessionFee: 120,
          offersSliding: true,
          availabilityJson: JSON.stringify([
            { day: 'Tuesday', times: ['10:00 AM - 7:00 PM'] },
            { day: 'Wednesday', times: ['10:00 AM - 7:00 PM'] },
            { day: 'Thursday', times: ['10:00 AM - 7:00 PM'] },
            { day: 'Friday', times: ['10:00 AM - 3:00 PM'] }
          ]),
          yearsExperience: 10,
          languages: 'English, Mandarin',
          isVerified: true,
          isActive: true
        },
        {
          name: 'Dr. Emily Rodriguez',
          credential: 'PSYCHIATRIST',
          title: 'Board-Certified Psychiatrist, MD',
          bio: 'Dr. Rodriguez is a board-certified psychiatrist with expertise in medication management for depression, anxiety, bipolar disorder, and other mental health conditions. She takes a holistic approach, combining medication when appropriate with therapy referrals and lifestyle interventions.',
          specialtiesJson: JSON.stringify(['Medication Management', 'Depression', 'Anxiety', 'Bipolar Disorder', 'Psychiatric Evaluation']),
          email: 'emily.rodriguez@example.com',
          phone: '(555) 345-6789',
          website: 'https://www.drrodriguezpsych.com',
          street: '789 Pine Street, Suite 500',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US',
          acceptsInsurance: true,
          insurances: JSON.stringify(['Aetna', 'Blue Cross Blue Shield', 'UnitedHealthcare', 'Cigna', 'Medicare']),
          sessionFee: 200,
          offersSliding: false,
          availabilityJson: JSON.stringify([
            { day: 'Monday', times: ['8:00 AM - 4:00 PM'] },
            { day: 'Wednesday', times: ['8:00 AM - 4:00 PM'] },
            { day: 'Friday', times: ['8:00 AM - 12:00 PM'] }
          ]),
          yearsExperience: 12,
          languages: 'English, Spanish',
          isVerified: true,
          isActive: true
        },
        {
          name: 'Jessica Williams, LMFT',
          credential: 'LMFT',
          title: 'Licensed Marriage and Family Therapist',
          bio: 'Jessica Williams specializes in couples therapy, family therapy, and relationship counseling. She helps couples improve communication, resolve conflicts, and rebuild intimacy. Her approach is collaborative and strengths-based.',
          specialtiesJson: JSON.stringify(['Couples Therapy', 'Family Therapy', 'Relationship Issues', 'Communication', 'Premarital Counseling']),
          email: 'jessica.williams@example.com',
          phone: '(555) 456-7890',
          website: 'https://www.williamstherapy.com',
          street: '321 Maple Drive',
          city: 'Seattle',
          state: 'WA',
          zipCode: '98101',
          country: 'US',
          acceptsInsurance: true,
          insurances: JSON.stringify(['Premera Blue Cross', 'Regence', 'Aetna']),
          sessionFee: 140,
          offersSliding: true,
          availabilityJson: JSON.stringify([
            { day: 'Monday', times: ['1:00 PM - 8:00 PM'] },
            { day: 'Tuesday', times: ['1:00 PM - 8:00 PM'] },
            { day: 'Thursday', times: ['1:00 PM - 8:00 PM'] },
            { day: 'Saturday', times: ['10:00 AM - 2:00 PM'] }
          ]),
          yearsExperience: 8,
          languages: 'English',
          isVerified: true,
          isActive: true
        },
        {
          name: 'Dr. James Thompson',
          credential: 'PSYCHOLOGIST',
          title: 'Clinical Psychologist, PsyD',
          bio: 'Dr. Thompson specializes in treating OCD, panic disorder, and phobias using evidence-based approaches like Exposure and Response Prevention (ERP) and CBT. He has extensive experience helping clients overcome debilitating anxiety and reclaim their lives.',
          specialtiesJson: JSON.stringify(['OCD', 'Panic Disorder', 'Phobias', 'ERP', 'CBT', 'Anxiety Disorders']),
          email: 'james.thompson@example.com',
          phone: '(555) 567-8901',
          website: 'https://www.thompsonpsychology.com',
          street: '654 Elm Street, Suite 300',
          city: 'Boston',
          state: 'MA',
          zipCode: '02101',
          country: 'US',
          acceptsInsurance: true,
          insurances: JSON.stringify(['Blue Cross Blue Shield', 'Harvard Pilgrim', 'Tufts Health Plan']),
          sessionFee: 160,
          offersSliding: false,
          availabilityJson: JSON.stringify([
            { day: 'Monday', times: ['9:00 AM - 5:00 PM'] },
            { day: 'Wednesday', times: ['9:00 AM - 5:00 PM'] },
            { day: 'Friday', times: ['9:00 AM - 5:00 PM'] }
          ]),
          yearsExperience: 18,
          languages: 'English',
          isVerified: true,
          isActive: true
        }
      ]
    });
    console.log(`✅ Created ${therapists.count} therapists`);

    console.log('✅ Help & Safety system seeding complete!');
  } catch (error) {
    console.error('❌ Error seeding Help & Safety data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedHelpSafetyData()
  .catch((error) => {
    console.error('Seed script failed:', error);
    process.exit(1);
  });
