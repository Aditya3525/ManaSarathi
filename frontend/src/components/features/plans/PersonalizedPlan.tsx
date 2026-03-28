import { 
  ArrowLeft,
  Target,
  Heart,
  Brain,
  Calendar as CalendarIcon,
  CheckCircle,
  Clock,
  Play,
  RotateCcw,
  Star,
  Users
} from 'lucide-react';
import React, { useState } from 'react';

import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Calendar } from '../../ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Progress } from '../../ui/progress';

interface PersonalizedPlanProps {
  user: any;
  onNavigate: (page: string) => void;
}

interface PlanModule {
  id: string;
  title: string;
  type: 'therapy' | 'meditation' | 'yoga' | 'education';
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  completed: boolean;
  progress: number;
  scheduledFor?: Date;
  prerequisites?: string[];
}

export function PersonalizedPlan({ user, onNavigate }: PersonalizedPlanProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [planType, setPlanType] = useState<'western' | 'eastern' | 'hybrid'>(
    user?.approach || 'hybrid'
  );

  // Generate personalized plan based on user scores and approach preference
  const generatePlan = (): PlanModule[] => {
    const scores = user?.assessmentScores || {};
    const approach = planType;
    const modules: PlanModule[] = [];

    // Base modules adapted to approach
    if (approach === 'western') {
      modules.push({
        id: 'intro-cbt',
        title: 'Introduction to Cognitive Behavioral Therapy',
        type: 'therapy',
        duration: '20 minutes',
        difficulty: 'Beginner',
        description: 'Learn evidence-based CBT techniques for understanding thought patterns and behaviors.',
        completed: false,
        progress: 0,
      });
    } else if (approach === 'eastern') {
      modules.push({
        id: 'intro-mindfulness',
        title: 'Introduction to Mindfulness',
        type: 'meditation',
        duration: '15 minutes',
        difficulty: 'Beginner',
        description: 'Learn the ancient art of mindful awareness and present-moment attention.',
        completed: false,
        progress: 0,
      });
    } else {
      modules.push({
        id: 'intro-integrated',
        title: 'Integrated Wellbeing Foundations',
        type: 'education',
        duration: '18 minutes',
        difficulty: 'Beginner',
        description: 'Discover how therapeutic techniques and mindfulness practices work together.',
        completed: false,
        progress: 0,
      });
    }

    // Anxiety-specific modules adapted to approach
    if (scores.anxiety > 50) {
      if (approach === 'western') {
        modules.push({
          id: 'cbt-anxiety',
          title: 'CBT for Anxiety Management',
          type: 'therapy',
          duration: '25 minutes',
          difficulty: 'Intermediate',
          description: 'Evidence-based cognitive restructuring techniques for managing anxious thoughts.',
          completed: false,
          progress: 0,
          prerequisites: [modules[0].id]
        });
        
        modules.push({
          id: 'exposure-therapy',
          title: 'Gradual Exposure Techniques',
          type: 'therapy',
          duration: '20 minutes',
          difficulty: 'Advanced',
          description: 'Systematic desensitization and exposure therapy principles.',
          completed: false,
          progress: 0,
          prerequisites: ['cbt-anxiety']
        });
      } else if (approach === 'eastern') {
        modules.push({
          id: 'anxiety-breathing',
          title: 'Pranayama for Anxiety',
          type: 'meditation',
          duration: '12 minutes',
          difficulty: 'Beginner',
          description: 'Ancient breathing techniques to calm anxiety and restore inner balance.',
          completed: false,
          progress: 0,
          prerequisites: [modules[0].id]
        });
        
        modules.push({
          id: 'anxiety-meditation',
          title: 'Anxiety Dissolution Meditation',
          type: 'meditation',
          duration: '18 minutes',
          difficulty: 'Intermediate',
          description: 'Traditional meditation practices for releasing anxiety and fear.',
          completed: false,
          progress: 0,
          prerequisites: ['anxiety-breathing']
        });
      } else {
        modules.push({
          id: 'hybrid-anxiety',
          title: 'Integrated Anxiety Management',
          type: 'therapy',
          duration: '20 minutes',
          difficulty: 'Intermediate',
          description: 'Combines CBT thought work with mindful breathing for comprehensive anxiety relief.',
          completed: false,
          progress: 0,
          prerequisites: [modules[0].id]
        });
      }
    }

    // Stress-specific modules adapted to approach
    if (scores.stress > 40) {
      if (approach === 'western') {
        modules.push({
          id: 'stress-management',
          title: 'Stress Management Strategies',
          type: 'therapy',
          duration: '22 minutes',
          difficulty: 'Beginner',
          description: 'Evidence-based techniques for identifying and managing stress triggers.',
          completed: false,
          progress: 0,
        });
        
        modules.push({
          id: 'progressive-relaxation',
          title: 'Progressive Muscle Relaxation',
          type: 'therapy',
          duration: '16 minutes',
          difficulty: 'Beginner',
          description: 'Systematic muscle relaxation technique developed by Jacobson.',
          completed: false,
          progress: 0,
        });
      } else if (approach === 'eastern') {
        modules.push({
          id: 'body-scan',
          title: 'Mindful Body Awareness',
          type: 'meditation',
          duration: '15 minutes',
          difficulty: 'Beginner',
          description: 'Traditional body scan meditation to release tension and cultivate awareness.',
          completed: false,
          progress: 0,
        });

        modules.push({
          id: 'stress-yoga',
          title: 'Restorative Yoga Flow',
          type: 'yoga',
          duration: '25 minutes',
          difficulty: 'Beginner',
          description: 'Gentle yoga sequences designed to activate the parasympathetic nervous system.',
          completed: false,
          progress: 0,
        });
      } else {
        modules.push({
          id: 'hybrid-stress',
          title: 'Mind-Body Stress Relief',
          type: 'education',
          duration: '20 minutes',
          difficulty: 'Beginner',
          description: 'Integrates cognitive strategies with body-based practices for comprehensive stress relief.',
          completed: false,
          progress: 0,
        });
      }
    }

    // Emotional intelligence modules
    if (scores.emotionalIntelligence < 70) {
      modules.push({
        id: 'emotion-awareness',
        title: 'Emotional Awareness Practice',
        type: 'education',
        duration: '12 minutes',
        difficulty: 'Beginner',
        description: 'Develop skills to recognize and name your emotions as they arise.',
        completed: false,
        progress: 0,
      });
    }

    // Advanced modules
    modules.push({
      id: 'loving-kindness',
      title: 'Loving-Kindness Meditation',
      type: 'meditation',
      duration: '18 minutes',
      difficulty: 'Intermediate',
      description: 'Cultivate compassion for yourself and others through traditional meditation.',
      completed: false,
      progress: 25,
      prerequisites: ['body-scan']
    });

    return modules;
  };

  const planModules = generatePlan();
  const completedModules = planModules.filter(m => m.completed).length;
  const overallProgress = Math.round((completedModules / planModules.length) * 100);

  const getPlanTypeDescription = (type: string) => {
    switch (type) {
      case 'western':
        return 'Evidence-based therapy techniques and cognitive approaches';
      case 'eastern':
        return 'Mindfulness, meditation, and traditional wisdom practices';
      case 'hybrid':
        return 'Balanced combination of therapeutic and mindfulness approaches';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'therapy': return <Brain className="h-4 w-4" />;
      case 'meditation': return <Heart className="h-4 w-4" />;
      case 'yoga': return <Users className="h-4 w-4" />;
      case 'education': return <Star className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'therapy': return 'bg-blue-100 text-blue-800';
      case 'meditation': return 'bg-green-100 text-green-800';
      case 'yoga': return 'bg-purple-100 text-purple-800';
      case 'education': return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onNavigate('dashboard')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <h1 className="text-3xl">Your Personalized Plan</h1>
              <p className="text-muted-foreground text-lg">
                A curated journey combining therapy techniques, mindfulness practices, 
                and educational content tailored to your needs.
              </p>

              {/* Plan Type Selector */}
              <div className="flex gap-2">
                {(['hybrid', 'western', 'eastern'] as const).map((type) => (
                  <Button
                    key={type}
                    variant={planType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPlanType(type)}
                    className="capitalize"
                  >
                    {type} Approach
                  </Button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                {getPlanTypeDescription(planType)}
              </p>
            </div>

            {/* Progress Overview */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-semibold text-primary mb-2">
                    {overallProgress}%
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Plan Completion
                  </p>
                </div>
                <Progress value={overallProgress} className="h-2" />
                <div className="text-sm text-muted-foreground text-center">
                  {completedModules} of {planModules.length} modules completed
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content - Module List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl">Your Learning Path</h2>
              <Button variant="outline" size="sm">
                <RotateCcw className="h-4 w-4 mr-2" />
                Regenerate Plan
              </Button>
            </div>

            <div className="space-y-4">
              {planModules.map((module, index) => {
                const isAvailable = !module.prerequisites || 
                  module.prerequisites.every(prereq => 
                    planModules.find(m => m.id === prereq)?.completed
                  );

                return (
                  <Card 
                    key={module.id}
                    className={`transition-all ${
                      module.completed 
                        ? 'border-green-200 bg-green-50/30' 
                        : isAvailable
                        ? 'hover:border-primary/20 hover:shadow-md'
                        : 'opacity-60'
                    }`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start gap-4">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-semibold">
                              {index + 1}
                            </div>
                            
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{module.title}</h3>
                                {module.completed && (
                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                )}
                              </div>

                              <p className="text-muted-foreground text-sm leading-relaxed">
                                {module.description}
                              </p>

                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Clock className="h-4 w-4" />
                                  <span>{module.duration}</span>
                                </div>
                                
                                <Badge 
                                  variant="secondary" 
                                  className={getTypeColor(module.type)}
                                >
                                  <div className="flex items-center gap-1">
                                    {getTypeIcon(module.type)}
                                    <span className="capitalize">{module.type}</span>
                                  </div>
                                </Badge>

                                <Badge variant="outline">
                                  {module.difficulty}
                                </Badge>
                              </div>

                              {module.progress > 0 && !module.completed && (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Progress</span>
                                    <span className="font-medium">{module.progress}%</span>
                                  </div>
                                  <Progress value={module.progress} className="h-1" />
                                </div>
                              )}

                              {module.prerequisites && (
                                <div className="text-xs text-muted-foreground">
                                  Prerequisites: {module.prerequisites.join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          {module.completed ? (
                            <Button variant="outline" size="sm">
                              Review
                            </Button>
                          ) : isAvailable ? (
                            <Button 
                              size="sm"
                              onClick={() => onNavigate('practices')}
                              className="flex items-center gap-2"
                            >
                              <Play className="h-4 w-4" />
                              {module.progress > 0 ? 'Continue' : 'Start'}
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" disabled>
                              Locked
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Schedule */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                />
                
                <div className="space-y-2">
                  <h4 className="font-medium">Today's Recommendations</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>• Morning: Introduction to Mindfulness (15 min)</p>
                    <p>• Evening: Progressive Body Scan (15 min)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start"
                  onClick={() => onNavigate('practices')}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Today's Practice
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => onNavigate('chatbot')}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Discuss Plan with AI
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => onNavigate('progress')}
                >
                  <Target className="h-4 w-4 mr-2" />
                  View Progress
                </Button>
              </CardContent>
            </Card>

            {/* Plan Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Plan Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Based on your assessments:</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {user?.assessmentScores?.anxiety > 50 && (
                      <p>• Anxiety-focused breathing exercises included</p>
                    )}
                    {user?.assessmentScores?.stress > 40 && (
                      <p>• Stress relief practices prioritized</p>
                    )}
                    {(user?.assessmentScores?.emotionalIntelligence || 0) < 70 && (
                      <p>• Emotional awareness modules added</p>
                    )}
                  </div>
                </div>
                
                <div className="pt-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    Your plan adapts as you progress and retake assessments.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
