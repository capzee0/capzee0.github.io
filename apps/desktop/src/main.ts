import { app, BrowserWindow, dialog, ipcMain, shell, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1024,
    minHeight: 700,
    title: 'Capzee — AI Video Captioning & Smart Editing',
    backgroundColor: '#0f0f11',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const devUrl = 'http://localhost:5173';
  const prodPath = path.join(__dirname, '../../web/dist/index.html');

  if (isDev && process.env.CAPZEE_LOAD_DEV_SERVER !== 'false') {
    // Attempt loading dev server, fallback to built dist if not running
    mainWindow.loadURL(devUrl).catch(() => {
      if (fs.existsSync(prodPath)) {
        mainWindow?.loadFile(prodPath);
      } else {
        mainWindow?.loadURL(devUrl);
      }
    });
  } else if (fs.existsSync(prodPath)) {
    mainWindow.loadFile(prodPath);
  } else {
    mainWindow.loadURL(devUrl);
  }

  // Set native application menu
  const menuTemplate: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Video...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            if (mainWindow) {
              const res = await handleSelectVideo();
              if (res && !res.canceled && res.filePath) {
                mainWindow.webContents.send('desktop:video-opened', res);
              }
            }
          },
        },
        { type: 'separator' },
        { role: 'quit', label: 'Exit Capzee' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation & Guides',
          click: () => shell.openExternal('https://github.com/capzee/capzee'),
        },
        {
          label: 'FFmpeg Download',
          click: () => shell.openExternal('https://ffmpeg.org/download.html'),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // Prevent opening arbitrary windows
  mainWindow.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Native Dialog handlers
async function handleSelectVideo() {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Video File',
    properties: ['openFile'],
    filters: [
      { name: 'Video Files', extensions: ['mp4', 'mkv', 'mov', 'webm', 'avi', 'm4v'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const filePath = result.filePaths[0];
  const fileName = path.basename(filePath);
  return { canceled: false, filePath, fileName };
}

ipcMain.handle('dialog:select-video', async () => {
  return handleSelectVideo();
});

ipcMain.handle('dialog:save-file', async (_event: unknown, { content, defaultName, filters }: { content: string; defaultName: string; filters?: Array<{ name: string; extensions: string[] }> }) => {
  if (!mainWindow) return { canceled: true };
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save File',
    defaultPath: defaultName,
    filters: filters || [{ name: 'All Files', extensions: ['*'] }],
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  await fs.promises.writeFile(result.filePath, content, 'utf-8');
  return { canceled: false, filePath: result.filePath };
});

ipcMain.handle('shell:open-external', async (_event: unknown, url: string) => {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    await shell.openExternal(url);
  }
});

ipcMain.handle('shell:show-item', async (_event: unknown, fullPath: string) => {
  shell.showItemInFolder(fullPath);
});

ipcMain.handle('app:get-info', async () => {
  return {
    name: 'Capzee',
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
  };
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
