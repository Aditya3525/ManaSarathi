import { Check, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import React, { useCallback, useState } from 'react';

import { triggerHaptic } from '../../../utils/hapticFeedback';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';

interface PuzzlePiece {
  id: number;
  gratitude: string;
  revealed: boolean;
}

const puzzleImages = [
  { id: 1, title: 'Sunset Serenity', pieces: 6, description: 'A beautiful sunset over calm waters' },
  { id: 2, title: 'Mountain Peace', pieces: 6, description: 'Majestic mountains in morning light' },
  { id: 3, title: 'Forest Calm', pieces: 6, description: 'Peaceful forest with golden sunlight' },
];

export const GratitudePuzzleGame: React.FC = () => {
  const [selectedPuzzle, setSelectedPuzzle] = useState<typeof puzzleImages[0] | null>(null);
  const [pieces, setPieces] = useState<PuzzlePiece[]>([]);
  const [currentPiece, setCurrentPiece] = useState(0);
  const [gratitudeInput, setGratitudeInput] = useState('');
  const [totalGratitudes, setTotalGratitudes] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const startPuzzle = useCallback((puzzle: typeof puzzleImages[0]) => {
    const newPieces: PuzzlePiece[] = Array.from({ length: puzzle.pieces }, (_, i) => ({
      id: i,
      gratitude: '',
      revealed: false,
    }));
    setSelectedPuzzle(puzzle);
    setPieces(newPieces);
    setCurrentPiece(0);
    setGratitudeInput('');
    setTotalGratitudes(0);
    setIsComplete(false);
    triggerHaptic('medium');
  }, []);

  const handleSubmitGratitude = useCallback(() => {
    if (gratitudeInput.trim().length < 3) {
      triggerHaptic('error');
      return;
    }

    const updatedPieces = [...pieces];
    updatedPieces[currentPiece] = {
      ...updatedPieces[currentPiece],
      gratitude: gratitudeInput,
      revealed: true,
    };

    setPieces(updatedPieces);
    setGratitudeInput('');
    setTotalGratitudes((prev) => prev + 1);
    triggerHaptic('success');

    if (currentPiece < pieces.length - 1) {
      setCurrentPiece((prev) => prev + 1);
    } else {
      setIsComplete(true);
    }
  }, [gratitudeInput, pieces, currentPiece]);

  const handleReset = useCallback(() => {
    setSelectedPuzzle(null);
    setPieces([]);
    setCurrentPiece(0);
    setGratitudeInput('');
    setTotalGratitudes(0);
    setIsComplete(false);
    triggerHaptic('medium');
  }, []);

  const progress = selectedPuzzle ? (currentPiece / selectedPuzzle.pieces) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-200">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="h-6 w-6 text-amber-600" />
          <h2 className="text-2xl font-bold">Gratitude Puzzle</h2>
        </div>
        <p className="text-muted-foreground">
          Complete beautiful puzzles by expressing gratitude. Build positive thinking one piece at a time!
        </p>
      </Card>

      {/* Puzzle Selection */}
      {!selectedPuzzle && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-center">Choose Your Puzzle</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {puzzleImages.map((puzzle) => (
              <Card
                key={puzzle.id}
                className="p-6 cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105"
                onClick={() => startPuzzle(puzzle)}
              >
                <div className="space-y-3">
                  <div className="w-full h-32 bg-gradient-to-br from-amber-200 to-orange-300 rounded-lg flex items-center justify-center">
                    <Sparkles className="h-12 w-12 text-amber-600" />
                  </div>
                  <h4 className="font-semibold">{puzzle.title}</h4>
                  <p className="text-sm text-muted-foreground">{puzzle.description}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Trophy className="h-4 w-4" />
                    <span>{puzzle.pieces} pieces</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Active Puzzle */}
      {selectedPuzzle && !isComplete && (
        <div className="space-y-6">
          {/* Progress */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">
                {currentPiece + 1} / {selectedPuzzle.pieces}
              </span>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </Card>

          {/* Puzzle Grid */}
          <Card className="p-6 lg:p-8">
            <div className="grid grid-cols-3 gap-4 lg:gap-6 mb-6 max-w-2xl mx-auto">
              {pieces.map((piece) => (
                <div
                  key={piece.id}
                  className={`aspect-square rounded-xl lg:rounded-2xl transition-all duration-700 transform ${
                    piece.revealed
                      ? 'bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 shadow-2xl scale-105 rotate-1'
                      : 'bg-gradient-to-br from-gray-200 to-gray-300 shadow-md'
                  } flex items-center justify-center hover:scale-110`}
                  style={{
                    transition: 'all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                >
                  {piece.revealed ? (
                    <Check className="h-10 w-10 lg:h-14 lg:w-14 text-white animate-in zoom-in duration-500" />
                  ) : piece.id === currentPiece ? (
                    <Sparkles className="h-10 w-10 lg:h-14 lg:w-14 text-gray-400 animate-pulse" />
                  ) : (
                    <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gray-400 rounded-lg" />
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  What are you grateful for today? (Piece {currentPiece + 1}/{selectedPuzzle.pieces})
                </label>
                <textarea
                  value={gratitudeInput}
                  onChange={(e) => setGratitudeInput(e.target.value)}
                  placeholder="I'm grateful for..."
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                  rows={3}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitGratitude();
                    }
                  }}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleSubmitGratitude}
                  disabled={gratitudeInput.trim().length < 3}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Add Piece
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>
          </Card>

          {/* Previous Gratitudes */}
          {pieces.some((p) => p.revealed && p.gratitude) && (
            <Card className="p-4">
              <h4 className="font-semibold mb-3">Your Gratitudes</h4>
              <div className="space-y-2">
                {pieces
                  .filter((p) => p.revealed && p.gratitude)
                  .map((piece) => (
                    <div key={piece.id} className="flex items-start gap-2 p-2 bg-amber-50 rounded">
                      <Sparkles className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm">{piece.gratitude}</p>
                    </div>
                  ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Completion Screen */}
      {isComplete && selectedPuzzle && (
        <Card className="p-12 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-100 mb-4 animate-bounce">
              <Trophy className="h-10 w-10 text-amber-600" />
            </div>
            <h3 className="text-3xl font-bold text-amber-900">Puzzle Complete! 🎉</h3>
            <p className="text-lg text-amber-800">
              You&apos;ve completed <strong>{selectedPuzzle.title}</strong> with {totalGratitudes} gratitudes!
            </p>
            <div className="max-w-md mx-auto p-4 bg-white/50 rounded-lg">
              <h4 className="font-semibold mb-2">Your Gratitude List:</h4>
              <div className="space-y-1 text-left">
                {pieces.map((piece, idx) => (
                  <p key={piece.id} className="text-sm">
                    {idx + 1}. {piece.gratitude}
                  </p>
                ))}
              </div>
            </div>
            <div className="pt-4">
              <Button size="lg" onClick={handleReset}>
                Try Another Puzzle
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Educational Banner */}
      {!selectedPuzzle && (
        <Card className="p-4 bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-900">
            <strong>Why Gratitude?</strong> Regular gratitude practice has been shown to improve mood, 
            reduce stress, and increase overall life satisfaction. Build this positive habit one puzzle at a time!
          </p>
        </Card>
      )}
    </div>
  );
};
