import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from '../src/features/dashboard/DashboardPage';
import { formatDuration, formatFileSize } from '../src/lib/utils';

// Mock the API to avoid real network calls
vi.mock('../src/services/api', () => ({
  listProjects: vi.fn().mockResolvedValue([]),
  deleteProject: vi.fn().mockResolvedValue({ deleted: true }),
}));

describe('DashboardPage', () => {
  it('renders the new project button', async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );
    // Button should exist
    const btn = screen.getByRole('button', { name: /new project/i });
    expect(btn).toBeInTheDocument();
  });

  it('shows empty state when no projects', async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );
    // Empty state appears after loading
    await screen.findByText(/no projects yet/i);
  });
});

describe('Utility functions', () => {
  describe('formatDuration', () => {
    it('formats 0 as 0:00', () => {
      expect(formatDuration(0)).toBe('0:00');
    });

    it('formats 65 seconds as 1:05', () => {
      expect(formatDuration(65)).toBe('1:05');
    });

    it('formats 3661 seconds as 1:01:01', () => {
      expect(formatDuration(3661)).toBe('1:01:01');
    });

    it('returns --:-- for null', () => {
      expect(formatDuration(null)).toBe('--:--');
    });

    it('returns --:-- for NaN', () => {
      expect(formatDuration(NaN)).toBe('--:--');
    });
  });

  describe('formatFileSize', () => {
    it('formats bytes', () => {
      expect(formatFileSize(512)).toBe('512 B');
    });

    it('formats kilobytes', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('formats megabytes', () => {
      expect(formatFileSize(10 * 1024 * 1024)).toBe('10.0 MB');
    });

    it('returns — for null', () => {
      expect(formatFileSize(null)).toBe('—');
    });
  });
});
