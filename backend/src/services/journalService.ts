import { prisma } from '../config/database';
import { llmService } from './llmProvider';
import { logger } from '../utils/logger';

const journalLogger = logger.child({ module: 'JournalService' });

type EmotionProfile = 'anxiety' | 'stress' | 'sadness' | 'anger' | 'neutral' | 'positive';
type ApproachProfile = 'western' | 'eastern' | 'hybrid';

const PROMPT_LIBRARY: Record<ApproachProfile, Record<EmotionProfile, string[]>> = {
  western: {
    anxiety: [
      'Write the worry down. What evidence supports it, and what evidence challenges it?',
      'What is the worst-case thought right now, and what is a more balanced possibility?',
      'If a close friend had this fear, what grounded advice would you give them?'
    ],
    stress: [
      'List the top 3 stressors today. Which one can you influence in the next 20 minutes?',
      'What boundary would make today 10% lighter?',
      'What task is heavy because it is unclear? Define the next smallest step.'
    ],
    sadness: [
      'Name what hurts right now, then name one thing that still matters to you today.',
      'What story are you telling yourself about this moment, and is there another possible story?',
      'Write a compassionate note to yourself as if you were mentoring someone you care about.'
    ],
    anger: [
      'What value feels crossed right now, and what respectful action would protect it?',
      'What part is fact, and what part is interpretation?',
      'Describe the trigger in one sentence. What response aligns with your long-term goals?'
    ],
    neutral: [
      'What thought loop keeps returning lately, and what pattern do you notice?',
      'What did you do today that supported your wellbeing, even a little?',
      'What would make tomorrow feel 5% more manageable?'
    ],
    positive: [
      'What went well today, and what did you do that helped it happen?',
      'Capture one win and why it matters to you.',
      'What habit is quietly improving your wellbeing lately?'
    ]
  },
  eastern: {
    anxiety: [
      'Notice where anxiety sits in your body. Describe the sensation with curiosity, not judgment.',
      'Take three slow breaths, then write what changed in your body after each breath.',
      'If this anxiety had a voice, what is it trying to protect?'
    ],
    stress: [
      'Pause and scan from head to toe. Where is tension strongest right now?',
      'Write one sentence for each breath: inhale calm, exhale pressure.',
      'Describe one ritual that would help you return to the present moment.'
    ],
    sadness: [
      'Place a hand on your heart and write what your heart most needs to hear right now.',
      'What feeling is present, and can you allow it space without fixing it?',
      'Write a short compassion mantra for this moment.'
    ],
    anger: [
      'Where does anger live in your body right now? Describe heat, movement, and intensity.',
      'Breathe into the strongest sensation for 30 seconds, then write what shifted.',
      'What response would honor both truth and calm?'
    ],
    neutral: [
      'What sensations are most vivid in your body right now?',
      'Write about this moment using only present-tense language.',
      'What are three small things you can appreciate in your environment right now?'
    ],
    positive: [
      'Savor one moment from today in detail: what did you see, hear, and feel?',
      'What quality in you created today\'s ease?',
      'Write a gratitude line for your mind, your body, and someone in your life.'
    ]
  },
  hybrid: {
    anxiety: [
      'Name the anxious thought, then name the body sensation that comes with it. What helps both settle?',
      'Write one balanced thought and pair it with one calming breath pattern.',
      'What is one realistic action and one grounding ritual you can do in the next 10 minutes?'
    ],
    stress: [
      'What thought is creating pressure, and where do you feel it physically?',
      'Write one practical next step, then one mindful pause to support it.',
      'What can you release today, and what can you gently commit to?'
    ],
    sadness: [
      'Write the feeling honestly, then add one sentence of self-compassion.',
      'What belief is heavy right now, and what kinder truth can sit beside it?',
      'What small action and small comfort could support you tonight?'
    ],
    anger: [
      'Name the trigger thought and the strongest body sensation. What response protects your values calmly?',
      'Write a boundary statement, then a calming breath cue to deliver it steadily.',
      'What would your wisest self do in this exact moment?'
    ],
    neutral: [
      'What pattern is emerging this week in your thoughts, mood, and energy?',
      'Write one insight from your mind and one signal from your body.',
      'What micro habit would support both clarity and calm tomorrow?'
    ],
    positive: [
      'What personal strength showed up today, and how did it feel in your body?',
      'Capture one win, one gratitude, and one intention for tomorrow.',
      'What helped you feel balanced today that you can repeat this week?'
    ]
  }
};

const TAG_KEYWORDS: Record<string, string[]> = {
  work: ['work', 'job', 'boss', 'office', 'deadline', 'meeting', 'project'],
  academics: ['study', 'exam', 'college', 'university', 'class', 'assignment', 'grade'],
  relationships: ['friend', 'partner', 'relationship', 'family', 'parent', 'argument', 'support'],
  anxiety: ['anxious', 'panic', 'worry', 'overthinking', 'fear', 'nervous'],
  stress: ['stressed', 'pressure', 'overwhelmed', 'burnout', 'tired', 'fatigue'],
  sleep: ['sleep', 'insomnia', 'night', 'rest', 'awake', 'dream'],
  confidence: ['confidence', 'self-esteem', 'doubt', 'capable', 'worth'],
  health: ['health', 'body', 'exercise', 'pain', 'medication', 'routine'],
  finance: ['money', 'rent', 'salary', 'loan', 'debt', 'expense', 'financial'],
  grief: ['loss', 'grief', 'miss', 'death', 'mourning'],
  gratitude: ['grateful', 'thankful', 'appreciate', 'blessed'],
  progress: ['improve', 'better', 'progress', 'streak', 'consistent']
};

const STOP_WORDS = new Set([
  'the', 'and', 'that', 'with', 'this', 'from', 'have', 'been', 'were', 'your', 'about', 'just',
  'into', 'what', 'when', 'where', 'which', 'there', 'their', 'them', 'because', 'could', 'would',
  'should', 'while', 'today', 'tomorrow', 'after', 'before', 'very', 'really', 'then', 'than'
]);

const positiveMoods = new Set(['great', 'good', 'calm', 'content', 'hopeful']);
const negativeMoods = new Set(['struggling', 'anxious', 'sad', 'angry', 'overwhelmed']);

function normalizeApproach(value?: string | null): ApproachProfile {
  if (value === 'western' || value === 'eastern' || value === 'hybrid') {
    return value;
  }
  return 'hybrid';
}

function normalizeEmotion(value?: string | null): EmotionProfile {
  const lower = (value || '').trim().toLowerCase();
  if (['anxiety', 'anxious', 'panic', 'worry'].includes(lower)) return 'anxiety';
  if (['stress', 'stressed', 'overwhelmed', 'burnout'].includes(lower)) return 'stress';
  if (['sadness', 'sad', 'low', 'down'].includes(lower)) return 'sadness';
  if (['anger', 'angry', 'frustrated', 'irritated'].includes(lower)) return 'anger';
  if (['positive', 'good', 'great', 'happy', 'calm', 'hopeful'].includes(lower)) return 'positive';
  return 'neutral';
}

function getWeekStart(date = new Date()): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  const diffToMonday = (day + 6) % 7;
  copy.setDate(copy.getDate() - diffToMonday);
  return copy;
}

function safeJsonArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
}

export class JournalService {
  getPromptForState(emotion: string, approach: string): string {
    const normalizedApproach = normalizeApproach(approach);
    const normalizedEmotion = normalizeEmotion(emotion);
    const promptPool = PROMPT_LIBRARY[normalizedApproach][normalizedEmotion];

    // Deterministic daily prompt rotation keeps prompts fresh but stable within a day.
    const daySeed = new Date().getDate();
    const index = daySeed % promptPool.length;
    return promptPool[index];
  }

  extractTags(content: string): string[] {
    const lower = content.toLowerCase();
    const tags = new Set<string>();

    for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
      if (keywords.some((keyword) => lower.includes(keyword))) {
        tags.add(tag);
      }
    }

    if (tags.size < 3) {
      const freq = new Map<string, number>();
      const words = lower
        .replace(/[^a-z\s]/g, ' ')
        .split(/\s+/)
        .filter((word) => word.length >= 4 && !STOP_WORDS.has(word));

      for (const word of words) {
        freq.set(word, (freq.get(word) || 0) + 1);
      }

      const topWords = Array.from(freq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([word]) => word);

      topWords.forEach((word) => tags.add(word));
    }

    return Array.from(tags).slice(0, 5);
  }

  private buildPatterns(entries: Array<{
    mood: string | null;
    tags: unknown;
    createdAt: Date;
  }>): { recurringThemes: string[]; emotionalTrend: string; insights: string[] } {
    const tagCounts = new Map<string, number>();
    const moodCounts = new Map<string, number>();

    for (const entry of entries) {
      safeJsonArray(entry.tags).forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });

      if (entry.mood) {
        const normalized = entry.mood.toLowerCase();
        moodCounts.set(normalized, (moodCounts.get(normalized) || 0) + 1);
      }
    }

    const recurringThemes = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([tag]) => tag);

    const positiveCount = Array.from(moodCounts.entries())
      .filter(([mood]) => positiveMoods.has(mood))
      .reduce((sum, [, count]) => sum + count, 0);

    const negativeCount = Array.from(moodCounts.entries())
      .filter(([mood]) => negativeMoods.has(mood))
      .reduce((sum, [, count]) => sum + count, 0);

    let emotionalTrend = 'stable';
    if (positiveCount >= negativeCount + 2) {
      emotionalTrend = 'improving';
    } else if (negativeCount >= positiveCount + 2) {
      emotionalTrend = 'heavy';
    }

    const insights: string[] = [];
    if (recurringThemes.length > 0) {
      insights.push(`Recurring themes: ${recurringThemes.slice(0, 3).join(', ')}`);
    }
    if (entries.length >= 4) {
      insights.push('Strong journaling consistency this week.');
    }
    if (emotionalTrend === 'improving') {
      insights.push('Mood language is gradually becoming more positive.');
    } else if (emotionalTrend === 'heavy') {
      insights.push('Emotional load has remained high; add gentle support prompts.');
    }

    return {
      recurringThemes,
      emotionalTrend,
      insights: insights.slice(0, 4)
    };
  }

  async generateWeeklyReflection(userId: string) {
    const weekOf = getWeekStart(new Date());

    const entries = await prisma.journalEntry.findMany({
      where: {
        userId,
        createdAt: { gte: weekOf }
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        prompt: true,
        content: true,
        mood: true,
        tags: true,
        createdAt: true
      }
    });

    const patterns = this.buildPatterns(entries);

    const fallbackSummary = entries.length === 0
      ? 'No journal entries recorded this week yet. Start with a short reflection to build momentum.'
      : 'You showed up for reflection this week. Keep the momentum by combining one practical action with one self-compassion practice each day.';

    let aiSummary = fallbackSummary;
    if (entries.length > 0) {
      try {
        const condensedEntries = entries
          .slice(-7)
          .map((entry, index) => {
            const snippet = entry.content.replace(/\s+/g, ' ').slice(0, 220);
            const tags = safeJsonArray(entry.tags).join(', ');
            return `${index + 1}. Mood: ${entry.mood || 'unspecified'} | Tags: ${tags || 'none'} | ${snippet}`;
          })
          .join('\n');

        const response = await llmService.generateResponse(
          [
            {
              role: 'system',
              content:
                'You are an empathetic journaling reflection assistant. Summarize themes, emotional patterns, and progress in 120-150 words. Keep warm, practical, and non-clinical.'
            },
            {
              role: 'user',
              content: `Create a weekly reflection for these journal entries:\n${condensedEntries}`
            }
          ],
          {
            maxTokens: 220,
            temperature: 0.4
          }
        );

        if (response?.content?.trim()) {
          aiSummary = response.content.trim();
        }
      } catch (error) {
        journalLogger.warn({ userId, err: error }, 'Failed to generate AI journal reflection; using fallback summary');
      }
    }

    const reflection = await prisma.journalReflection.upsert({
      where: { userId },
      create: {
        userId,
        weekOf,
        patterns: patterns as any,
        aiSummary
      },
      update: {
        weekOf,
        patterns: patterns as any,
        aiSummary
      }
    });

    return reflection;
  }

  async getOrGenerateWeeklyReflection(userId: string) {
    const weekOf = getWeekStart(new Date());

    const existing = await prisma.journalReflection.findUnique({
      where: { userId }
    });

    if (existing && existing.weekOf.getTime() === weekOf.getTime()) {
      return existing;
    }

    return this.generateWeeklyReflection(userId);
  }
}

export const journalService = new JournalService();
