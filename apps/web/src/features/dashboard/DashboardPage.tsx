import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Sparkles, Loader2, Search, X } from 'lucide-react';
import { useProjectStore, type Project } from '@/stores/projectStore';
import { listProjects, deleteProject } from '@/services/api';
import { ProjectCard } from './components/ProjectCard';
import { EmptyProjectsState } from './components/EmptyProjectsState';
import { CreateProjectModal } from './components/CreateProjectModal';
import { getDemoTranscript } from '@capzee/contracts';
import { cn } from '@/lib/utils';

type FilterTab = 'all' | 'ready' | 'processing';

export function DashboardPage() {
  const navigate = useNavigate();
  const { projects, setProjects, setCurrentProject, setCurrentTranscript } = useProjectStore();
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  useEffect(() => {
    let isMounted = true;
    listProjects()
      .then((data) => {
        if (isMounted) {
          setProjects(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Could not load remote projects, using local store:', err);
        if (isMounted) {
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [setProjects]);

  const handleOpenProject = (project: Project) => {
    setCurrentProject(project);
    navigate(`/editor/${project.id}`);
  };

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteProject(projectId);
      setProjects(projects.filter((p) => p.id !== projectId));
    } catch (err) {
      console.error('Delete project error:', err);
      // Fallback local remove
      setProjects(projects.filter((p) => p.id !== projectId));
    }
  };

  const handleLaunchSampleDemo = () => {
    const demoProject: Project = {
      id: `local-demo-${Date.now()}`,
      title: 'Capzee Viral Reel Demo',
      status: 'ready',
      durationSeconds: 15.0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setCurrentProject(demoProject);
    setCurrentTranscript(getDemoTranscript('ta', 'roman'));
    navigate(`/editor/${demoProject.id}`);
  };

  // Filtered projects by search query and active tab
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase().trim());
      if (!matchesSearch) return false;
      if (activeTab === 'ready') return p.status === 'ready' || p.status === 'completed';
      if (activeTab === 'processing') return p.status === 'processing' || p.status === 'transcribing' || p.status === 'rendering';
      return true;
    });
  }, [projects, searchQuery, activeTab]);

  return (
    <div className="min-h-screen bg-[#D96846] text-[#2F3020] font-sans pb-16">
      {/* Top action header */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#2F3020]/20">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#2F3020]">
                Projects
              </h1>
              {projects.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#E3E1EB] border border-[#2F3020]/15 text-[#2F3020] text-xs font-bold font-mono shadow-2xs">
                  {projects.length}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#2F3020]/80 mt-1 font-medium">
              Create, transcribe, and edit viral AI captioned videos.
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleLaunchSampleDemo}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#FAF7F5] hover:bg-white text-[#2F3020] text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border border-[#2F3020]/20 shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4 text-[#D96846]" />
              <span>1-Click Demo</span>
            </button>

            <button
              type="button"
              id="dashboard-new-project-button"
              onClick={() => setModalOpen(true)}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New Project</span>
            </button>
          </div>
        </div>

        {/* Filter bar & Search (Visible when projects exist) */}
        {projects.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-5">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-[#CDCBD6] p-1 rounded-xl border border-[#2F3020]/15 w-fit">
              {(
                [
                  { id: 'all', label: 'All Projects', count: projects.length },
                  {
                    id: 'ready',
                    label: 'Ready',
                    count: projects.filter((p) => p.status === 'ready' || p.status === 'completed').length,
                  },
                  {
                    id: 'processing',
                    label: 'In Progress',
                    count: projects.filter((p) => p.status === 'processing' || p.status === 'transcribing' || p.status === 'rendering').length,
                  },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                    activeTab === tab.id
                      ? 'bg-[#16A34A] text-white shadow-xs'
                      : 'text-[#2F3020]/80 hover:text-[#2F3020] hover:bg-black/5'
                  )}
                >
                  <span>{tab.label}</span>
                  <span className={cn('text-[10px] font-mono px-1.5 py-0.2 rounded-full', activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-black/10 text-[#2F3020]')}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 text-[#2F3020]/50 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search projects by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#FAF7F5] border border-[#2F3020]/20 rounded-xl pl-9 pr-8 py-1.5 text-xs font-semibold text-[#2F3020] placeholder:text-[#2F3020]/50 focus:outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-[#2F3020]/60 hover:text-[#2F3020]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6">
        {loading && projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-[#2F3020]/75 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#16A34A]" />
            <p className="text-xs font-bold">Loading your studio workspace...</p>
          </div>
        ) : projects.length === 0 ? (
          <EmptyProjectsState
            onNewProject={() => setModalOpen(true)}
            onTryDemo={handleLaunchSampleDemo}
          />
        ) : filteredProjects.length === 0 ? (
          /* Empty Search State */
          <div className="p-12 text-center bg-[#CDCBD6] rounded-2xl border border-[#2F3020]/15 max-w-md mx-auto shadow-sm">
            <Search className="w-8 h-8 text-[#2F3020]/40 mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#2F3020] mb-1">No matching projects</h3>
            <p className="text-xs text-[#2F3020]/70 mb-4">
              No projects found matching &ldquo;{searchQuery}&rdquo;.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 bg-[#FAF7F5] hover:bg-white text-xs font-bold rounded-lg border border-[#2F3020]/20 text-[#2F3020] transition-colors"
            >
              Clear search filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredProjects.map((proj) => (
              <ProjectCard
                key={proj.id}
                project={proj}
                onOpen={handleOpenProject}
                onDelete={handleDeleteProject}
              />
            ))}
          </div>
        )}
      </main>

      {/* Create Project Modal */}
      {modalOpen && (
        <CreateProjectModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
