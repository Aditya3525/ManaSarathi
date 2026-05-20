import { Download, FileText, FileJson, FileType, Loader2 } from 'lucide-react';
import React, { useState } from 'react';

import { useToast } from '../../../contexts/ToastContext';
import { useExportConversation } from '../../../hooks/useConversationExport';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { Label } from '../../ui/label';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  conversationTitle: string;
  messageCount: number;
}

type ExportFormat = 'pdf' | 'text' | 'json';

export function ExportDialog({
  open,
  onOpenChange,
  conversationId,
  conversationTitle,
  messageCount,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [includeSystemMessages, setIncludeSystemMessages] = useState(true);
  const toast = useToast();

  const exportMutation = useExportConversation();

  const handleFormatChange = (val: string) => {
    setFormat(val as ExportFormat);
  };

  const handleExport = async () => {
    try {
      const sanitizedTitle = conversationTitle
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase()
        .substring(0, 50);
      
      const filename = `${sanitizedTitle}_${Date.now()}.${format === 'json' ? 'json' : format === 'pdf' ? 'pdf' : 'txt'}`;

      await exportMutation.mutateAsync({
        conversationId,
        format,
        includeSystemMessages,
        filename,
      });

      toast.push({
        title: 'Export successful!',
        description: `Your conversation has been exported as ${format.toUpperCase()}.`,
        type: 'success',
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.push({
        title: 'Export failed',
        description: 'Failed to export conversation. Please try again.',
        type: 'error',
      });
    }
  };

  const getFormatIcon = (formatType: ExportFormat) => {
    switch (formatType) {
      case 'pdf':
        return <FileType className="h-5 w-5" />;
      case 'text':
        return <FileText className="h-5 w-5" />;
      case 'json':
        return <FileJson className="h-5 w-5" />;
    }
  };

  const getFormatDescription = (formatType: ExportFormat) => {
    switch (formatType) {
      case 'pdf':
        return 'Professional format with styling and formatting';
      case 'text':
        return 'Plain text format, easy to read and edit';
      case 'json':
        return 'Structured data format for developers';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Conversation</DialogTitle>
          <DialogDescription>
            Export &ldquo;{conversationTitle}&rdquo; with {messageCount} message
            {messageCount !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Export Format</p>
            <RadioGroup value={format} onValueChange={handleFormatChange}>
              {(['pdf', 'text', 'json'] as ExportFormat[]).map((formatType) => (
                <div
                  key={formatType}
                  className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onClick={() => setFormat(formatType)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setFormat(formatType);
                    }
                  }}
                >
                  <RadioGroupItem value={formatType} id={formatType} className="mt-1" />
                  <div className="flex-1 pointer-events-none">
                    <div className="flex items-center gap-2">
                      {getFormatIcon(formatType)}
                      <span className="font-medium capitalize">
                        {formatType === 'json' ? 'JSON' : formatType.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getFormatDescription(formatType)}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Export Options</p>
            <div className="flex items-center space-x-2 rounded-lg border p-3">
              <Checkbox
                id="systemMessages"
                checked={includeSystemMessages}
                onCheckedChange={(checked) =>
                  setIncludeSystemMessages(checked as boolean)
                }
              />
              <div className="flex-1">
                <Label htmlFor="systemMessages" className="cursor-pointer">
                  Include system messages
                </Label>
                <p className="text-xs text-muted-foreground">
                  Export notifications and system alerts
                </p>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
            <h4 className="font-medium">Export Details</h4>
            <div className="space-y-1 text-muted-foreground">
              <p>• Total messages: {messageCount}</p>
              <p>• Format: {format.toUpperCase()}</p>
              <p>
                • System messages:{' '}
                {includeSystemMessages ? 'Included' : 'Excluded'}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={exportMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleExport}
            disabled={exportMutation.isPending}
          >
            {exportMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
