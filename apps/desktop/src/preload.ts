import { contextBridge, ipcRenderer } from 'electron';

export interface DesktopAPI {
  isDesktop: boolean;
  platform: string;
  selectVideoFile: () => Promise<{ canceled: boolean; filePath?: string; fileName?: string } | null>;
  saveFile: (content: string, defaultName: string, filters: Array<{ name: string; extensions: string[] }>) => Promise<{ canceled: boolean; filePath?: string }>;
  openExternal: (url: string) => Promise<void>;
  showItemInFolder: (fullPath: string) => Promise<void>;
  getAppInfo: () => Promise<{ name: string; version: string; platform: string; arch: string }>;
}

const desktopAPI: DesktopAPI = {
  isDesktop: true,
  platform: process.platform,
  selectVideoFile: () => ipcRenderer.invoke('dialog:select-video'),
  saveFile: (content, defaultName, filters) => ipcRenderer.invoke('dialog:save-file', { content, defaultName, filters }),
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
  showItemInFolder: (fullPath) => ipcRenderer.invoke('shell:show-item', fullPath),
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),
};

contextBridge.exposeInMainWorld('capzeeDesktop', desktopAPI);
