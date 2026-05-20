import { Request, Response } from 'express';
import Joi from 'joi';
import { prisma } from '../config/database';

const progressSchema = Joi.object({
  progress: Joi.number().min(0).max(100).required()
});

interface Module {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  approach: string[];
}

// Generate personalized modules based on user preferences
function generatePersonalizedModules(
  approach: string | null,
  assessmentScores?: any
): Module[] {
  const baseModules: Module[] = [
    {
      id: 'breathing-basics',
      title: 'Breathing Basics',
      description: '5-minute calm breathing technique',
      category: 'Relaxation',
      duration: 5,
      difficulty: 'beginner',
      approach: ['western', 'eastern', 'hybrid']
    },
    {
      id: 'body-scan',
      title: 'Body Scan Meditation',
      description: 'Full-body awareness practice',
      category: 'Mindfulness',
      duration: 15,
      difficulty: 'beginner',
      approach: ['eastern', 'hybrid']
    },
    {
      id: 'thought-tracking',
      title: 'CBT Thought Tracking',
      description: 'Identify and reframe negative thoughts',
      category: 'CBT',
      duration: 10,
      difficulty: 'intermediate',
      approach: ['western', 'hybrid']
    },
    {
      id: 'progressive-relaxation',
      title: 'Progressive Muscle Relaxation',
      description: 'Release physical tension systematically',
      category: 'Relaxation',
      duration: 12,
      difficulty: 'beginner',
      approach: ['western', 'eastern', 'hybrid']
    },
    {
      id: 'mindful-walking',
      title: 'Mindful Walking',
      description: 'Walking meditation practice',
      category: 'Movement',
      duration: 20,
      difficulty: 'beginner',
      approach: ['eastern', 'hybrid']
    },
    {
      id: 'journaling',
      title: 'Reflective Journaling',
      description: 'Process emotions through writing',
      category: 'Self-Reflection',
      duration: 15,
      difficulty: 'beginner',
      approach: ['western', 'hybrid']
    }
  ];
  
  // Filter modules based on user's approach
  let filtered = baseModules;
  if (approach) {
    filtered = baseModules.filter(module => 
      module.approach.includes(approach)
    );
  }
  
  // Prioritize based on assessment scores (if available)
  if (assessmentScores) {
    // If anxiety is high, prioritize relaxation
    if (assessmentScores.anxiety && assessmentScores.anxiety > 60) {
      filtered = filtered.sort((a, b) => {
        if (a.category === 'Relaxation') return -1;
        if (b.category === 'Relaxation') return 1;
        return 0;
      });
    }
    
    // If stress is high, prioritize mindfulness
    if (assessmentScores.stress && assessmentScores.stress > 60) {
      filtered = filtered.sort((a, b) => {
        if (a.category === 'Mindfulness') return -1;
        if (b.category === 'Mindfulness') return 1;
        return 0;
      });
    }
  }
  
  return filtered;
}

export const getUserPlan = async (req: any, res: Response) => {
  try {
    const { userId } = req.params;
    
    // Verify authorization - user can only access their own plan
    if (userId !== req.user?.id) {
      res.status(403).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }
    
    // Get user to check their approach preference and latest assessments
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        approach: true,
        assessments: {
          where: {
            assessmentType: {
              in: ['anxiety', 'stress']
            }
          },
          orderBy: {
            completedAt: 'desc'
          },
          take: 2,
          select: {
            assessmentType: true,
            score: true,
            normalizedScore: true
          }
        }
      }
    });
    
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }
    
    // Extract assessment scores
    const assessmentScores = {
      anxiety: user.assessments.find(a => a.assessmentType === 'anxiety')?.normalizedScore || 
               user.assessments.find(a => a.assessmentType === 'anxiety')?.score || null,
      stress: user.assessments.find(a => a.assessmentType === 'stress')?.normalizedScore || 
              user.assessments.find(a => a.assessmentType === 'stress')?.score || null
    };
    
    const modules = generatePersonalizedModules(
      user.approach,
      assessmentScores
    );
    
    res.json({
      success: true,
      data: {
        modules,
        approach: user.approach,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error generating user plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate personalized plan',
    });
  }
};

export const getPersonalizedPlan = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const approach = user?.approach || 'hybrid';

    // Fetch modules matching user approach or hybrid universal modules
    const modules = await prisma.planModule.findMany({
      where: { OR: [{ approach }, { approach: 'hybrid' }] },
      orderBy: { order: 'asc' }
    });

    // Fetch user progress
    const progress = await prisma.userPlanModule.findMany({ where: { userId } });
    const progressMap = new Map(progress.map(p => [p.moduleId, p]));

    const enriched = modules.map(m => ({
      ...m,
      userState: progressMap.get(m.id) || null
    }));

    res.json({ success: true, data: enriched });
  } catch (e) {
    console.error('Get personalized plan error', e);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const updateModuleProgress = async (req: any, res: Response) => {
  try {
    const { error } = progressSchema.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, error: error.details[0].message });
      return;
    }
    const userId = req.user.id;
    const { moduleId } = req.params;
    const { progress } = req.body;

    const record = await prisma.userPlanModule.upsert({
      where: { userId_moduleId: { userId, moduleId } },
      update: { progress },
      create: { userId, moduleId, progress }
    });
    res.json({ success: true, data: record });
  } catch (e) {
    console.error('Update module progress error', e);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const completeModule = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { moduleId } = req.params;
    const record = await prisma.userPlanModule.upsert({
      where: { userId_moduleId: { userId, moduleId } },
      update: { completed: true, progress: 100, completedAt: new Date() },
      create: { userId, moduleId, completed: true, progress: 100, completedAt: new Date() }
    });
    res.json({ success: true, data: record });
  } catch (e) {
    console.error('Complete module error', e);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
