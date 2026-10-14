export const WHISPER_MODELS = [
  { id: 'tiny', label: 'Tiny (39 MB)', diskMb: 75, ramMb: 250, quality: 'Basic', speed: 'Fastest' },
  { id: 'base', label: 'Base (74 MB)', diskMb: 145, ramMb: 500, quality: 'Good', speed: 'Fast' },
  { id: 'small', label: 'Small (244 MB)', diskMb: 480, ramMb: 1000, quality: 'Better', speed: 'Moderate' },
  { id: 'medium', label: 'Medium (769 MB)', diskMb: 1500, ramMb: 3000, quality: 'Great', speed: 'Slow' },
  { id: 'large-v2', label: 'Large v2 (1.5 GB)', diskMb: 3000, ramMb: 6000, quality: 'Best', speed: 'Slowest' },
  { id: 'large-v3', label: 'Large v3 (1.5 GB)', diskMb: 3000, ramMb: 6000, quality: 'Best', speed: 'Slowest' },
] as const;
