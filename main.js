const { app, BrowserWindow, Menu, shell, dialog } = require('electron/main');
const path = require('path');
const fs = require('fs');

let mainWindow;

if (require('electron-squirrel-startup')) app.quit();

function createWindow() {
  mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  mainWindow.maximize();

  const indexPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'index.html')
    : path.join(__dirname, 'dist', 'index.html');

  mainWindow.loadFile(indexPath);
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.on('ready', () => {
  const isMac = process.platform === 'darwin';

  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        {
          label: 'Save',
          accelerator: isMac ? 'Cmd+S' : 'Ctrl+S',
          click: async () => {
            if (!mainWindow) return;
            const json = await mainWindow.webContents.executeJavaScript(
              'JSON.stringify(GuitarMap.getSettings(), null, 2)'
            );
            const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
              defaultPath: 'guitar_map.json',
              filters: [{ name: 'Guitar Map Settings', extensions: ['json'] }],
            });
            if (canceled || !filePath) return;
            try { fs.writeFileSync(filePath, json, 'utf-8'); }
            catch (e) { console.error('Failed to save settings:', e); }
          },
        },
        {
          label: 'Open',
          accelerator: isMac ? 'Cmd+O' : 'Ctrl+O',
          click: async () => {
            if (!mainWindow) return;
            const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
              filters: [{ name: 'Guitar Map Settings', extensions: ['json'] }],
              properties: ['openFile'],
            });
            if (canceled || filePaths.length === 0) return;
            try {
              const content = fs.readFileSync(filePaths[0], 'utf-8');
              const data = JSON.stringify(JSON.parse(content));
              await mainWindow.webContents.executeJavaScript(
                `GuitarMap.applyLoadedSettings(${data})`
              );
            } catch (e) {
              console.error('Failed to open settings file:', e);
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: isMac ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Preferences',
          accelerator: isMac ? 'Cmd+,' : 'Ctrl+,',
          click: () => mainWindow?.webContents.executeJavaScript(
            `document.getElementById('open-preferences-btn').click()`
          ),
        },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => shell.openExternal('https://github.com/kwehage/guitar-map'),
        },
      ],
    },
  ]));

  createWindow();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
