const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectSavePath: () => ipcRenderer.invoke('select-save-path'),
  getSavePath: () => ipcRenderer.invoke('get-save-path'),
  saveAudio: (data) => ipcRenderer.invoke('save-audio', data),
  saveText: (data) => ipcRenderer.invoke('save-text', data)
});
