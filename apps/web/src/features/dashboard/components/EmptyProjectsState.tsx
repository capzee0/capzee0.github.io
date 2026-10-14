import { Sparkles, Plus, Zap, Wand2, Scissors } from 'lucide-react';

interface EmptyProjectsStateProps {
  onNewProject: () => void;
  onTryDemo: () => void;
}

export function EmptyProjectsState({ onNewProject, onTryDemo }: EmptyProjectsStateProps) {
  return (
    <div className="relative flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-[#CDCBD6]/90 backdrop-blur-md border border-[#2F3020]/20 rounded-3xl max-w-xl mx-auto shadow-xl overflow-hidden">
      {/* Subtle organic background glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#D96846]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-[#16A34A]/20 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Artwork Asset */}
      <div className="relative mb-6">
        <div className="p-3 bg-[#FAF7F5] rounded-3xl border border-[#2F3020]/15 shadow-sm inline-block">
          <img
            src="/cartoon-editor-work.svg"
            alt="Capzee Video Editor Studio"
            className="w-44 sm:w-52 h-auto max-h-40 object-contain drop-shadow-sm select-none"
          />
        </div>
      </div>

      <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2F3020] tracking-tight mb-2">
        Create Your First Viral Video
      </h2>

      <p className="text-sm text-[#2F3020]/80 mb-6 max-w-md leading-relaxed font-medium">
        Nothing here yet — upload any clip or try the 1-click demo to automatically transcribe spoken dialogue, apply animated CapCut styles with Tamil/Tanglish transliteration, and trim awkward silences.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mb-8">
        <button
          type="button"
          onClick={onNewProject}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#16A34A] hover:bg-[#15803D] active:scale-[0.98] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#16A34A]/25 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Upload & Transcribe</span>
        </button>

        <button
          type="button"
          onClick={onTryDemo}
          className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#FAF7F5] hover:bg-white active:scale-[0.98] text-[#2F3020] border border-[#2F3020]/20 font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-[#D96846]" />
          <span>Try 1-Click Demo</span>
        </button>
      </div>

      {/* Feature Micro-Badges */}
      <div className="pt-6 border-t border-[#2F3020]/15 w-full grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left">
        <div className="flex items-center gap-2 px-3 py-2 bg-white/60 rounded-xl border border-[#2F3020]/10 text-xs font-semibold text-[#2F3020]">
          <Zap className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
          <span className="truncate">Word-by-word highlight</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-white/60 rounded-xl border border-[#2F3020]/10 text-xs font-semibold text-[#2F3020]">
          <Wand2 className="w-3.5 h-3.5 text-[#D96846] shrink-0" />
          <span className="truncate">Tanglish Transliteration</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-white/60 rounded-xl border border-[#2F3020]/10 text-xs font-semibold text-[#2F3020]">
          <Scissors className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
          <span className="truncate">AI Silence Remover</span>
        </div>
      </div>
    </div>
  );
}
