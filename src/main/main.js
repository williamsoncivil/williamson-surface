const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#1a1a2e',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  buildMenu();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC Handlers
ipcMain.handle('dialog:openFile', async (_, filters) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: filters || [{ name: 'All Files', extensions: ['*'] }],
  });
  return result;
});

ipcMain.handle('dialog:saveFile', async (_, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options || {});
  return result;
});

ipcMain.handle('fs:readFile', async (_, filePath) => {
  return fs.readFileSync(filePath, 'utf8');
});

ipcMain.handle('fs:writeFile', async (_, filePath, data) => {
  if (typeof data === 'string') {
    fs.writeFileSync(filePath, data, 'utf8');
  } else {
    fs.writeFileSync(filePath, Buffer.from(data));
  }
  return true;
});

ipcMain.handle('fs:writeBinaryFile', async (_, filePath, arrayBuffer) => {
  fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
  return true;
});

function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'New Project', accelerator: 'CmdOrCtrl+N', click: () => mainWindow.webContents.send('menu:new') },
        { label: 'Open Project...', accelerator: 'CmdOrCtrl+O', click: () => mainWindow.webContents.send('menu:open') },
        { label: 'Save Project', accelerator: 'CmdOrCtrl+S', click: () => mainWindow.webContents.send('menu:save') },
        { type: 'separator' },
        { label: 'Import CSV...', accelerator: 'CmdOrCtrl+I', click: () => mainWindow.webContents.send('menu:importCSV') },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'copy' }, { role: 'paste' }] },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'resetZoom' }] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
