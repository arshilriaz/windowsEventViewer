const { app, BrowserWindow } = require('electron');
const { exec } = require('child_process');
const path = require('path');
const { screen } = require('electron');


function createWindow() {
    // Get the primary display's size
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
  
    // Create the browser window with the display's dimensions
    const win = new BrowserWindow({
      width: width,
      height: height,
      webPreferences: {
        nodeIntegration: true,
      },
    });
  
    setTimeout(() => {
      win.loadURL('http://localhost:5000/home'); // URL where Flask is running
    }, 3000); // 5-second delay
  }

app.whenReady().then(() => {
  // Start the Flask app
  exec('python ../run.py', (err, stdout, stderr) => {
    if (err) {
      console.error(`Error starting Flask app: ${err}`);
      return;
    }
    console.log(`Flask app started: ${stdout}`);
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
