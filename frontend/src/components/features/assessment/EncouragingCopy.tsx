interface EncouragingCopyProps {
  currentQuestion: number;
  totalQuestions: number;
}

const ENCOURAGEMENTS = [
  "You're doing great, take your time.",
  'Every honest answer helps us understand you better.',
  "Almost there, you've got this.",
  'Your wellbeing matters, thank you for being here.',
  'No right or wrong answers, just your truth.',
];

export function EncouragingCopy({ currentQuestion, totalQuestions }: EncouragingCopyProps) {
  const remaining = Math.max(totalQuestions - currentQuestion, 0);
  const progress = totalQuestions > 0
    ? Math.round((currentQuestion / totalQuestions) * 100)
    : 0;

  let message = '';

  if (currentQuestion === 0) {
    message = 'Take your time, no right or wrong answers.';
  } else if (remaining <= 2) {
    message = `Almost there, just ${remaining} more ${remaining === 1 ? 'question' : 'questions'}.`;
  } else if (progress > 50) {
    message = "You're past the halfway point, doing great.";
  } else {
    message = ENCOURAGEMENTS[currentQuestion % ENCOURAGEMENTS.length];
  }

  return (
    <p className="page-enter py-2 text-center text-xs italic text-muted-foreground" key={currentQuestion}>
      {message}
    </p>
  );
}

export type { EncouragingCopyProps };