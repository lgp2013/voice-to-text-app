const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let configPath = path.join(app.getPath('userData'), 'config.json');

// 默认配置
let config = {
  savePath: app.getPath('documents')
};

// 加载配置
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      config = { ...config, ...JSON.parse(data) };
    }
  } catch (e) {
    console.error('加载配置失败:', e);
  }
}

// 保存配置
function saveConfig() {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('保存配置失败:', e);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'icon.png')
  });

  mainWindow.loadFile('index.html');

  // 打开开发者工具（调试用）
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  loadConfig();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 选择保存目录
ipcMain.handle('select-save-path', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: '选择录音保存目录'
  });

  if (!result.canceled && result.filePaths.length > 0) {
    config.savePath = result.filePaths[0];
    saveConfig();
    return config.savePath;
  }
  return null;
});

// 获取保存路径
ipcMain.handle('get-save-path', () => {
  return config.savePath;
});

// 保存录音文件
ipcMain.handle('save-audio', async (event, { audioData, filename }) => {
  try {
    const savePath = config.savePath;
    if (!fs.existsSync(savePath)) {
      fs.mkdirSync(savePath, { recursive: true });
    }
    
    const filePath = path.join(savePath, filename);
    const buffer = Buffer.from(audioData, 'base64');
    fs.writeFileSync(filePath, buffer);
    
    return { success: true, path: filePath };
  } catch (e) {
    console.error('保存录音失败:', e);
    return { success: false, error: e.message };
  }
});

// 保存识别文本
ipcMain.handle('save-text', async (event, { text, filename }) => {
  try {
    const savePath = config.savePath;
    if (!fs.existsSync(savePath)) {
      fs.mkdirSync(savePath, { recursive: true });
    }
    
    const filePath = path.join(savePath, filename);
    fs.writeFileSync(filePath, text, 'utf8');
    
    return { success: true, path: filePath };
  } catch (e) {
    console.error('保存文本失败:', e);
    return { success: false, error: e.message };
  }
});
