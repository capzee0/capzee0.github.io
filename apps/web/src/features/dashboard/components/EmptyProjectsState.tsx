import { Film, Sparkles, Plus } from 'lucide-react';

interface EmptyProjectsStateProps {
  onNewProject: () => void;
  onTryDemo: () => void;
}

export function EmptyProjectsState({ onNewProject, onTryDemo }: EmptyProjectsStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-[#CDCBD6] border border-[#2F3020]/15 rounded-2xl max-w-lg mx-auto shadow-sm">
      <div className="w-16 h-16 rounded-2xl bg-[#E3E1EB] border border-[#2F3020]/15 flex items-center justify-center mb-4 text-[#D96846]">
        <Film className="w-8 h-8" />
      </div>

      <h3 className="text-xl font-bold text-[#2F3020] mb-2">
        Nothing here yet
      </h3>

      <p className="text-sm text-[#454832] mb-6 max-w-xs">
        Upload your first video to generate viral, CapCut-style animated subtitles in seconds.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        <button
          type="button"
          onClick={onNewProject}
          className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[#D96846] hover:bg-[#C25534] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md transition-all"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>

        <button
          type="button"
          onClick={onTryDemo}
          className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md transition-all"
        >
          <Sparkles className="w-4 h-4" />
          Try 1-Click Demo
        </button>
      </div>
    </div>
  );
}
