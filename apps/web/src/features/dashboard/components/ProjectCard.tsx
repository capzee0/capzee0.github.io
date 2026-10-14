import { useState } from 'react';
import { Film, Trash2, Clock, Play } from 'lucide-react';
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

  return (
    <div
      onClick={() => onOpen(project)}
      className="group relative bg-[#CDCBD6] hover:bg-[#DBD8E3] border border-[#2F3020]/15 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 flex flex-col"
    >
      {/* Thumbnail area */}
      <div className="relative aspect-video w-full bg-[#B0ADC0] flex items-center justify-center overflow-hidden">
        {project.thumbnailUrl ? (
          <img
            src={project.thumbnailUrl}
            alt={project.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5 text-[#2F3020]/50">
            <Film className="w-8 h-8" />
            <span className="text-xs font-mono">Video</span>
          </div>
        )}

        {/* Hover play overlay */}
        <div className="absolute inset-0 bg-[#2F3020]/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-[#16A34A] text-white flex items-center justify-center shadow-md">
            <Play className="w-5 h-5 ml-0.5 fill-white" />
          </div>
        </div>

        {/* Duration badge */}
        {project.durationSeconds !== null && project.durationSeconds !== undefined && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-[#2F3020]/80 text-white text-[11px] font-mono rounded">
            {formatDuration(project.durationSeconds)}
          </span>
        )}
      </div>

      {/* Info body */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm text-[#2F3020] truncate group-hover:text-[#D96846] transition-colors">
              {project.title}
            </h3>

            {/* Delete button */}
            {confirmDelete ? (
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(project.id, e);
                  }}
                  className="px-1.5 py-0.5 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(false);
                  }}
                  className="px-1.5 py-0.5 text-xs bg-[#B0ADC0] text-[#2F3020] rounded hover:bg-[#DBD8E3]"
                >
                  No
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
                className="opacity-0 group-hover:opacity-100 p-1 text-[#2F3020]/50 hover:text-red-600 rounded transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1.5 text-xs text-[#454832]">
            <Clock className="w-3 h-3" />
            <span>{new Date(project.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex items-center justify-between pt-2 border-t border-[#2F3020]/10">
          <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium', status.color)}>
            <StatusIcon className="w-3 h-3 animate-spin-slow" />
            {status.label}
          </span>
        </div>
      </div>
    </div>
  );
}
