/**
 * Keyboard Shortcuts - Help panel and hook for keyboard navigation
 */

import { useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Keyboard, Command } from "lucide-react";
import { cn } from "@/lib/utils";

interface Shortcut {
  keys: string[];
  description: string;
  action: string;
}

const shortcuts: Shortcut[] = [
  { keys: ["⌘", "1"], description: "Go to Templates panel", action: "focus-templates" },
  { keys: ["⌘", "2"], description: "Go to Toolbox panel", action: "focus-toolbox" },
  { keys: ["⌘", "3"], description: "Go to Preview panel", action: "focus-preview" },
  { keys: ["⌘", "T"], description: "Run quick tests", action: "run-tests" },
  { keys: ["⌘", "S"], description: "Save agent", action: "save-agent" },
  { keys: ["⌘", "D"], description: "Open deploy modal", action: "deploy" },
  { keys: ["⌘", "R"], description: "Reset builder", action: "reset" },
  { keys: ["⌘", "/"], description: "Show keyboard shortcuts", action: "show-shortcuts" },
  { keys: ["Esc"], description: "Close modals", action: "close-modal" },
];

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate faster
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-4">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50"
            >
              <span className="text-sm text-muted-foreground">
                {shortcut.description}
              </span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, keyIndex) => (
                  <kbd
                    key={keyIndex}
                    className={cn(
                      "px-2 py-1 text-xs font-mono rounded border",
                      "bg-muted border-border shadow-sm"
                    )}
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t text-center">
          <p className="text-xs text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 text-xs font-mono rounded border bg-muted">⌘</kbd> + <kbd className="px-1.5 py-0.5 text-xs font-mono rounded border bg-muted">/</kbd> anytime to show this help
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface UseKeyboardShortcutsOptions {
  onRunTests?: () => void;
  onSaveAgent?: () => void;
  onDeploy?: () => void;
  onReset?: () => void;
  onShowShortcuts?: () => void;
  onFocusPanel?: (panel: "templates" | "toolbox" | "preview") => void;
  enabled?: boolean;
}

/**
 * Hook to handle keyboard shortcuts
 */
export function useKeyboardShortcuts({
  onRunTests,
  onSaveAgent,
  onDeploy,
  onReset,
  onShowShortcuts,
  onFocusPanel,
  enabled = true,
}: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Check for meta key (⌘ on Mac, Ctrl on Windows)
      const isMeta = event.metaKey || event.ctrlKey;

      if (isMeta) {
        switch (event.key.toLowerCase()) {
          case "1":
            event.preventDefault();
            onFocusPanel?.("templates");
            break;
          case "2":
            event.preventDefault();
            onFocusPanel?.("toolbox");
            break;
          case "3":
            event.preventDefault();
            onFocusPanel?.("preview");
            break;
          case "t":
            event.preventDefault();
            onRunTests?.();
            break;
          case "s":
            event.preventDefault();
            onSaveAgent?.();
            break;
          case "d":
            event.preventDefault();
            onDeploy?.();
            break;
          case "r":
            if (event.shiftKey) {
              event.preventDefault();
              onReset?.();
            }
            break;
          case "/":
            event.preventDefault();
            onShowShortcuts?.();
            break;
        }
      }
    },
    [enabled, onRunTests, onSaveAgent, onDeploy, onReset, onShowShortcuts, onFocusPanel]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Keyboard shortcut hint component
 */
interface ShortcutHintProps {
  keys: string[];
  className?: string;
}

export function ShortcutHint({ keys, className }: ShortcutHintProps) {
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {keys.map((key, index) => (
        <kbd
          key={index}
          className="px-1 py-0.5 text-[10px] font-mono rounded border bg-muted/50 border-border/50"
        >
          {key}
        </kbd>
      ))}
    </div>
  );
}
