import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, act, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { CaptionStyleControls } from '../src/features/caption-editor/components/CaptionStyleControls';
import { ExportModal } from '../src/features/caption-editor/components/ExportModal';
import { NewProjectPage } from '../src/features/projects/NewProjectPage';
import { DashboardPage } from '../src/features/dashboard/DashboardPage';
import { useProjectStore } from '../src/stores/projectStore';
import { CAPTION_PRESETS, type Transcript } from '@capzee/contracts';

function getDuplicateIds(container: HTMLElement) {
  const formElements = container.querySelectorAll('input, select, textarea');
  const ids: Record<string, Element[]> = {};
  
  formElements.forEach((el) => {
    if (el.id) {
      if (!ids[el.id]) ids[el.id] = [];
      ids[el.id].push(el);
    }
  });

  const allElementsWithId = container.querySelectorAll('[id]');
  const allIds: Record<string, Element[]> = {};
  allElementsWithId.forEach((el) => {
    if (el.id) {
      if (!allIds[el.id]) allIds[el.id] = [];
      allIds[el.id].push(el);
    }
  });

  const duplicateFormIds = Object.entries(ids).filter(([_, list]) => list.length > 1);
  const duplicateAllIds = Object.entries(allIds).filter(([_, list]) => list.length > 1);

  return { duplicateFormIds, duplicateAllIds, totalFormIds: Object.keys(ids).length, totalElements: formElements.length };
}

describe('Thorough Duplicate Form Field ID Audit', () => {
  it('guarantees unique IDs when desktop and mobile CaptionStyleControls coexist simultaneously (16 controls)', () => {
    const handleChange = vi.fn();

    // Render both desktop and mobile style control suites in the exact same DOM tree
    const { container } = render(
      <div>
        <form id="desktop-editor-form">
          <CaptionStyleControls
            idPrefix="desktop-style"
            captionStyle={{
              ...CAPTION_PRESETS[0],
              aspectRatio: '9:16',
            }}
            onChange={handleChange}
          />
        </form>
        <form id="mobile-editor-form">
          <CaptionStyleControls
            idPrefix="mobile-style"
            captionStyle={{
              ...CAPTION_PRESETS[0],
              aspectRatio: '9:16',
            }}
            onChange={handleChange}
          />
        </form>
      </div>
    );

    const { duplicateFormIds, duplicateAllIds, totalFormIds, totalElements } = getDuplicateIds(container);

    // Each instance has 8 form controls: Font, Weight, Size, TextColor, ActiveColor, Outline, Background, Animation
    expect(totalElements).toBe(16);
    expect(totalFormIds).toBe(16);
    expect(duplicateFormIds).toEqual([]);
    expect(duplicateAllIds).toEqual([]);
  });

  it('guarantees unique IDs in NewProjectPage across dropzone and file inputs', async () => {
    const { container } = render(
      <MemoryRouter>
        <NewProjectPage />
      </MemoryRouter>
    );

    const file = new File(['dummy'], 'video.mp4', { type: 'video/mp4' });
    const input = container.querySelector('input[type="file"]');
    if (input) {
      act(() => {
        fireEvent.change(input, { target: { files: [file] } });
      });
    }

    const { duplicateFormIds, duplicateAllIds } = getDuplicateIds(container);
    expect(duplicateFormIds).toEqual([]);
    expect(duplicateAllIds).toEqual([]);
  });

  it('guarantees unique IDs in DashboardPage and Create Project modal', async () => {
    useProjectStore.setState({
      projects: [],
      currentProject: null,
    });

    const { container } = render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    const { duplicateFormIds, duplicateAllIds } = getDuplicateIds(container);
    expect(duplicateFormIds).toEqual([]);
    expect(duplicateAllIds).toEqual([]);
  });

  it('guarantees unique IDs in ExportModal form controls', () => {
    const dummyTranscript: Transcript = {
      schemaVersion: 1,
      language: 'en',
      segments: [],
    };

    const { container } = render(
      <ExportModal
        isOpen={true}
        onClose={vi.fn()}
        transcript={dummyTranscript}
        captionStyle={CAPTION_PRESETS[0]}
        projectId="test-proj"
        videoTitle="Test Video"
      />
    );

    const { duplicateFormIds, duplicateAllIds } = getDuplicateIds(container);
    expect(duplicateFormIds).toEqual([]);
    expect(duplicateAllIds).toEqual([]);
  });
});
