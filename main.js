const { app, BrowserWindow, Menu, shell, dialog } = require('electron/main')
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const os = require('os');
const fs = require('fs');

let mainWindow;
let dashServer;

if (require('electron-squirrel-startup')) app.quit();

function createWindow() {
  mainWindow = new BrowserWindow({
      webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
      },
  });
  mainWindow.maximize();
  checkDashServerReady(() => {
    mainWindow.loadURL('http://127.0.0.1:8050');
    mainWindow.show();
  });
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

function checkDashServerReady(callback) {
  const options = {
    hostname: '127.0.0.1',
    port: 8050,
    path: '/',
    method: 'GET',
  };

  const req = http.request(options, (res) => {
    if (res.statusCode === 200) {
      callback();
    } else {
      setTimeout(() => checkDashServerReady(callback), 1000);
    }
  });

  req.on('error', () => {
    setTimeout(() => checkDashServerReady(callback), 1000);
  });

  req.end();
}

function killDashServer() {
  if (dashServer) {
    console.log('Attempting to kill Dash server...');
    dashServer.kill('SIGTERM');
    setTimeout(() => {
      console.log('Forcefully killing Dash server...');
      dashServer.kill('SIGKILL');
    }, 5000);
  }
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
          click: () => mainWindow?.webContents.executeJavaScript(
            `document.getElementById('save-button').click()`
          ),
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
              await mainWindow.webContents.executeJavaScript(`
                fetch('/api/open', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: ${JSON.stringify(content)},
                }).then(() => document.getElementById('trigger-open').click());
              `);
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
            `document.getElementById('open-preferences').click()`
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

  const resources = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'dist')
    : path.join(__dirname, 'dist');
  const executableName = os.platform() === 'win32' ? 'guitar_map.exe' : 'guitar_map';
  const dashExecutable = path.join(resources, executableName);

  console.log('Launching:', dashExecutable);

  dashServer = spawn(dashExecutable, [], {
    shell: false,
    env: { ...process.env, GUITAR_MAP_ELECTRON: '1' },
  });

  dashServer.stdout.on('data', (data) => {
    console.log(`Dash Server: ${data}`);
  });

  dashServer.stderr.on('data', (data) => {
    console.error(`Dash Server Error: ${data}`);
  });

  dashServer.on('exit', (code) => {
    console.log(`Dash server exited with code ${code}`);
    app.quit();
  });

  createWindow();
});

app.on('activate', () => {
  if (mainWindow === null) { createWindow(); }
});

app.on('window-all-closed', () => {
  killDashServer();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  killDashServer();
});

app.on('will-quit', () => {
  killDashServer();
});

process.on('SIGINT', () => {
  console.log('Received SIGINT. Closing Dash server...');
  killDashServer();
  app.quit();
});
