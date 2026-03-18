// 全局变量
let recognition = null;
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let isListening = false;
let startTime = null;
let timerInterval = null;
let fullText = '';
let audioBlob = null;

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  // 加载保存路径
  const savePath = await window.electronAPI.getSavePath();
  document.getElementById('savePath').textContent = savePath;

  // 检查浏览器是否支持Web Speech API
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert('您的浏览器不支持Web Speech API，请使用Chrome浏览器');
    return;
  }

  // 初始化语音识别
  initSpeechRecognition();
});

// 初始化语音识别
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'zh-CN';

  recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    if (finalTranscript) {
      addText(finalTranscript, true);
    } else if (interimTranscript) {
      updateInterimText(interimTranscript);
    }
  };

  recognition.onerror = (event) => {
    console.error('语音识别错误:', event.error);
    if (event.error === 'no-speech') {
      // 没有语音输入，继续监听
    } else if (event.error === 'not-allowed') {
      updateStatus('error', '麦克风权限被拒绝');
      stopRecording();
    }
  };

  recognition.onend = () => {
    // 如果还在录音状态，重新启动
    if (isListening) {
      try {
        recognition.start();
      } catch (e) {
        console.error('重启识别失败:', e);
      }
    }
  };
}

// 选择保存路径
async function selectPath() {
  const path = await window.electronAPI.selectSavePath();
  if (path) {
    document.getElementById('savePath').textContent = path;
  }
}

// 开始录音
async function startRecording() {
  try {
    // 请求麦克风权限
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // 设置MediaRecorder
    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
    mediaRecorder = new MediaRecorder(stream, { mimeType });
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      audioBlob = new Blob(audioChunks, { type: mimeType });
      // 停止所有轨道
      stream.getTracks().forEach(track => track.stop());
    };

    // 开始录音
    mediaRecorder.start(1000); // 每秒收集一次数据
    isRecording = true;

    // 开始语音识别
    recognition.start();
    isListening = true;

    // 记录开始时间
    startTime = new Date();
    fullText = '';

    // 启动计时器
    timerInterval = setInterval(updateTimer, 1000);

    // 更新UI
    document.getElementById('startBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;
    updateStatus('listening', '正在录音和识别...');

    // 清空显示
    document.getElementById('textDisplay').innerHTML = '';

  } catch (error) {
    console.error('开始录音失败:', error);
    alert('无法访问麦克风，请确保已授予权限\n错误: ' + error.message);
  }
}

// 停止录音
async function stopRecording() {
  isRecording = false;
  isListening = false;

  // 停止语音识别
  if (recognition) {
    recognition.stop();
  }

  // 停止录音
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }

  // 停止计时器
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  // 更新UI
  document.getElementById('startBtn').disabled = false;
  document.getElementById('stopBtn').disabled = true;
  updateStatus('idle', '录音已停止');

  // 保存文件
  await saveFiles();
}

// 保存录音和文本
async function saveFiles() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const baseName = `录音_${timestamp}`;

  // 保存音频
  if (audioBlob && audioBlob.size > 0) {
    try {
      // 转换为base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64 = reader.result.split(',')[1];
        
        // 保存为webm（需要转换为MP3的话需要额外处理，这里先保存原格式）
        const audioResult = await window.electronAPI.saveAudio({
          audioData: base64,
          filename: `${baseName}.webm`
        });

        if (audioResult.success) {
          console.log('录音已保存:', audioResult.path);
        }

        // 保存文本
        if (fullText) {
          const textResult = await window.electronAPI.saveText({
            text: fullText,
            filename: `${baseName}.txt`
          });

          if (textResult.success) {
            console.log('文本已保存:', textResult.path);
            alert(`录音和文本已保存到:\n${document.getElementById('savePath').textContent}`);
          }
        }
      };
    } catch (error) {
      console.error('保存失败:', error);
    }
  }
}

// 更新计时器
function updateTimer() {
  if (!startTime) return;

  const elapsed = Math.floor((new Date() - startTime) / 1000);
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  document.getElementById('timer').textContent = 
    `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// 更新状态显示
function updateStatus(status, text) {
  const indicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');

  indicator.className = 'status-indicator';
  if (status === 'recording' || status === 'listening') {
    indicator.classList.add(status);
  }

  statusText.textContent = text;
}

// 添加文字（最终结果）
function addText(text, isFinal) {
  const display = document.getElementById('textDisplay');
  
  // 移除空的提示
  const emptyHint = display.querySelector('.empty-hint');
  if (emptyHint) {
    emptyHint.remove();
  }

  // 移除之前的 interim 内容
  const interimElements = display.querySelectorAll('.interim');
  interimElements.forEach(el => el.remove());

  // 添加最终文字
  const time = new Date().toLocaleTimeString();
  const line = document.createElement('div');
  line.className = 'text-line';
  line.innerHTML = `<span class="time">${time}</span><span class="text">${text}</span>`;
  display.appendChild(line);

  // 滚动到底部
  display.scrollTop = display.scrollHeight;

  // 更新完整文本
  fullText += text + '\n';
}

// 更新临时识别文字
function updateInterimText(text) {
  const display = document.getElementById('textDisplay');
  
  // 移除旧的 interim
  const oldInterim = display.querySelector('.interim');
  if (oldInterim) {
    oldInterim.remove();
  }

  // 添加新的 interim
  const line = document.createElement('div');
  line.className = 'text-line interim';
  line.innerHTML = `<span class="text">${text}</span>`;
  display.appendChild(line);

  // 滚动到底部
  display.scrollTop = display.scrollHeight;
}
