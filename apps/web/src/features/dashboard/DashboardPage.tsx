import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Sparkles, Loader2 } from 'lucide-react';
import { useProjectStore, type Project } from '@/stores/projectStore';
import { listProjects, deleteProject } from '@/services/api';
import { ProjectCard } from './components/ProjectCard';
import { EmptyProjectsState } from './components/EmptyProjectsState';
import { CreateProjectModal } from './components/CreateProjectModal';
import { getDemoTranscript } from '@capzee/contracts';

export function DashboardPage() {
  const navigate = useNavigate();
  const { projects, setProjects, setCurrentProject, setCurrentTranscript } = useProjectStore();
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-[#D96846] text-[#2F3020]">
      {/* Top action header */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#2F3020]/15">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#2F3020]">
              Projects
            </h1>
            <p className="text-sm text-[#454832] mt-1 font-medium">
              Create and manage your AI captioned viral videos.
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleLaunchSampleDemo}
              className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-[#E3E1EB] hover:bg-[#DBD8E3] text-[#2F3020] text-sm font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all"
            >
              <Sparkles className="w-4 h-4 text-[#D96846]" />
              1-Click Demo
            </button>

            <button
              type="button"
              id="dashboard-new-project-button"
              onClick={() => setModalOpen(true)}
              className="flex-1 sm:flex-none px-5 py-2 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-bold flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        {loading && projects.length === 0 ? (
          <div className="flex items-center justify-center p-20 text-[#2F3020]/60">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <EmptyProjectsState
            onNewProject={() => setModalOpen(true)}
            onTryDemo={handleLaunchSampleDemo}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {projects.map((proj) => (
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
