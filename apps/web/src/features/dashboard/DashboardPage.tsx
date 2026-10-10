import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Trash2, Clock, Video, AlertCircle,
  CheckCircle2, Loader2, ChevronRight
} from 'lucide-react';
import { useProjectStore, type Project } from '@/stores/projectStore';
import { listProjects, deleteProject } from '@/services/api';
import { formatDuration, formatDate, cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  created:     { label: 'Created',     color: 'badge-neutral', icon: Clock },
  uploading:   { label: 'Uploading',   color: 'badge-info',    icon: Loader2 },
  processing:  { label: 'Processing',  color: 'badge-info',    icon: Loader2 },
  transcribed: { label: 'Transcribed', color: 'badge-success', icon: CheckCircle2 },
  ready:       { label: 'Ready',       color: 'badge-success', icon: CheckCircle2 },
  error:       { label: 'Error',       color: 'badge-error',   icon: AlertCircle },
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { projects, setProjects, removeProject } = useProjectStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const data = await listProjects();
        setProjects(
          data.map((p) => ({
            ...p,
            originalAssetPath: null,
            localVideoUrl: null,
          }))
        );
      } catch (err) {
        // API might not be running; use persisted local state
        setError('API server not reachable. Showing locally saved projects.');
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  async function handleDelete(project: Project, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Delete "${project.title}"? This cannot be undone.`)) return;
    setDeleting(project.id);
    try {
      await deleteProject(project.id);
      removeProject(project.id);
    } catch {
      removeProject(project.id); // remove locally even if API fails
    } finally {
      setDeleting(null);
    }
  }

  function openProject(project: Project) {
    navigate(`/editor/${project.id}`);
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-surface-border">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => navigate('/projects/new')}
          className="btn-primary"
          id="dashboard-new-project-btn"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-8 py-6">
        {/* Error banner */}
        {error && (
          <div className="mb-6 flex items-start gap-3 p-4 rounded-lg bg-status-warning/10 border border-status-warning/30 text-status-warning text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="panel p-5 space-y-3">
                <div className="skeleton h-5 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
                <div className="skeleton h-3 w-1/3" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-DEFAULT flex items-center justify-center mb-5">
              <Video className="w-8 h-8 text-text-muted" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">No projects yet</h2>
            <p className="text-text-secondary text-sm max-w-sm mb-6">
              Import your first video to get started with AI-powered captioning.
            </p>
            <button
              onClick={() => navigate('/projects/new')}
              className="btn-primary"
              id="empty-state-new-btn"
            >
              <Plus className="w-4 h-4" />
              Create First Project
            </button>
          </div>
        ) : (
          /* Projects grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => {
              const status = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.created;
              const StatusIcon = status.icon;
              return (
                <div
                  key={project.id}
                  onClick={() => openProject(project)}
                  className="panel p-5 cursor-pointer hover:border-accent-blue/40 hover:bg-surface-hover/30 transition-all duration-200 group"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && openProject(project)}
                  aria-label={`Open project ${project.title}`}
                >
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-semibold text-text-primary text-sm leading-tight line-clamp-2 flex-1">
                      {project.title}
                    </h3>
                    <button
                      onClick={(e) => handleDelete(project, e)}
                      disabled={deleting === project.id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-status-error/15 hover:text-status-error text-text-muted flex-shrink-0"
                      aria-label={`Delete project ${project.title}`}
                    >
                      {deleting === project.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className={cn('badge', status.color)}>
                      <StatusIcon className={cn('w-3 h-3', project.status === 'processing' && 'animate-spin')} />
                      {status.label}
                    </span>
                    {project.durationSeconds != null && (
                      <span className="text-xs text-text-muted">
                        {formatDuration(project.durationSeconds)}
                      </span>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>{formatDate(project.updatedAt)}</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
