const { app, BrowserWindow } = require('electron/main')
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

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
    mainWindow.loadURL('http://127.0.0.1:8050'); // Adjust the port if necessary
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
            setTimeout(() => checkDashServerReady(callback), 1000); // Retry after 1 second
        }
    });

    req.on('error', () => {
        setTimeout(() => checkDashServerReady(callback), 1000); // Retry after 1 second
    });

    req.end();
} 

function killDashServer() {
  if (dashServer) {
      console.log('Attempting to kill Dash server...');
      dashServer.kill('SIGTERM'); // Attempt graceful shutdown
      setTimeout(() => {
          console.log('Forcefully killing Dash server...');
          dashServer.kill('SIGKILL'); // Forcefully kill if not terminated
      }, 5000); // Wait for 5 seconds before forcefully killing
  }
}

app.on('ready', () => {
  const dashAppPath = path.join(__dirname, 'guitar_map.py');
  dashServer = spawn('python', [dashAppPath]);

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

  createWindow()

})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

app.on('window-all-closed', () => {
  killDashServer();
  app.quit()
})

app.on('before-quit', () => {
  killDashServer();
})

app.on('will-quit', () => {
  killDashServer();
})

process.on('SIGINT', () => {
    console.log('Received SIGINT. Closing Dash server...');
    killDashServer();
    app.quit(); // Quit the Electron app
});  
