import { 
  Wind, 
  Brain, 
  MessageSquare, 
  Anchor, 
  Activity,
  Clock,
  Target,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import React from 'react';

import { ExerciseRecommendationsResponse } from '../../../services/api';

interface ExerciseRecommendationsWidgetProps {
  recommendations: ExerciseRecommendationsResponse;
  onSelectExercise?: (exerciseId: string) => void;
}

const ExerciseRecommendationsWidget: React.FC<ExerciseRecommendationsWidgetProps> = ({ 
  recommendations,
  onSelectExercise 
}) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'breathing':
        return <Wind className="w-5 h-5" />;
      case 'mindfulness':
        return <Brain className="w-5 h-5" />;
      case 'cbt':
        return <MessageSquare className="w-5 h-5" />;
      case 'grounding':
        return <Anchor className="w-5 h-5" />;
      case 'movement':
        return <Activity className="w-5 h-5" />;
      default:
        return <Sparkles className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'breathing':
        return 'from-blue-500 to-cyan-500';
      case 'mindfulness':
        return 'from-purple-500 to-pink-500';
      case 'cbt':
        return 'from-green-500 to-emerald-500';
      case 'grounding':
        return 'from-orange-500 to-amber-500';
      case 'movement':
        return 'from-red-500 to-rose-500';
      default:
        return 'from-gray-500 to-slate-500';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-2xl mx-auto border-2 border-gray-100">
      {/* Header */}
      <div className="rounded-lg border-2 border-indigo-200 bg-indigo-50 p-4 mb-6">
        <div className="flex items-start gap-3">
          <Sparkles className="w-6 h-6 text-indigo-600 mt-1 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-lg text-gray-800 mb-1">
              Personalized Exercises for You
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {recommendations.rationale || 'These exercises are selected based on your current conversation and emotional context.'}
            </p>
          </div>
        </div>
      </div>

      {/* Exercises Grid */}
      <div className="space-y-4">
        {recommendations.exercises.map((exercise, index) => (
          <button
            key={`${exercise.title}-${index}`}
            className="w-full group relative bg-gradient-to-br from-white to-gray-50 rounded-lg border-2 border-gray-200 hover:border-indigo-400 transition-all duration-300 overflow-hidden hover:shadow-lg text-left"
            onClick={() => onSelectExercise?.(`${exercise.type}:${exercise.title}`)}
            type="button"
          >
            {/* Gradient accent bar */}
            <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${getTypeColor(exercise.type)}`} />
            
            <div className="p-5 pt-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg bg-gradient-to-br ${getTypeColor(exercise.type)} text-white shadow-md`}>
                    {getTypeIcon(exercise.type)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 text-lg group-hover:text-indigo-600 transition-colors">
                      {exercise.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                        {exercise.type}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {exercise.duration || '5-10 min'}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="text-2xl font-bold text-gray-300 group-hover:text-indigo-300 transition-colors">
                  #{index + 1}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                {exercise.description}
              </p>

              {/* Why this exercise */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 mb-3">
                <div className="flex items-start gap-2">
                  <Target className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-indigo-900 mb-0.5">Why this helps:</p>
                    <p className="text-xs text-indigo-700 leading-relaxed">
                      This {exercise.type} exercise is designed to support your current wellbeing goals.
                    </p>
                  </div>
                </div>
              </div>

              {/* Benefit */}
              <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-green-900 mb-0.5">Expected benefit:</p>
                    <p className="text-xs text-green-700 leading-relaxed">
                      Improved calm, focus, and emotional balance when practiced consistently.
                    </p>
                  </div>
                </div>
              </div>

              {exercise.instructions && exercise.instructions.length > 0 && (
                <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-800 mb-1">How to start:</p>
                  <ul className="space-y-1">
                    {exercise.instructions.slice(0, 3).map((instruction, instructionIndex) => (
                      <li key={`${exercise.title}-instruction-${instructionIndex}`} className="text-xs text-gray-600 leading-relaxed">
                        {instructionIndex + 1}. {instruction}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Call to action (visible on hover) */}
              <div className="mt-4 pt-3 border-t border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 rounded-lg text-sm font-medium text-center">
                  Start This Exercise
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center leading-relaxed">
          💡 Tip: Start with the easiest exercise and work your way up. Consistency matters more than perfection.
        </p>
      </div>
    </div>
  );
};

export default ExerciseRecommendationsWidget;
