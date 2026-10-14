import { useState, useEffect } from 'react';
import { useProjectStore, type Project } from '@/stores/projectStore';
import { getProject, getTranscript, getMediaUrl, subscribeJobEvents } from '@/services/api';
import { getDemoTranscript } from '@capzee/contracts';

interface UseProjectLoaderProps {
  projectId?: string;
}

export function useProjectLoader({ projectId }: UseProjectLoaderProps) {
  const {
    projects,
    currentProject,
    setCurrentProject,
    currentTranscript,
    setCurrentTranscript,
    localVideoFile,
    currentJob,
    updateJob,
  } = useProjectStore();

  const [loading, setLoading] = useState(true);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  // Load project & transcript
  useEffect(() => {
    if (!projectId) return;
    const currentId = projectId;

    let isMounted = true;
    setLoading(true);

    async function load() {
      try {
        let project: Project | null = currentProject?.id === currentId ? currentProject : null;
        if (!project) {
          const stored = projects.find((p) => p.id === currentId);
          if (stored) {
            project = stored;
          } else if (!currentId.startsWith('local-')) {
            try {
              const remote = await getProject(currentId);
              project = remote;
            } catch (err) {
              console.warn('Could not fetch project from API:', err);
            }
          }
        }

        const resolvedProject: Project = project || {
          id: currentId,
          title: 'Untitled Video Project',
          status: 'ready',
          durationSeconds: 15.0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (isMounted) {
          setCurrentProject(resolvedProject);
        }

        // Setup video source
        if (localVideoFile) {
          if (isMounted) setVideoSrc(URL.createObjectURL(localVideoFile));
        } else if (resolvedProject.originalAssetPath && !currentId.startsWith('local-')) {
          if (isMounted) setVideoSrc(getMediaUrl(resolvedProject.id));
        }

        // Fetch transcript
        if (!currentTranscript && !currentId.startsWith('local-')) {
          try {
            const transcript = await getTranscript(currentId);
            if (isMounted && transcript) {
              setCurrentTranscript(transcript);
            }
          } catch {
            if (isMounted) {
              setCurrentTranscript(getDemoTranscript('ta', 'roman'));
            }
          }
        } else if (!currentTranscript) {
          if (isMounted) {
            setCurrentTranscript(getDemoTranscript('ta', 'roman'));
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Subscribe to real-time SSE job events
  useEffect(() => {
    if (!currentJob?.id || currentJob.status === 'completed' || currentJob.status === 'failed' || !projectId) {
      return;
    }

    const currentId = projectId;
    let isSubscribed = true;

    subscribeJobEvents(currentJob.id, (updatedJob) => {
      if (!isSubscribed) return;
      updateJob(updatedJob);
      if (updatedJob.status === 'completed') {
        getTranscript(currentId).then((t) => {
          if (isSubscribed && t) setCurrentTranscript(t);
        }).catch(() => {});
      }
    }).catch(() => {});

    return () => {
      isSubscribed = false;
    };
  }, [currentJob?.id, currentJob?.status, projectId, updateJob, setCurrentTranscript]);

  return {
    loading,
    videoSrc,
    setVideoSrc,
  };
}
