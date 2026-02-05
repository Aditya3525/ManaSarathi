import { Copy, ThumbsUp, ThumbsDown, RefreshCw, Check, Volume2 } from 'lucide-react';
import React, { useState } from 'react';

import { useToast } from '../../../contexts/ToastContext';
import { Button } from '../../ui/button';

interface MessageActionsProps {
  messageId: string;
  content: string;
  onLike?: (messageId: string) => void;
  onDislike?: (messageId: string) => void;
  onRegenerate?: (messageId: string) => void;
  onSpeak?: (content: string) => void;
  feedback?: 'liked' | 'disliked' | null;
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  messageId,
  content,
  onLike,
  onDislike,
  onRegenerate,
  onSpeak,
  feedback = null,
}) => {
  const [copied, setCopied] = useState(false);
  const { push } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      push({
        title: 'Copied!',
        description: 'Message copied to clipboard',
        type: 'success',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      push({
        title: 'Failed to copy',
        description: 'Could not copy message to clipboard',
        type: 'error',
      });
    }
  };

  const handleLike = () => {
    if (onLike) {
      onLike(messageId);
      push({
        title: 'Feedback received',
        description: 'Thank you for your feedback!',
        type: 'success',
      });
    }
  };

  const handleDislike = () => {
    if (onDislike) {
      onDislike(messageId);
      push({
        title: 'Feedback received',
        description: 'We\'ll use this to improve our responses',
        type: 'info',
      });
    }
  };

  const handleRegenerate = () => {
    if (onRegenerate) {
      onRegenerate(messageId);
    }
  };

  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      {/* Copy Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
        title="Copy message"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
        ) : (
          <Copy className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
        )}
      </Button>

      {/* Speak Button */}
      {onSpeak && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSpeak(content)}
          className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Read aloud"
        >
          <Volume2 className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
        </Button>
      )}

      {/* Like Button */}
      {onLike && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          className={`h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 ${
            feedback === 'liked' ? 'bg-green-50 dark:bg-green-900/20' : ''
          }`}
          title="This was helpful"
        >
          <ThumbsUp
            className={`h-3.5 w-3.5 ${
              feedback === 'liked'
                ? 'text-green-600 dark:text-green-400 fill-current'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          />
        </Button>
      )}

      {/* Dislike Button */}
      {onDislike && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDislike}
          className={`h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 ${
            feedback === 'disliked' ? 'bg-red-50 dark:bg-red-900/20' : ''
          }`}
          title="This wasn't helpful"
        >
          <ThumbsDown
            className={`h-3.5 w-3.5 ${
              feedback === 'disliked'
                ? 'text-red-600 dark:text-red-400 fill-current'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          />
        </Button>
      )}

      {/* Regenerate Button */}
      {onRegenerate && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRegenerate}
          className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Regenerate response"
        >
          <RefreshCw className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
        </Button>
      )}
    </div>
  );
};

export default MessageActions;
