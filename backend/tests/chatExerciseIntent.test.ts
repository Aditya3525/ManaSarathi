import { describe, expect, it } from 'vitest';

import { chatService } from '../src/services/chatService';

describe('ChatService exercise intent detection', () => {
  it('does not trigger exercise mode for generic assessment-discussion plan requests', () => {
    const message =
      'I want to discuss my latest anxiety assessment. Please explain what this means and give me a practical plan I can follow today.';

    const result = chatService.detectExerciseRequest(message);

    expect(result).toBeNull();
  });

  it('triggers exercise mode when request includes exercise-specific intent', () => {
    const message = 'Can you guide me through a breathing exercise for 5 minutes?';

    const result = chatService.detectExerciseRequest(message);

    expect(result).not.toBeNull();
    expect(result?.requested).toBe(true);
    expect(result?.timeAvailable).toBe(5);
  });

  it('triggers exercise mode for request plus exercise keyword', () => {
    const message = 'Help me with a grounding technique right now.';

    const result = chatService.detectExerciseRequest(message);

    expect(result).not.toBeNull();
    expect(result?.requested).toBe(true);
  });
});
