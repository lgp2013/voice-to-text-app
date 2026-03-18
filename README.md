# 实时语音识别录音工具

基于 Electron + Web Speech API 实现的实时语音转文字并录音的桌面应用。

## 功能特性

- 🎤 **实时语音识别**：使用 Web Speech API 将麦克风输入实时转为文字
- 🔴 **录音保存**：录制音频并保存为 WebM 格式
- 📁 **自定义保存路径**：可设置默认保存目录
- ⏱️ **录音计时**：显示录音时长
- 📝 **文本导出**：识别文字保存为 TXT 文件

## 技术栈

- Electron 28
- Web Speech API (SpeechRecognition)
- MediaRecorder API

## 开发

```bash
# 安装依赖
cd voice-to-text-app
npm install

# 运行开发版本
npm start
```

## 构建 exe

```bash
# 构建 Windows 安装包
npm run build
```

构建完成后，在 `dist/` 目录下找到生成的 exe 文件。

## 使用说明

1. 首次运行需要授予麦克风权限
2. 点击"开始录音"按钮开始识别和录音
3. 说话内容会实时显示在下方
4. 点击"停止录音"结束，文件会自动保存到指定目录

## 注意事项

- 需要 Chrome/Edge 等支持 Web Speech API 的浏览器
- 录音格式为 WebM，可转换为 MP3
- 语音识别需要网络连接（Chrome 的 Web Speech API 需要联网）
# 测试自动推送
