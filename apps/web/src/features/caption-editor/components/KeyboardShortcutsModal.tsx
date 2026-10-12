import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: 'Space', desc: 'Play / Pause video' },
  { key: 'K', desc: 'Toggle Play / Pause' },
  { key: 'J', desc: 'Rewind 2 seconds' },
  { key: 'L', desc: 'Fast-forward 2 seconds' },
  { key: '← / →', desc: 'Step 1 second (Shift: 5s)' },
  { key: 'M', desc: 'Mute / Unmute audio' },
  { key: 'S', desc: 'Split segment at playhead' },
  { key: 'Del / ⌫', desc: 'Delete active segment' },
  { key: 'Ctrl/⌘ + Z', desc: 'Undo transcript edit' },
  { key: 'Ctrl/⌘ + Y', desc: 'Redo transcript edit' },
  { key: '?', desc: 'Toggle keyboard shortcuts guide' },
];

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-surface text-forest border border-forest/15">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-olive/15 text-olive">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-forest">
                Keyboard Shortcuts
              </DialogTitle>
              <DialogDescription className="text-xs text-forest/70">
                Speed up your editing workflow in Capzee Studio
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="divide-y divide-forest/10 mt-2">
          {SHORTCUTS.map((s) => (
            <div key={s.key} className="flex items-center justify-between py-2 text-xs">
              <span className="text-forest/80 font-medium">{s.desc}</span>
              <kbd className="px-2 py-0.5 rounded bg-forest/10 text-forest font-mono font-bold text-[11px] border border-forest/15 shadow-2xs">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
