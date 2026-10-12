import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CaptionOverlay } from '../src/features/caption-editor/components/CaptionOverlay';
import { FluxoCutTimeline } from '../src/features/caption-editor/components/FluxoCutTimeline';
import { TranscriptionPanel } from '../src/features/caption-editor/components/TranscriptionPanel';
import { CAPTION_PRESETS, type Segment, type Transcript } from '@capzee/contracts';

const sampleSegment: Segment = {
  id: 'seg-1',
  start: 1.0,
  end: 3.5,
  text: 'Hello world from Capzee',
  words: [
    { id: 'w-1', text: 'Hello', start: 1.0, end: 1.5 },
    { id: 'w-2', text: 'world', start: 1.5, end: 2.2 },
    { id: 'w-3', text: 'from', start: 2.2, end: 2.6 },
    { id: 'w-4', text: 'Capzee', start: 2.6, end: 3.5 },
  ],
};

const sampleTranscript: Transcript = {
  schemaVersion: 1,
  language: 'en',
  segments: [
    sampleSegment,
    {
      id: 'seg-2',
      start: 4.0,
      end: 6.0,
      text: 'Next segment here',
      words: [
        { id: 'w-5', text: 'Next', start: 4.0, end: 4.8 },
        { id: 'w-6', text: 'segment', start: 4.8, end: 5.5 },
        { id: 'w-7', text: 'here', start: 5.5, end: 6.0 },
      ],
    },
  ],
};

describe('CaptionOverlay', () => {
  it('renders words and highlights active word', () => {
    render(
      <CaptionOverlay
        segment={sampleSegment}
        activeWordIndex={1}
        style={CAPTION_PRESETS[0]}
      />
    );
    expect(screen.getByText(/hello/i)).toBeInTheDocument();
    expect(screen.getByText(/world/i)).toBeInTheDocument();
  });
});

describe('FluxoCutTimeline', () => {
  it('renders timecode and quick action buttons', () => {
    const handleSplit = vi.fn();
    const handleUndo = vi.fn();
    const handleRedo = vi.fn();

    render(
      <FluxoCutTimeline
        currentTime={1.5}
        duration={10.0}
        playing={false}
        onSeek={vi.fn()}
        onTogglePlay={vi.fn()}
        videoElement={null}
        transcript={sampleTranscript}
        activeSegment={sampleSegment}
        onSplit={handleSplit}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={true}
        canRedo={false}
      />
    );

    expect(screen.getByText('00:01.5')).toBeInTheDocument();
    expect(screen.getByText('00:10.0')).toBeInTheDocument();

    // Split button
    const splitBtn = screen.getByTitle(/split segment/i);
    fireEvent.click(splitBtn);
    expect(handleSplit).toHaveBeenCalledTimes(1);

    // Undo button
    const undoBtn = screen.getByTitle(/undo/i);
    fireEvent.click(undoBtn);
    expect(handleUndo).toHaveBeenCalledTimes(1);
  });
});

describe('TranscriptionPanel', () => {
  it('renders segments list, add subtitle button and export actions', () => {
    const handleAdd = vi.fn();
    const handleMerge = vi.fn();

    render(
      <TranscriptionPanel
        transcript={sampleTranscript}
        currentJob={null}
        activeSegment={sampleSegment}
        onTranscriptChange={vi.fn()}
        onStartTranscription={vi.fn()}
        onSeek={vi.fn()}
        onAddSegment={handleAdd}
        onMergeSegment={handleMerge}
      />
    );

    expect(screen.getByText('2 segments')).toBeInTheDocument();
    expect(screen.getByText('Add Subtitle')).toBeInTheDocument();

    const addBtn = screen.getByText('Add Subtitle');
    fireEvent.click(addBtn);
    expect(handleAdd).toHaveBeenCalledTimes(1);

    expect(screen.getByText('.SRT')).toBeInTheDocument();
    expect(screen.getByText('.VTT')).toBeInTheDocument();
  });
});

describe('CaptionPresetGallery & Style Controls', () => {
  it('renders preset library cards and handles selection', async () => {
    const { CaptionPresetGallery } = await import('../src/features/caption-editor/components/CaptionPresetGallery');
    const handleSelect = vi.fn();

    render(
      <CaptionPresetGallery
        selectedPresetId="kinetic-pop"
        onSelectPreset={handleSelect}
      />
    );

    // Verify preset cards are rendered directly
    expect(screen.getByText('Kinetic Pop')).toBeInTheDocument();
    expect(screen.getByText('Kinetic Slam')).toBeInTheDocument();

    // Click on a preset card
    const presetCard = screen.getByText('Kinetic Pop');
    fireEvent.click(presetCard);
    expect(handleSelect).toHaveBeenCalled();
  });

  it('renders Tamil subtitles faithfully without breaking words', () => {
    const tamilSegment: Segment = {
      id: 'seg-ta-1',
      start: 0.0,
      end: 2.0,
      text: 'வணக்கம் நண்பர்களே உங்கள் வீடியோவில்',
      words: [
        { id: 'w-ta-1', text: 'வணக்கம்', start: 0.0, end: 0.6 },
        { id: 'w-ta-2', text: 'நண்பர்களே', start: 0.7, end: 1.3 },
        { id: 'w-ta-3', text: 'உங்கள்', start: 1.4, end: 1.7 },
        { id: 'w-ta-4', text: 'வீடியோவில்', start: 1.8, end: 2.0 },
      ],
    };

    render(
      <CaptionOverlay
        segment={tamilSegment}
        activeWordIndex={0}
        style={{
          ...CAPTION_PRESETS[0],
          fontFamily: 'Inter',
        }}
      />
    );

    expect(screen.getByText('வணக்கம்')).toBeInTheDocument();
    expect(screen.getByText('நண்பர்களே')).toBeInTheDocument();
  });

  it('renders CaptionStyleControls and triggers reset to defaults', async () => {
    const { CaptionStyleControls } = await import('../src/features/caption-editor/components/CaptionStyleControls');
    const handleChange = vi.fn();

    render(
      <CaptionStyleControls
        captionStyle={{
          ...CAPTION_PRESETS[0],
          aspectRatio: '9:16',
        }}
        onChange={handleChange}
      />
    );

    expect(screen.getByText('Style Customization')).toBeInTheDocument();
    expect(screen.getByText('Reset Defaults')).toBeInTheDocument();

    const resetBtn = screen.getByText('Reset Defaults');
    fireEvent.click(resetBtn);
    expect(handleChange).toHaveBeenCalled();
  });

  it('renders FluxoCutSilencePanel with sensitivity presets and action button', async () => {
    const { FluxoCutSilencePanel } = await import('../src/features/caption-editor/components/FluxoCutSilencePanel');
    const handleClipsRemoved = vi.fn();

    render(
      <FluxoCutSilencePanel
        projectId="test-proj-123"
        onClipsRemoved={handleClipsRemoved}
      />
    );

    expect(screen.getByText('Silence Remover')).toBeInTheDocument();
    expect(screen.getByText('gentle')).toBeInTheDocument();
    expect(screen.getByText('balanced')).toBeInTheDocument();
    expect(screen.getByText('tight')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove silences/i })).toBeInTheDocument();
  });
});
