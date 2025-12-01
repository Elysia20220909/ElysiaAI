const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
	getApiUrl: () => ipcRenderer.invoke('get-api-url'),
	setApiUrl: (url) => ipcRenderer.invoke('set-api-url', url),
});
