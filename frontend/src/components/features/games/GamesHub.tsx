import { Brain, Heart, Sparkles, Target, Wind, Smile, Trophy, ArrowLeft } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '../../ui/button';
import { Card } from '../../ui/card';

import { AnxietyBubblePopGame } from './AnxietyBubblePopGame';
import { BreathingRhythmGame } from './BreathingRhythmGame';
import { GratitudePuzzleGame } from './GratitudePuzzleGame';
import { MemoryMatchGame } from './MemoryMatchGame';
import { MindfulPatternGame } from './MindfulPatternGame';
import { MoodColorMatcher } from './MoodColorMatcher';

type GameType = 'breathing' | 'memory' | 'mood' | 'gratitude' | 'anxiety' | 'pattern' | null;

interface GameCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  category: string;
  onPlay: () => void;
}

const GameCard: React.FC<GameCardProps> = ({ title, description, icon, color, category, onPlay }) => {
  return (
    <Card className="p-6 lg:p-8 hover:shadow-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-2 cursor-pointer group relative overflow-hidden" onClick={onPlay}>
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative">
        <div className="flex flex-col lg:flex-row items-start gap-4 lg:gap-6">
          <div className={`p-4 lg:p-5 rounded-2xl ${color} group-hover:scale-125 group-hover:rotate-12 transition-all duration-500 shadow-lg`}>
            {icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl lg:text-2xl font-bold group-hover:text-primary transition-colors">{title}</h3>
              <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-semibold">{category}</span>
            </div>
            <p className="text-sm lg:text-base text-muted-foreground mb-4 lg:mb-6">{description}</p>
            <Button variant="outline" size="lg" className="w-full lg:w-auto group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110 transition-all duration-300">
              <span className="font-semibold">Play Now</span>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export const GamesHub: React.FC = () => {
  const [activeGame, setActiveGame] = useState<GameType>(null);

  const games = [
    {
      id: 'breathing',
      title: 'Breathing Rhythm',
      description: 'Follow the breathing circle and find your calm. Perfect for stress relief.',
      icon: <Wind className="h-6 w-6 text-blue-600" />,
      color: 'bg-blue-100',
      category: 'Relaxation',
    },
    {
      id: 'memory',
      title: 'Wellness Memory Match',
      description: 'Match cards with positive affirmations and coping strategies.',
      icon: <Brain className="h-6 w-6 text-purple-600" />,
      color: 'bg-purple-100',
      category: 'Cognitive',
    },
    {
      id: 'mood',
      title: 'Mood Color Matcher',
      description: 'Connect emotions with colors and learn about emotional awareness.',
      icon: <Heart className="h-6 w-6 text-pink-600" />,
      color: 'bg-pink-100',
      category: 'Emotional',
    },
    {
      id: 'gratitude',
      title: 'Gratitude Puzzle',
      description: 'Complete beautiful puzzles by expressing gratitude. Build positivity.',
      icon: <Sparkles className="h-6 w-6 text-amber-600" />,
      color: 'bg-amber-100',
      category: 'Mood',
    },
    {
      id: 'anxiety',
      title: 'Anxiety Relief Pop',
      description: 'Pop bubbles with anxious thoughts and replace them with calm.',
      icon: <Smile className="h-6 w-6 text-green-600" />,
      color: 'bg-green-100',
      category: 'Relaxation',
    },
    {
      id: 'pattern',
      title: 'Mindful Patterns',
      description: 'Train focus and attention by recognizing calming patterns.',
      icon: <Target className="h-6 w-6 text-indigo-600" />,
      color: 'bg-indigo-100',
      category: 'Cognitive',
    },
  ];

  if (activeGame) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 pb-20">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Button
            variant="ghost"
            onClick={() => setActiveGame(null)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Games
          </Button>
          
          {activeGame === 'breathing' && <BreathingRhythmGame />}
          {activeGame === 'memory' && <MemoryMatchGame />}
          {activeGame === 'mood' && <MoodColorMatcher />}
          {activeGame === 'gratitude' && <GratitudePuzzleGame />}
          {activeGame === 'anxiety' && <AnxietyBubblePopGame />}
          {activeGame === 'pattern' && <MindfulPatternGame />}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 pb-20">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Trophy className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Wellness Games
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Play interactive games designed to boost your mental wellness, reduce stress, and build healthy coping skills.
          </p>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
          {games.map((game) => (
            <GameCard
              key={game.id}
              title={game.title}
              description={game.description}
              icon={game.icon}
              color={game.color}
              category={game.category}
              onPlay={() => setActiveGame(game.id as GameType)}
            />
          ))}
        </div>

        {/* Info Banner */}
        <Card className="mt-12 p-6 bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Why Play Wellness Games?</h3>
              <p className="text-sm text-muted-foreground">
                These games are designed by mental health experts to help you practice mindfulness, 
                manage stress, and develop emotional awareness in a fun and engaging way. 
                Track your progress and earn achievements as you play!
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
