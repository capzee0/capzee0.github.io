import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Transcript, CaptionStyle } from '@capzee/contracts';
import { CAPTION_PRESETS } from '@capzee/contracts';

export interface Project {
  id: string;
  title: string;
  status: string;
  durationSeconds: number | null;
  originalAssetPath: string | null;
  localVideoUrl: string | null; // blob URL for local preview
  createdAt: string;
  updatedAt: string;
}

export interface JobState {
  id: string;
  status: string;
  progress: number;
  stage: string | null;
  errorCode: string | null;
  errorMessage: string | null;
}

interface ProjectStore {
  projects: Project[];
  currentProject: Project | null;
  currentTranscript: Transcript | null;
  currentJob: JobState | null;
  captionStyle: CaptionStyle;
  localVideoFile: File | null;

  // Actions
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  removeProject: (id: string) => void;
  setCurrentProject: (project: Project | null) => void;
  setCurrentTranscript: (transcript: Transcript | null) => void;
  setCurrentJob: (job: JobState | null) => void;
  updateJob: (updates: Partial<JobState>) => void;
  setCaptionStyle: (style: Partial<CaptionStyle>) => void;
  setLocalVideoFile: (file: File | null) => void;
}

const defaultCaptionStyle: CaptionStyle = {
  ...CAPTION_PRESETS[0],
  aspectRatio: '9:16',
};

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      projects: [],
      currentProject: null,
      currentTranscript: null,
      currentJob: null,
      captionStyle: defaultCaptionStyle,
      localVideoFile: null,

      setProjects: (projects) => set({ projects }),
      addProject: (project) =>
        set((state) => ({ projects: [project, ...state.projects] })),
      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
          currentProject:
            state.currentProject?.id === id
              ? { ...state.currentProject, ...updates }
              : state.currentProject,
        })),
      removeProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          currentProject: state.currentProject?.id === id ? null : state.currentProject,
        })),
      setCurrentProject: (project) => set({ currentProject: project }),
      setCurrentTranscript: (transcript) => set({ currentTranscript: transcript }),
      setCurrentJob: (job) => set({ currentJob: job }),
      updateJob: (updates) =>
        set((state) => ({
          currentJob: state.currentJob ? { ...state.currentJob, ...updates } : null,
        })),
      setCaptionStyle: (style) =>
        set((state) => ({ captionStyle: { ...state.captionStyle, ...style } })),
      setLocalVideoFile: (file) => set({ localVideoFile: file }),
    }),
    {
      name: 'capzee-projects',
      partialize: (state) => ({
        projects: state.projects,
        captionStyle: state.captionStyle,
      }),
    }
  )
);
