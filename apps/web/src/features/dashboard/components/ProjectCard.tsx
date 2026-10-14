import { useState } from 'react';
import { Film, Trash2, Calendar, Play, ArrowUpRight } from 'lucide-react';
import type { Project } from '@/stores/projectStore';
import { formatDuration, cn } from '@/lib/utils';
import { STATUS_CONFIG } from '../../projects/lib/mediaUtils';

interface ProjectCardProps {
  project: Project;
  onOpen: (project: Project) => void;
  onDelete: (projectId: string, e: React.MouseEvent) => void;
}

export function ProjectCard({ project, onOpen, onDelete }: ProjectCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const status = STATUS_CONFIG[project.status] || STATUS_CONFIG.created;
  const StatusIcon = status.icon;

  const dateFormatted = new Date(project.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      onClick={() => onOpen(project)}
      className="group relative bg-[#CDCBD6] hover:bg-[#DBD8E3] border border-[#2F3020]/15 hover:border-[#16A34A]/40 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-1 flex flex-col select-none"
    >
      {/* Thumbnail area with overlay */}
      <div className="relative aspect-video w-full bg-[#2F3020] flex items-center justify-center overflow-hidden">
        {project.thumbnailUrl ? (
          <img
            src={project.thumbnailUrl}
            alt={project.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-white/50">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
              <Film className="w-5 h-5 text-white/70" />
            </div>
            <span className="text-[11px] font-mono tracking-wider text-white/60 uppercase">Capzee Video</span>
          </div>
        )}

        {/* Hover play overlay */}
        <div className="absolute inset-0 bg-[#2F3020]/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center backdrop-blur-2xs">
          <div className="w-11 h-11 rounded-full bg-[#16A34A] text-white flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform duration-200 border border-white/30">
            <Play className="w-5 h-5 ml-0.5 fill-white" />
          </div>
        </div>

        {/* Top Badges (Aspect Ratio & Quality) */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10 pointer-events-none">
          <span className="px-2 py-0.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono font-bold rounded-md border border-white/15 shadow-xs">
            {project.aspectRatio || '9:16'}
          </span>
          {project.qualityLabel && (
            <span className="px-1.5 py-0.5 bg-[#16A34A]/80 backdrop-blur-xs text-white text-[9px] font-bold rounded-md border border-white/20">
              {project.qualityLabel}
            </span>
          )}
        </div>

        {/* Duration badge */}
        {project.durationSeconds !== null && project.durationSeconds !== undefined && (
          <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 bg-black/75 backdrop-blur-xs text-white text-[10px] font-mono font-bold rounded-md border border-white/15 shadow-xs">
            {formatDuration(project.durationSeconds)}
          </span>
        )}
      </div>

      {/* Info body */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3 bg-[#E3E1EB]/60">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-sm text-[#2F3020] truncate group-hover:text-[#D96846] transition-colors leading-tight" title={project.title}>
              {project.title}
            </h3>

            {/* Delete button or confirmation */}
            {confirmDelete ? (
              <div className="flex items-center gap-1 shrink-0 z-10" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(project.id, e);
                  }}
                  className="px-2 py-0.5 text-[11px] font-bold bg-red-600 hover:bg-red-700 text-white rounded-md shadow-xs transition-colors"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(false);
                  }}
                  className="px-2 py-0.5 text-[11px] font-bold bg-[#2F3020]/20 hover:bg-[#2F3020]/30 text-[#2F3020] rounded-md transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                aria-label="Delete project"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(true);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-[#2F3020]/50 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                title="Delete Project"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[#2F3020]/70 font-medium">
            <Calendar className="w-3.5 h-3.5 text-[#2F3020]/50 shrink-0" />
            <span>{dateFormatted}</span>
          </div>
        </div>

        {/* Footer with Status indicator & Quick Open CTA */}
        <div className="flex items-center justify-between pt-2.5 border-t border-[#2F3020]/15">
          <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-current/20 shadow-2xs', status.color)}>
            <StatusIcon className="w-3 h-3 animate-spin-slow" />
            <span>{status.label}</span>
          </span>

          <span className="text-[11px] font-bold text-[#2F3020]/75 group-hover:text-[#16A34A] flex items-center gap-0.5 transition-colors">
            <span>Open Studio</span>
            <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </div>
  );
}
