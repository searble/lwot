'use strict';

const {app, BrowserWindow, ipcMain} = require("electron");

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({width: 1440, height: 860});
    mainWindow.loadURL("file://" + __dirname + "/www/index.html");
    mainWindow.webContents.openDevTools();
    mainWindow.on("closed", function () {
        mainWindow = null;
    });
}

app.on("ready", createWindow);

app.on("window-all-closed", function () {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", function () {
    if (mainWindow === null) {
        createWindow();
    }
});