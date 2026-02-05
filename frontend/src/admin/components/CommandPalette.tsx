import {
  BarChart3,
  BookOpen,
  Brain,
  FileText,
  HelpCircle,
  Inbox,
  Stethoscope,
  Users,
  Activity,
  AlertTriangle,
  Home,
  LogOut,
  Moon,
  Sun,
  Keyboard
} from 'lucide-react';
import React, { useState, useEffect, useCallback, useMemo } from 'react';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut
} from '../../components/ui/command';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (section: string) => void;
  onLogout?: () => void;
  onToggleTheme?: () => void;
  currentTheme?: 'light' | 'dark';
}

interface CommandAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  group: 'navigation' | 'actions' | 'settings';
  action: () => void;
  keywords?: string[];
}

export function CommandPalette({
  open,
  onOpenChange,
  onNavigate,
  onLogout,
  onToggleTheme,
  currentTheme = 'light'
}: CommandPaletteProps) {
  const [search, setSearch] = useState('');

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const runCommand = useCallback((callback: () => void) => {
    onOpenChange(false);
    callback();
  }, [onOpenChange]);

  const commands: CommandAction[] = useMemo(() => [
    // Navigation
    {
      id: 'nav-overview',
      label: 'Go to Overview',
      icon: Home,
      shortcut: 'G O',
      group: 'navigation',
      action: () => runCommand(() => onNavigate('overview')),
      keywords: ['home', 'dashboard', 'main']
    },
    {
      id: 'nav-users',
      label: 'Go to User Management',
      icon: Users,
      shortcut: 'G U',
      group: 'navigation',
      action: () => runCommand(() => onNavigate('users')),
      keywords: ['members', 'accounts', 'people']
    },
    {
      id: 'nav-content',
      label: 'Go to Content Library',
      icon: BookOpen,
      shortcut: 'G C',
      group: 'navigation',
      action: () => runCommand(() => onNavigate('content')),
      keywords: ['articles', 'videos', 'media']
    },
    {
      id: 'nav-practices',
      label: 'Go to Practices',
      icon: Brain,
      shortcut: 'G P',
      group: 'navigation',
      action: () => runCommand(() => onNavigate('practices')),
      keywords: ['exercises', 'meditation', 'breathing']
    },
    {
      id: 'nav-assessments',
      label: 'Go to Assessments',
      icon: FileText,
      shortcut: 'G A',
      group: 'navigation',
      action: () => runCommand(() => onNavigate('assessments')),
      keywords: ['quizzes', 'tests', 'screening']
    },
    {
      id: 'nav-therapists',
      label: 'Go to Therapist Management',
      icon: Stethoscope,
      group: 'navigation',
      action: () => runCommand(() => onNavigate('therapists')),
      keywords: ['doctors', 'professionals', 'counselors']
    },
    {
      id: 'nav-analytics',
      label: 'Go to Analytics',
      icon: BarChart3,
      shortcut: 'G N',
      group: 'navigation',
      action: () => runCommand(() => onNavigate('analytics')),
      keywords: ['stats', 'metrics', 'reports']
    },
    {
      id: 'nav-faq',
      label: 'Go to FAQ Management',
      icon: HelpCircle,
      group: 'navigation',
      action: () => runCommand(() => onNavigate('faqs')),
      keywords: ['questions', 'help', 'support']
    },
    {
      id: 'nav-crisis',
      label: 'Go to Crisis Resources',
      icon: AlertTriangle,
      group: 'navigation',
      action: () => runCommand(() => onNavigate('crisis')),
      keywords: ['emergency', 'hotlines', 'safety']
    },
    {
      id: 'nav-tickets',
      label: 'Go to Support Tickets',
      icon: Inbox,
      group: 'navigation',
      action: () => runCommand(() => onNavigate('tickets')),
      keywords: ['issues', 'requests', 'complaints']
    },
    {
      id: 'nav-diagnostics',
      label: 'Go to System Diagnostics',
      icon: Activity,
      group: 'navigation',
      action: () => runCommand(() => onNavigate('diagnostics')),
      keywords: ['health', 'status', 'monitoring']
    },

    // Actions
    {
      id: 'action-new-content',
      label: 'Create New Content',
      icon: BookOpen,
      group: 'actions',
      action: () => runCommand(() => {
        onNavigate('content');
        // Trigger add content action after navigation
        setTimeout(() => {
          const addButton = document.querySelector('[data-action="add-content"]') as HTMLButtonElement;
          addButton?.click();
        }, 100);
      }),
      keywords: ['add', 'new', 'create']
    },
    {
      id: 'action-new-practice',
      label: 'Create New Practice',
      icon: Brain,
      group: 'actions',
      action: () => runCommand(() => {
        onNavigate('practices');
        setTimeout(() => {
          const addButton = document.querySelector('[data-action="add-practice"]') as HTMLButtonElement;
          addButton?.click();
        }, 100);
      }),
      keywords: ['add', 'new', 'create']
    },

    // Settings
    {
      id: 'settings-theme',
      label: currentTheme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode',
      icon: currentTheme === 'light' ? Moon : Sun,
      shortcut: 'T',
      group: 'settings',
      action: () => runCommand(() => onToggleTheme?.()),
      keywords: ['theme', 'dark', 'light', 'appearance']
    },
    {
      id: 'settings-shortcuts',
      label: 'View Keyboard Shortcuts',
      icon: Keyboard,
      shortcut: '?',
      group: 'settings',
      action: () => runCommand(() => {
        // Could open a shortcuts modal
        alert('Keyboard Shortcuts:\n\n⌘K - Command Palette\nG O - Go to Overview\nG U - Go to Users\nG C - Go to Content\nG P - Go to Practices\nG A - Go to Assessments\nG N - Go to Analytics\nT - Toggle Theme\n? - Show Shortcuts');
      }),
      keywords: ['hotkeys', 'keys', 'bindings']
    },
    {
      id: 'settings-logout',
      label: 'Logout',
      icon: LogOut,
      group: 'settings',
      action: () => runCommand(() => onLogout?.()),
      keywords: ['signout', 'exit', 'leave']
    }
  ], [runCommand, onNavigate, onLogout, onToggleTheme, currentTheme]);

  const navigationCommands = commands.filter(c => c.group === 'navigation');
  const actionCommands = commands.filter(c => c.group === 'actions');
  const settingsCommands = commands.filter(c => c.group === 'settings');

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Type a command or search..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Navigation">
          {navigationCommands.map((command) => (
            <CommandItem
              key={command.id}
              value={`${command.label} ${command.keywords?.join(' ') || ''}`}
              onSelect={command.action}
            >
              <command.icon className="mr-2 h-4 w-4" />
              <span>{command.label}</span>
              {command.shortcut && (
                <CommandShortcut>{command.shortcut}</CommandShortcut>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Quick Actions">
          {actionCommands.map((command) => (
            <CommandItem
              key={command.id}
              value={`${command.label} ${command.keywords?.join(' ') || ''}`}
              onSelect={command.action}
            >
              <command.icon className="mr-2 h-4 w-4" />
              <span>{command.label}</span>
              {command.shortcut && (
                <CommandShortcut>{command.shortcut}</CommandShortcut>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Settings">
          {settingsCommands.map((command) => (
            <CommandItem
              key={command.id}
              value={`${command.label} ${command.keywords?.join(' ') || ''}`}
              onSelect={command.action}
            >
              <command.icon className="mr-2 h-4 w-4" />
              <span>{command.label}</span>
              {command.shortcut && (
                <CommandShortcut>{command.shortcut}</CommandShortcut>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
