import { StorageProvider } from './types.js';
import { LocalStorageProvider } from './local.js';
import { SupabaseStorageProvider } from './supabase.js';

export * from './types.js';
export * from './local.js';
export * from './supabase.js';

let activeStorageProvider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (activeStorageProvider) {
    return activeStorageProvider;
  }

  const providerType = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();

  if (providerType === 'supabase') {
    activeStorageProvider = new SupabaseStorageProvider();
  } else {
    activeStorageProvider = new LocalStorageProvider();
  }

  return activeStorageProvider;
}

export function setStorageProvider(provider: StorageProvider | null): void {
  activeStorageProvider = provider;
}
