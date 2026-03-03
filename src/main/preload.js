const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: (filters) => ipcRenderer.invoke('dialog:openFile', filters),
  saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),
  readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('fs:writeFile', filePath, data),
  writeBinaryFile: (filePath, arrayBuffer) => ipcRenderer.invoke('fs:writeBinaryFile', filePath, arrayBuffer),
  onMenu: (callback) => {
    ['new', 'open', 'save', 'importCSV'].forEach(event => {
      ipcRenderer.on(`menu:${event}`, () => callback(event));
    });
  },
});
