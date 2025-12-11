const { app, BrowserWindow, ipcMain } = require("electron");
const Store = require("electron-store");
const path = require("node:path");

const store = new Store();

let mainWindow;

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		backgroundColor: "#FFB7D5",
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
			preload: path.join(__dirname, "preload.js"),
		},
		icon: path.join(__dirname, "assets", "icon.png"),
	});

	mainWindow.loadFile("index.html");

	// Dev tools (comment out for production)
	// mainWindow.webContents.openDevTools();

	mainWindow.on("closed", () => {
		mainWindow = null;
	});
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});

// IPC handlers
ipcMain.handle("get-api-url", () => {
	return store.get("apiUrl", "http://localhost:3000");
});

ipcMain.handle("set-api-url", (_event, url) => {
	store.set("apiUrl", url);
	return true;
});
