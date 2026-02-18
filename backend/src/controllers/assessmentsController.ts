import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import Joi from 'joi';
import { prisma } from '../config/database';
import { 
  AppError,
  NotFoundError, 
  BadRequestError,
  DatabaseError 
} from '../shared/errors/AppError';
import { AssessmentDetailContext, AssessmentInsightsPayload, buildAssessmentInsights } from '../services/assessmentInsightsService';

type TemplateBaseType = 'anxiety' | 'stress' | 'trauma' | 'overthinking' | 'emotionalIntelligence' | 'personality' | 'depression';

const ASSESSMENT_TEMPLATE_MAP: Record<TemplateBaseType, { definitionId: string }> = {
  anxiety: { definitionId: 'anxiety_assessment' },
  stress: { definitionId: 'stress_pss10' },
  trauma: { definitionId: 'trauma_pcl5' },
  overthinking: { definitionId: 'overthinking_ptq' },
  emotionalIntelligence: { definitionId: 'emotional_intelligence_teique' },
  personality: { definitionId: 'personality_mini_ipip' },
  depression: { definitionId: 'depression_phq9' }
};

const TEMPLATE_TYPE_ALIASES: Record<string, TemplateBaseType> = {
  'anxiety_assessment': 'anxiety',
  'anxiety': 'anxiety',
  'gad7': 'anxiety',
  'gad-7': 'anxiety',
  'anxiety_gad7': 'anxiety',
  'anxiety_gad2': 'anxiety', // Basic GAD-2 screening
  'stress_pss10': 'stress',
  'stressassessment': 'stress',
  'stresslevelcheck': 'stress',
  'pss10': 'stress',
  'stress_pss4': 'stress', // Basic PSS-4 screening
  'trauma_pcl5': 'trauma',
  'traumafear': 'trauma',
  'trauma-fear': 'trauma',
  'pcl5': 'trauma',
  'trauma_pcptsd5': 'trauma', // Basic PC-PTSD-5 screening
  'overthinking_brooding': 'overthinking',
  'overthinkingpatterns': 'overthinking',
  'overthinking_ptq': 'overthinking',
  'ptq': 'overthinking',
  'overthinking_rrs4': 'overthinking', // Basic RRS-4 screening
  'emotional_intelligence_ei10': 'emotionalIntelligence',
  'emotional_intelligence_teique': 'emotionalIntelligence',
  'emotional-intelligence': 'emotionalIntelligence',
  'teique_sf': 'emotionalIntelligence',
  'emotional_intelligence_eq5': 'emotionalIntelligence', // Basic EQ-5 screening
  'personality_mini_ipip': 'personality',
  'personality': 'personality',
  'mini_ipip': 'personality',
  'archetypes': 'personality',
  'psychological_archetypes': 'personality',
  'psychologicalarchetypes': 'personality',
  'personality_bigfive10': 'personality', // Basic Big Five-10 screening
  'depression_phq9': 'depression',
  'phq9': 'depression',
  'phq-9': 'depression',
  'depression_phq2': 'depression' // Basic PHQ-2 screening
};

type TemplateInterpretationBand = { max: number; label: string };

type TemplateDomain = {
  id: string;
  label: string;
  items: string[];
  minScore: number;
  maxScore: number;
  interpretationBands?: TemplateInterpretationBand[];
};

type TemplateScoring = {
  minScore: number;
  maxScore: number;
  interpretationBands: TemplateInterpretationBand[];
  reverseScored?: string[];
  domains?: TemplateDomain[];
  higherIsBetter?: boolean;
};

const TRAUMA_DOMAIN_DEFINITIONS: Array<{ id: string; label: string; items: string[] }> = [
  { id: 'intrusion', label: 'Intrusion', items: ['trauma_pcl5_pcl5_q1', 'trauma_pcl5_pcl5_q2', 'trauma_pcl5_pcl5_q3', 'trauma_pcl5_pcl5_q4', 'trauma_pcl5_pcl5_q5'] },
  { id: 'avoidance', label: 'Avoidance', items: ['trauma_pcl5_pcl5_q6', 'trauma_pcl5_pcl5_q7'] },
  { id: 'negative-mood', label: 'Negative Mood & Cognition', items: ['trauma_pcl5_pcl5_q8', 'trauma_pcl5_pcl5_q9', 'trauma_pcl5_pcl5_q10', 'trauma_pcl5_pcl5_q11', 'trauma_pcl5_pcl5_q12', 'trauma_pcl5_pcl5_q13', 'trauma_pcl5_pcl5_q14'] },
  { id: 'arousal', label: 'Arousal & Reactivity', items: ['trauma_pcl5_pcl5_q15', 'trauma_pcl5_pcl5_q16', 'trauma_pcl5_pcl5_q17', 'trauma_pcl5_pcl5_q18', 'trauma_pcl5_pcl5_q19', 'trauma_pcl5_pcl5_q20'] }
];

const TRAUMA_DOMAINS: TemplateDomain[] = TRAUMA_DOMAIN_DEFINITIONS.map((domain) => {
  const maxScore = domain.items.length * 4;
  const lowCutoff = Math.round(maxScore * 0.33);
  const moderateCutoff = Math.round(maxScore * 0.66);
  return {
    ...domain,
    minScore: 0,
    maxScore,
    interpretationBands: [
      { max: lowCutoff, label: 'Low activation' },
      { max: moderateCutoff, label: 'Moderate activation' },
      { max: maxScore, label: 'High activation' }
    ]
  };
});

const MINI_IPIP_REVERSE_ITEMS = [
  'personality_mini_ipip_mini_ipip_q3',
  'personality_mini_ipip_mini_ipip_q4',
  'personality_mini_ipip_mini_ipip_q7',
  'personality_mini_ipip_mini_ipip_q8',
  'personality_mini_ipip_mini_ipip_q11',
  'personality_mini_ipip_mini_ipip_q12',
  'personality_mini_ipip_mini_ipip_q15',
  'personality_mini_ipip_mini_ipip_q16',
  'personality_mini_ipip_mini_ipip_q18',
  'personality_mini_ipip_mini_ipip_q20'
];

const TEIQUE_REVERSE_ITEMS = [
  'emotional_intelligence_teique_teique_q2',
  'emotional_intelligence_teique_teique_q4',
  'emotional_intelligence_teique_teique_q5',
  'emotional_intelligence_teique_teique_q7',
  'emotional_intelligence_teique_teique_q8',
  'emotional_intelligence_teique_teique_q10',
  'emotional_intelligence_teique_teique_q12',
  'emotional_intelligence_teique_teique_q13',
  'emotional_intelligence_teique_teique_q14',
  'emotional_intelligence_teique_teique_q16',
  'emotional_intelligence_teique_teique_q18',
  'emotional_intelligence_teique_teique_q22',
  'emotional_intelligence_teique_teique_q25',
  'emotional_intelligence_teique_teique_q26',
  'emotional_intelligence_teique_teique_q28'
];

const buildMiniIpipDomain = (id: string, label: string, items: string[]): TemplateDomain => {
  const minScore = items.length * 1;
  const maxScore = items.length * 5;
  const subtleCutoff = minScore + Math.round(items.length * 1.5);
  const balancedCutoff = minScore + Math.round(items.length * 3);
  return {
    id,
    label,
    items,
    minScore,
    maxScore,
    interpretationBands: [
      { max: subtleCutoff, label: 'Subtle trait expression' },
      { max: balancedCutoff, label: 'Balanced trait expression' },
      { max: maxScore, label: 'Strong trait expression' }
    ]
  };
};

const MINI_IPIP_DOMAINS: TemplateDomain[] = [
  buildMiniIpipDomain('extraversion', 'Extraversion', ['personality_mini_ipip_mini_ipip_q1', 'personality_mini_ipip_mini_ipip_q2', 'personality_mini_ipip_mini_ipip_q3', 'personality_mini_ipip_mini_ipip_q4']),
  buildMiniIpipDomain('agreeableness', 'Agreeableness', ['personality_mini_ipip_mini_ipip_q5', 'personality_mini_ipip_mini_ipip_q6', 'personality_mini_ipip_mini_ipip_q7', 'personality_mini_ipip_mini_ipip_q8']),
  buildMiniIpipDomain('conscientiousness', 'Conscientiousness', ['personality_mini_ipip_mini_ipip_q9', 'personality_mini_ipip_mini_ipip_q10', 'personality_mini_ipip_mini_ipip_q11', 'personality_mini_ipip_mini_ipip_q12']),
  buildMiniIpipDomain('neuroticism', 'Neuroticism', ['personality_mini_ipip_mini_ipip_q13', 'personality_mini_ipip_mini_ipip_q14', 'personality_mini_ipip_mini_ipip_q15', 'personality_mini_ipip_mini_ipip_q16']),
  buildMiniIpipDomain('openness', 'Openness', ['personality_mini_ipip_mini_ipip_q17', 'personality_mini_ipip_mini_ipip_q18', 'personality_mini_ipip_mini_ipip_q19', 'personality_mini_ipip_mini_ipip_q20'])
];

const TEMPLATE_SCORING: Record<TemplateBaseType, TemplateScoring> = {
  anxiety: {
    minScore: 0,
    maxScore: 21,
    interpretationBands: [
      { max: 4, label: 'Minimal anxiety' },
      { max: 9, label: 'Mild anxiety' },
      { max: 14, label: 'Moderate anxiety' },
      { max: 21, label: 'Severe anxiety' }
    ],
    higherIsBetter: false
  },
  stress: {
    minScore: 0,
    maxScore: 40,
  reverseScored: ['stress_pss10_pss10_q4', 'stress_pss10_pss10_q5', 'stress_pss10_pss10_q6', 'stress_pss10_pss10_q7', 'stress_pss10_pss10_q9'],
    interpretationBands: [
      { max: 13, label: 'Low perceived stress' },
      { max: 26, label: 'Moderate perceived stress' },
      { max: 40, label: 'High perceived stress' }
    ],
    higherIsBetter: false
  },
  trauma: {
    minScore: 0,
    maxScore: 80,
    interpretationBands: [
      { max: 19, label: 'Minimal trauma-related distress' },
      { max: 39, label: 'Mild trauma activation' },
      { max: 59, label: 'Moderate trauma activation' },
      { max: 80, label: 'Severe trauma activation' }
    ],
    domains: TRAUMA_DOMAINS,
    higherIsBetter: false
  },
  overthinking: {
    minScore: 0,
    maxScore: 60,
    interpretationBands: [
      { max: 15, label: 'Low repetitive negative thinking' },
      { max: 30, label: 'Moderate repetitive negative thinking' },
      { max: 45, label: 'High repetitive negative thinking' },
      { max: 60, label: 'Very high repetitive negative thinking' }
    ],
    higherIsBetter: false
  },
  emotionalIntelligence: {
    minScore: 30,
    maxScore: 210,
    reverseScored: TEIQUE_REVERSE_ITEMS,
    interpretationBands: [
      { max: 90, label: 'Low trait emotional intelligence' },
      { max: 150, label: 'Average trait emotional intelligence' },
      { max: 210, label: 'High trait emotional intelligence' }
    ],
    higherIsBetter: true
  },
  personality: {
    minScore: 20,
    maxScore: 100,
    reverseScored: MINI_IPIP_REVERSE_ITEMS,
    interpretationBands: [
      { max: 45, label: 'Reserved personality expression' },
      { max: 80, label: 'Balanced personality expression' },
      { max: 100, label: 'Pronounced personality expression' }
    ],
    domains: MINI_IPIP_DOMAINS,
    higherIsBetter: true
  },
  depression: {
    minScore: 0,
    maxScore: 27,
    interpretationBands: [
      { max: 4, label: 'Minimal depression' },
      { max: 9, label: 'Mild depression' },
      { max: 14, label: 'Moderate depression' },
      { max: 19, label: 'Moderately severe depression' },
      { max: 27, label: 'Severe depression' }
    ],
    higherIsBetter: false
  }
};

type AssessmentDefinitionWithQuestions = Prisma.AssessmentDefinitionGetPayload<{
  include: {
    questions: {
      include: {
        options: true;
      };
    };
  };
}>;

const cloneInterpretationBands = (bands: TemplateInterpretationBand[] | undefined): TemplateInterpretationBand[] | undefined => {
  if (!bands) return undefined;
  return bands.map((band) => ({ ...band }));
};

const cloneDomains = (domains: TemplateDomain[] | undefined): TemplateDomain[] | undefined => {
  if (!domains) return undefined;
  return domains.map((domain) => ({
    ...domain,
    items: [...domain.items],
    interpretationBands: cloneInterpretationBands(domain.interpretationBands)
  }));
};

const cloneScoring = (scoring: TemplateScoring): TemplateScoring => ({
  minScore: scoring.minScore,
  maxScore: scoring.maxScore,
  interpretationBands: cloneInterpretationBands(scoring.interpretationBands) ?? [],
  reverseScored: scoring.reverseScored ? [...scoring.reverseScored] : undefined,
  domains: cloneDomains(scoring.domains),
  higherIsBetter: scoring.higherIsBetter
});

const mapResponseTypeToUi = (responseType: string): 'likert' | 'binary' | 'multiple-choice' => {
  switch (responseType) {
    case 'yes_no':
      return 'binary';
    case 'multiple_choice':
      return 'multiple-choice';
    default:
      return 'likert';
  }
};

const resolveTemplateType = (rawType: string): TemplateBaseType | null => {
  if (!rawType) return null;
  if (rawType in ASSESSMENT_TEMPLATE_MAP) {
    return rawType as TemplateBaseType;
  }

  const trimmed = rawType.trim();
  const lower = trimmed.toLowerCase();

  const directMatch = (Object.keys(ASSESSMENT_TEMPLATE_MAP) as TemplateBaseType[]).find(
    (key) => key.toLowerCase() === lower
  );
  if (directMatch) {
    return directMatch;
  }

  const alias = TEMPLATE_TYPE_ALIASES[lower];
  return alias ?? null;
};

const formatAssessmentTemplate = (
  baseType: TemplateBaseType,
  definition: AssessmentDefinitionWithQuestions
) => {
  const scoring = cloneScoring(TEMPLATE_SCORING[baseType]);
  const reverseSet = new Set(scoring.reverseScored ?? []);
  const domainLookup = new Map<string, string>();

  scoring.domains?.forEach((domain) => {
    domain.items.forEach((item) => {
      domainLookup.set(item, domain.label);
    });
  });

  return {
    assessmentType: baseType,
    definitionId: definition.id,
    title: definition.name,
    description: definition.description ?? '',
    estimatedTime: definition.timeEstimate ?? null,
    scoring,
    questions: definition.questions
      .sort((a, b) => a.order - b.order)
      .map((question) => ({
        id: question.id,
        text: question.text,
        responseType: question.responseType,
        uiType: mapResponseTypeToUi(question.responseType),
        reverseScored: reverseSet.has(question.id),
        domain: domainLookup.get(question.id) ?? null,
        options: question.options
          .sort((a, b) => a.order - b.order)
          .map((option) => {
            const numericValue =
              typeof option.value === 'number' && !Number.isNaN(option.value)
                ? option.value
                : option.order - 1;

            return {
              id: option.id,
              value: numericValue,
              text: option.text,
              order: option.order
            };
          })
      }))
  };
};

// Format custom/dynamic assessment templates (those not in TEMPLATE_SCORING)
const formatCustomAssessmentTemplate = (
  definition: AssessmentDefinitionWithQuestions
) => {
  // Parse scoring config from the definition
  let scoring: any = {
    minScore: 0,
    maxScore: 0,
    interpretationBands: []
  };

  if (definition.scoringConfig) {
    try {
      const parsed = JSON.parse(definition.scoringConfig);
      scoring = {
        minScore: parsed.minScore ?? 0,
        maxScore: parsed.maxScore ?? 0,
        interpretationBands: parsed.interpretationBands ?? [],
        reverseScored: parsed.reverseScored ?? [],
        domains: parsed.domains ?? []
      };
    } catch (e) {
      console.warn('Failed to parse scoring config for custom assessment:', e);
    }
  }

  const reverseSet = new Set(scoring.reverseScored ?? []);
  const domainLookup = new Map<string, string>();

  scoring.domains?.forEach((domain: any) => {
    if (domain.questionIds) {
      domain.questionIds.forEach((qId: string) => {
        domainLookup.set(qId, domain.label);
      });
    }
  });

  return {
    assessmentType: definition.type,
    definitionId: definition.id,
    title: definition.name,
    description: definition.description ?? '',
    estimatedTime: definition.timeEstimate ?? null,
    scoring,
    questions: definition.questions
      .sort((a, b) => a.order - b.order)
      .map((question) => ({
        id: question.id,
        text: question.text,
        responseType: question.responseType,
        uiType: mapResponseTypeToUi(question.responseType),
        reverseScored: reverseSet.has(question.id) || question.reverseScored || false,
        domain: question.domain || domainLookup.get(question.id) || null,
        options: question.options
          .sort((a, b) => a.order - b.order)
          .map((option) => {
            const numericValue =
              typeof option.value === 'number' && !Number.isNaN(option.value)
                ? option.value
                : option.order - 1;

            return {
              id: option.id,
              value: numericValue,
              text: option.text,
              order: option.order
            };
          })
      }))
  };
};

// Static catalog of supported assessments (could be stored in DB in future)
const ASSESSMENT_CATALOG = [
  { id: 'depression', title: 'Depression Assessment (PHQ-9)', questions: 9 },
  { id: 'anxiety', title: 'Anxiety Assessment (GAD-7)', questions: 7 },
  { id: 'stress', title: 'Stress Assessment (PSS-10)', questions: 10 },
  { id: 'overthinking', title: 'Overthinking (Perseverative Thinking Questionnaire - PTQ)', questions: 15 },
  { id: 'emotionalIntelligence', title: 'Emotional Intelligence (TEIQue-SF)', questions: 30 },
  { id: 'trauma', title: 'Trauma & Fear Response (PCL-5)', questions: 20 },
  { id: 'personality_mini_ipip', title: 'Personality (Mini-IPIP)', questions: 20 }
];

// Allow both old and new assessment type names for backward compatibility
const VALID_ASSESSMENT_TYPES = [
  ...ASSESSMENT_CATALOG.map(a => a.id),
  'anxiety_assessment', // Legacy name for anxiety assessment
  'depression_phq9',
  'phq9',
  'stress_pss10',
  'overthinking_brooding',
  'overthinking_ptq',
  'trauma_pcl5',
  'emotional_intelligence_ei10',
  'emotional_intelligence_teique',
  'personality',
  'mini_ipip',
  'personality_bigfive10',
  // Basic assessment types (short screening versions)
  'anxiety_gad2',
  'depression_phq2',
  'stress_pss4',
  'overthinking_rrs4',
  'trauma_pcptsd5',
  'emotional_intelligence_eq5'
];

const submitSchema = Joi.object({
  assessmentType: Joi.string().required(), // Accept any string - will validate against database
  responses: Joi.object().required(),
  responseDetails: Joi.array()
    .items(
      Joi.object({
        questionId: Joi.string().required(),
        questionText: Joi.string().required(),
        answerLabel: Joi.string().allow('', null).default(''),
        answerValue: Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean()).allow(null),
        answerScore: Joi.number().optional()
      })
    )
    .optional(),
  score: Joi.number().min(0).max(100).required(),
  rawScore: Joi.number().optional(),
  maxScore: Joi.number().optional(),
  categoryBreakdown: Joi.object().optional()
});

export const listAssessments = async (_req: Request, res: Response) => {
  res.json({ success: true, data: ASSESSMENT_CATALOG });
};

/**
 * Get available assessments from database (excludes basic overall assessments)
 * Returns only active assessments that are visible in the main assessment list
 */
export const getAvailableAssessments = async (_req: Request, res: Response) => {
  try {
    const assessments = await prisma.assessmentDefinition.findMany({
      where: {
        isActive: true,
        visibleInMainList: true,
        isBasicOverallOnly: false
      },
      select: {
        id: true,
        name: true,
        type: true,
        category: true,
        description: true,
        timeEstimate: true,
        tags: true,
        _count: {
          select: { questions: true }
        }
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });

    const formattedAssessments = assessments.map((assessment) => ({
      id: assessment.id,
      title: assessment.name,
      category: assessment.category,
      description: assessment.description,
      timeEstimate: assessment.timeEstimate || 'Not specified',
      type: assessment.type,
      questions: assessment._count.questions,
      tags: assessment.tags || 'all'
    }));

    res.json({ success: true, data: formattedAssessments });
  } catch (error) {
    console.error('Error fetching available assessments:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch available assessments' 
    });
  }
};


export const getAssessmentTemplates = async (req: Request, res: Response) => {
  try {
    const typesParam = Array.isArray(req.query.types)
      ? req.query.types.join(',')
      : typeof req.query.types === 'string'
        ? req.query.types
        : '';

    const requestedTypes = typesParam
      ? typesParam.split(',').map((type) => type.trim()).filter(Boolean)
      : (Object.keys(ASSESSMENT_TEMPLATE_MAP) as TemplateBaseType[]);

    // Separate built-in types from custom/dynamic types
    const builtInTypes: TemplateBaseType[] = [];
    const customTypes: string[] = [];
    
    for (const type of requestedTypes) {
      const resolved = resolveTemplateType(type);
      if (resolved && resolved in ASSESSMENT_TEMPLATE_MAP) {
        builtInTypes.push(resolved);
      } else {
        // Treat as custom assessment type
        customTypes.push(type);
      }
    }

    const templates: any[] = [];

    // Fetch built-in assessment templates
    if (builtInTypes.length > 0) {
      const resolvedBaseTypes = Array.from(new Set(builtInTypes));
      const definitionIds = resolvedBaseTypes.map((type) => ASSESSMENT_TEMPLATE_MAP[type].definitionId);

      const definitions = await prisma.assessmentDefinition.findMany({
        where: { id: { in: definitionIds } },
        include: {
          questions: {
            include: { options: true },
            orderBy: { order: 'asc' }
          }
        }
      });

      const definitionById = new Map(
        definitions.map((definition) => [definition.id, definition] as const)
      );

      const builtInTemplates = resolvedBaseTypes
        .map((baseType) => {
          const mapping = ASSESSMENT_TEMPLATE_MAP[baseType];
          const definition = definitionById.get(mapping.definitionId);
          if (!definition) {
            return null;
          }
          return formatAssessmentTemplate(baseType, definition);
        })
        .filter((template): template is ReturnType<typeof formatAssessmentTemplate> => template !== null);
      
      templates.push(...builtInTemplates);
    }

    // Fetch custom/dynamic assessment templates by type
    if (customTypes.length > 0) {
      const customDefinitions = await prisma.assessmentDefinition.findMany({
        where: {
          type: { in: customTypes },
          isActive: true
        },
        include: {
          questions: {
            include: { options: true },
            orderBy: { order: 'asc' }
          }
        }
      });

      const customTemplates = customDefinitions.map((definition) => {
        return formatCustomAssessmentTemplate(definition);
      });
      
      templates.push(...customTemplates);
    }

    if (!templates.length) {
      res.status(404).json({ success: false, error: 'Assessment templates not found' });
      return;
    }

    res.json({ success: true, data: { templates } });
  } catch (error) {
    console.error('Get assessment templates error', error);
    res.status(500).json({ success: false, error: 'Unable to fetch assessment templates' });
  }
};

export const submitAssessment = async (req: any, res: Response) => {
  try {
    const { error } = submitSchema.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, error: error.details[0].message });
      return;
    }

  const { assessmentType, responses, responseDetails, score, rawScore, maxScore, categoryBreakdown } = req.body;
    const userId = req.user.id;

    const record = await prisma.assessmentResult.create({
      data: {
        userId,
        assessmentType,
        score,
        normalizedScore: score,
        responses: JSON.stringify(responses),
        rawScore: rawScore ?? null,
        maxScore: maxScore ?? null,
        ...(categoryBreakdown ? { categoryScores: categoryBreakdown as Prisma.JsonObject } : {})
      }
    });

    const [user, assessments] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, name: true }
      }),
      prisma.assessmentResult.findMany({
        where: { userId },
        orderBy: { completedAt: 'desc' },
        take: 100
      })
    ]);

    const detailedContext: AssessmentDetailContext[] = Array.isArray(responseDetails) && responseDetails.length > 0
      ? [{
          assessmentType,
          completedAt: record.completedAt.toISOString(),
          responses: responseDetails.map((detail: any) => ({
            questionId: detail.questionId,
            questionText: detail.questionText,
            answerLabel: typeof detail.answerLabel === 'string' ? detail.answerLabel : '',
            answerValue: detail.answerValue ?? null,
            answerScore: typeof detail.answerScore === 'number' ? detail.answerScore : undefined
          })),
          rawScore: typeof rawScore === 'number' ? rawScore : null,
          maxScore: typeof maxScore === 'number' ? maxScore : null,
          score
        }]
      : [];

    console.log('[Assessment Submission] Building insights with detailed context:', {
      userId,
      assessmentType,
      hasResponseDetails: Array.isArray(responseDetails) && responseDetails.length > 0,
      responseDetailsCount: responseDetails?.length || 0,
      detailedContextCount: detailedContext.length,
      sampleResponse: detailedContext[0]?.responses?.[0]
    });

    const insightsPayload = await buildAssessmentInsights(
      assessments,
      {
        userName: user?.firstName || user?.name || null
      },
      detailedContext
    );

    const insightId = randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "assessment_insights" ("id", "userId", "summary", "overallTrend", "aiSummary", "wellness_score", "createdAt", "updatedAt")
       VALUES ($1, $2, $3::jsonb, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT("userId") DO UPDATE SET "summary" = EXCLUDED."summary", "overallTrend" = EXCLUDED."overallTrend", "aiSummary" = EXCLUDED."aiSummary", "wellness_score" = EXCLUDED."wellness_score", "updatedAt" = CURRENT_TIMESTAMP`,
      insightId,
      userId,
      JSON.stringify(insightsPayload),
      insightsPayload.insights.overallTrend,
      insightsPayload.insights.aiSummary,
      insightsPayload.insights.wellnessScore?.value ?? 0
    );

    const enrichedAssessment =
      insightsPayload.history.find(item => item.id === record.id) ?? insightsPayload.history[0] ?? null;

    res.status(201).json({
      success: true,
      data: {
        assessment: enrichedAssessment,
        history: insightsPayload.history,
        insights: insightsPayload.insights
      }
    });
  } catch (e) {
    console.error('Submit assessment error', e);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const getAssessmentHistory = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const [user, assessments, storedInsights] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, name: true }
      }),
      prisma.assessmentResult.findMany({
        where: { userId },
        orderBy: { completedAt: 'desc' },
        take: 100
      }),
      prisma.assessmentInsight.findUnique({ where: { userId } })
    ]);

    const latestAssessment = assessments[0] ?? null;
    let cachedInsights: AssessmentInsightsPayload | null = null;

    if (storedInsights?.summary) {
      try {
        const parsed = JSON.parse(storedInsights.summary as unknown as string);
        if (parsed && typeof parsed === 'object' && 'insights' in parsed) {
          cachedInsights = parsed as AssessmentInsightsPayload;
        }
      } catch (error) {
        console.warn('Failed to parse cached assessment insights', error);
      }
    }

    if (
      cachedInsights &&
      latestAssessment &&
      storedInsights?.updatedAt &&
      storedInsights.updatedAt.getTime() >= latestAssessment.completedAt.getTime()
    ) {
      res.json({
        success: true,
        data: {
          history: cachedInsights.history,
          insights: cachedInsights.insights
        }
      });
      return;
    }

    const insightsPayload = await buildAssessmentInsights(
      assessments,
      {
        userName: user?.firstName || user?.name || null
      }
    );

    const historyInsightId = randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "assessment_insights" ("id", "userId", "summary", "overallTrend", "aiSummary", "wellness_score", "createdAt", "updatedAt")
       VALUES ($1, $2, $3::jsonb, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT("userId") DO UPDATE SET "summary" = EXCLUDED."summary", "overallTrend" = EXCLUDED."overallTrend", "aiSummary" = EXCLUDED."aiSummary", "wellness_score" = EXCLUDED."wellness_score", "updatedAt" = CURRENT_TIMESTAMP`,
      historyInsightId,
      userId,
      JSON.stringify(insightsPayload),
      insightsPayload.insights.overallTrend,
      insightsPayload.insights.aiSummary,
      insightsPayload.insights.wellnessScore?.value ?? 0
    );

    res.json({
      success: true,
      data: {
        history: insightsPayload.history,
        insights: insightsPayload.insights
      }
    });
  } catch (e) {
    console.error('Get assessment history error', e);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Assessment Session Management Functions

export const startAssessmentSession = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { selectedTypes } = req.body;

    if (!Array.isArray(selectedTypes) || selectedTypes.length === 0) {
      res.status(400).json({ success: false, error: 'selectedTypes must be a non-empty array' });
      return;
    }

    const session = await prisma.assessmentSession.create({
      data: {
        userId,
        selectedTypes: selectedTypes as any,
        status: 'pending',
        startedAt: new Date()
      }
    });

    res.json({
      success: true,
      data: {
        session: {
          id: session.id,
          status: session.status,
          selectedTypes: session.selectedTypes as string[],
          completedTypes: [],
          pendingTypes: session.selectedTypes as string[],
          startedAt: session.startedAt.toISOString(),
          completedAt: null,
          completedAssessments: []
        }
      }
    });
  } catch (error) {
    console.error('Start assessment session error', error);
    res.status(500).json({ success: false, error: 'Unable to start assessment session' });
  }
};

export const getActiveAssessmentSession = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    const session = await prisma.assessmentSession.findFirst({
      where: {
        userId,
        status: { in: ['pending', 'in_progress'] }
      },
      include: {
        assessments: {
          select: {
            id: true,
            assessmentType: true,
            score: true,
            completedAt: true
          }
        }
      },
      orderBy: { startedAt: 'desc' }
    });

    if (!session) {
      res.json({ success: true, data: null });
      return;
    }

    const selectedTypes = session.selectedTypes as string[];
    const completedTypes = session.assessments.map(a => a.assessmentType);
    const pendingTypes = selectedTypes.filter(t => !completedTypes.includes(t));

    res.json({
      success: true,
      data: {
        session: {
          id: session.id,
          status: session.status,
          selectedTypes,
          completedTypes,
          pendingTypes,
          startedAt: session.startedAt.toISOString(),
          completedAt: session.completedAt?.toISOString() || null,
          completedAssessments: session.assessments
        }
      }
    });
  } catch (error) {
    console.error('Get active assessment session error', error);
    res.status(500).json({ success: false, error: 'Unable to get active session' });
  }
};

export const getAssessmentSessionById = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;

    const session = await prisma.assessmentSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        assessments: {
          select: {
            id: true,
            assessmentType: true,
            score: true,
            completedAt: true
          }
        }
      }
    });

    if (!session) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    const selectedTypes = session.selectedTypes as string[];
    const completedTypes = session.assessments.map(a => a.assessmentType);
    const pendingTypes = selectedTypes.filter(t => !completedTypes.includes(t));

    res.json({
      success: true,
      data: {
        session: {
          id: session.id,
          status: session.status,
          selectedTypes,
          completedTypes,
          pendingTypes,
          startedAt: session.startedAt.toISOString(),
          completedAt: session.completedAt?.toISOString() || null,
          completedAssessments: session.assessments
        }
      }
    });
  } catch (error) {
    console.error('Get assessment session by ID error', error);
    res.status(500).json({ success: false, error: 'Unable to get session' });
  }
};

export const updateAssessmentSessionStatus = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;
    const { status } = req.body;

    if (!['pending', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      res.status(400).json({ success: false, error: 'Invalid status' });
      return;
    }

    const session = await prisma.assessmentSession.findFirst({
      where: { id: sessionId, userId }
    });

    if (!session) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    const updated = await prisma.assessmentSession.update({
      where: { id: sessionId },
      data: {
        status,
        ...(status === 'completed' && { completedAt: new Date() })
      },
      include: {
        assessments: {
          select: {
            id: true,
            assessmentType: true,
            score: true,
            completedAt: true
          }
        }
      }
    });

    const selectedTypes = updated.selectedTypes as string[];
    const completedTypes = updated.assessments.map(a => a.assessmentType);
    const pendingTypes = selectedTypes.filter(t => !completedTypes.includes(t));

    res.json({
      success: true,
      data: {
        session: {
          id: updated.id,
          status: updated.status,
          selectedTypes,
          completedTypes,
          pendingTypes,
          startedAt: updated.startedAt.toISOString(),
          completedAt: updated.completedAt?.toISOString() || null,
          completedAssessments: updated.assessments
        }
      }
    });
  } catch (error) {
    console.error('Update assessment session status error', error);
    res.status(500).json({ success: false, error: 'Unable to update assessment session' });
  }
};

export const submitCombinedAssessments = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { sessionId, assessments: combinedAssessments } = req.body;

    if (!sessionId || !Array.isArray(combinedAssessments) || combinedAssessments.length === 0) {
      res.status(400).json({ 
        success: false, 
        error: 'Session ID and assessments array are required' 
      });
      return;
    }

    // Verify session belongs to user
    const session = await prisma.assessmentSession.findFirst({
      where: { id: sessionId, userId },
      include: { assessments: true }
    });

    if (!session) {
      res.status(404).json({ success: false, error: 'Assessment session not found' });
      return;
    }

    // Create all assessment results in a transaction
    const createdAssessments = await prisma.$transaction(
      combinedAssessments.map((assessment: any) => {
        const normalizedScore = typeof assessment.score === 'number' ? assessment.score : 0;
        const rawScoreValue = typeof assessment.rawScore === 'number' ? assessment.rawScore : null;
        const maxScoreValue = typeof assessment.maxScore === 'number' ? assessment.maxScore : null;
        const categoryScoresValue = assessment.categoryBreakdown
          ? (assessment.categoryBreakdown as Prisma.JsonObject)
          : undefined;

        return prisma.assessmentResult.create({
          data: {
            userId,
            assessmentType: assessment.assessmentType,
            score: normalizedScore,
            normalizedScore,
            responses: JSON.stringify(assessment.responses || {}),
            rawScore: rawScoreValue,
            maxScore: maxScoreValue,
            ...(categoryScoresValue ? { categoryScores: categoryScoresValue } : {}),
            sessionId
          }
        });
      })
    );

    // Update session status to completed
    const updatedSession = await prisma.assessmentSession.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
        completedAt: new Date()
      },
      include: {
        assessments: {
          select: {
            id: true,
            assessmentType: true,
            score: true,
            completedAt: true
          }
        }
      }
    });

    // Fetch all assessments for insights
    const [user, allAssessments] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, name: true }
      }),
      prisma.assessmentResult.findMany({
        where: { userId },
        orderBy: { completedAt: 'desc' },
        take: 100
      })
    ]);

    // Build comprehensive insights
    const assessmentDetailContexts: AssessmentDetailContext[] = createdAssessments.reduce((accumulator: AssessmentDetailContext[], created, index) => {
      const requestAssessment = combinedAssessments[index];
      if (!requestAssessment || !Array.isArray(requestAssessment.responseDetails) || requestAssessment.responseDetails.length === 0) {
        return accumulator;
      }

      accumulator.push({
        assessmentType: requestAssessment.assessmentType,
        completedAt: created.completedAt.toISOString(),
        responses: requestAssessment.responseDetails.map((detail: any) => ({
          questionId: detail.questionId,
          questionText: detail.questionText,
          answerLabel: typeof detail.answerLabel === 'string' ? detail.answerLabel : '',
          answerValue: detail.answerValue ?? null,
          answerScore: typeof detail.answerScore === 'number' ? detail.answerScore : undefined
        })),
        rawScore: typeof requestAssessment.rawScore === 'number' ? requestAssessment.rawScore : null,
        maxScore: typeof requestAssessment.maxScore === 'number' ? requestAssessment.maxScore : null,
        score: typeof requestAssessment.score === 'number' ? requestAssessment.score : undefined
      });

      return accumulator;
    }, []);

    const insightsPayload = await buildAssessmentInsights(
      allAssessments,
      {
        userName: user?.firstName || user?.name || null
      },
      assessmentDetailContexts
    );

    // Save wellness score to database for combined onboarding assessment
    const wellnessScoreValue = insightsPayload.insights.wellnessScore?.value ?? 0;
    const insightId = randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "assessment_insights" ("id", "userId", "summary", "overallTrend", "aiSummary", "wellness_score", "createdAt", "updatedAt")
       VALUES ($1, $2, $3::jsonb, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT("userId") DO UPDATE SET "summary" = EXCLUDED."summary", "overallTrend" = EXCLUDED."overallTrend", "aiSummary" = EXCLUDED."aiSummary", "wellness_score" = EXCLUDED."wellness_score", "updatedAt" = CURRENT_TIMESTAMP`,
      insightId,
      userId,
  JSON.stringify(insightsPayload),
      insightsPayload.insights.overallTrend,
      insightsPayload.insights.aiSummary,
      wellnessScoreValue
    );

    const selectedTypes = updatedSession.selectedTypes as string[];
    const completedTypes = updatedSession.assessments.map(a => a.assessmentType);
    const pendingTypes = selectedTypes.filter(t => !completedTypes.includes(t));

    res.json({
      success: true,
      data: {
        assessments: createdAssessments,
        session: {
          id: updatedSession.id,
          status: updatedSession.status,
          selectedTypes,
          completedTypes,
          pendingTypes,
          startedAt: updatedSession.startedAt.toISOString(),
          completedAt: updatedSession.completedAt?.toISOString() || null,
          completedAssessments: updatedSession.assessments
        },
        history: insightsPayload.history,
        insights: insightsPayload.insights
      }
    });
  } catch (error) {
    console.error('Submit combined assessments error', error);
    res.status(500).json({ 
      success: false, 
      error: 'Unable to save combined assessments' 
    });
  }
};
