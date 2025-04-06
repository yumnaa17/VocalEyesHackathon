const video = document.getElementById('video');
const textCanvas = document.getElementById('textCanvas');
const textDisplay = document.getElementById('textDisplay');
const readTextBtn = document.getElementById('readTextBtn');
const cameraDetectionBtn = document.getElementById('CameraDetection');
const askGeminiBtn = document.getElementById('askGeminiBtn');


let isReadingText = false;
let isGeminiActive = false;
let recognition = null;
let worker = null;


window.addEventListener('DOMContentLoaded', async () => {
  if (await initCamera()) {
    initTesseract().catch(console.error);
  }
  

  readTextBtn.addEventListener('click', toggleTextReading);
  cameraDetectionBtn.addEventListener('click', detectObjects);
  askGeminiBtn.addEventListener('click', toggleGeminiChat);
});


async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { width: 1280, height: 720 } 
    });
    video.srcObject = stream;
    return true;
  } catch (err) {
    console.error('Camera error:', err);
    speak('Could not access camera. Please enable camera permissions.');
    return false;
  }
}


async function initTesseract() {
  worker = await Tesseract.createWorker('eng');
  console.log('Tesseract initialized');
}


async function detectObjects() {
  try {
    const model = await cocoSsd.load();
    const predictions = await model.detect(video);
    
    if (predictions.length === 0) {
      speak("No objects detected.");
      return;
    }

    predictions.forEach(obj => {
      const position = getObjectPosition(obj.bbox, video.width);
      speak(`${obj.class} ${position}`);
    });
  } catch (error) {
    console.error("Error detecting objects:", error);
    speak("Sorry, there was an error detecting objects.");
  }
}

function getObjectPosition(bbox, videoWidth) {
  const [x, , width] = bbox;
  const centerX = x + (width / 2);
  const percent = (centerX / videoWidth) * 100;

  if (percent < 40) return "on your left";
  else if (percent > 60) return "on your right";
  else return "ahead of you";
}


function toggleTextReading() {
  if (isReadingText) {
    stopReading();
  } else {
    startReading();
  }
}

function startReading() {
  if (!worker) {
    speak("Text recognition is still initializing. Please try again in a few seconds.");
    return;
  }
  
  isReadingText = true;
  updateButtonStates();
  drawScanBox();
  processScanArea();
  

  window.textScanInterval = setInterval(processScanArea, 5000);
  speak("Text scanning started. Point camera at text.");
}

function stopReading() {
  isReadingText = false;
  updateButtonStates();
  clearInterval(window.textScanInterval);
  

  const ctx = textCanvas.getContext('2d');
  ctx.clearRect(0, 0, textCanvas.width, textCanvas.height);
  speak("Text scanning stopped.");
}

function drawScanBox() {
  const ctx = textCanvas.getContext('2d');
  textCanvas.width = video.videoWidth || video.clientWidth;
  textCanvas.height = video.videoHeight || video.clientHeight;
  

  ctx.strokeStyle = 'red';
  ctx.lineWidth = 3;
  
  const boxWidth = textCanvas.width * 0.6;
  const boxHeight = textCanvas.height * 0.2;
  const startX = (textCanvas.width - boxWidth) / 2;
  const startY = (textCanvas.height - boxHeight) / 2;
  
  ctx.strokeRect(startX, startY, boxWidth, boxHeight);
}

async function processScanArea() {
  if (!isReadingText || !worker) return;
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  

  const scanWidth = video.videoWidth * 0.6;
  const scanHeight = video.videoHeight * 0.2;
  const startX = (video.videoWidth - scanWidth) / 2;
  const startY = (video.videoHeight - scanHeight) / 2;
  
  canvas.width = scanWidth;
  canvas.height = scanHeight;

  ctx.drawImage(video, startX, startY, scanWidth, scanHeight, 0, 0, scanWidth, scanHeight);
  

  try {
    const enhancedCanvas = enhanceImage(canvas);
    const result = await worker.recognize(enhancedCanvas);
    const cleanedText = cleanText(result.data.text);
    
    if (cleanedText.trim()) {
      updateTextDisplay(cleanedText);
      speak(cleanedText);
    }
  } catch (error) {
    console.error('Text recognition error:', error);
  }
}

function cleanText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function enhanceImage(canvas) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  

  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const adjusted = avg > 128 ? 255 : 0; 
    
    data[i] = adjusted;     
    data[i + 1] = adjusted; 
    data[i + 2] = adjusted; 
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}


async function toggleGeminiChat() {
  if (isGeminiActive) {
    stopGeminiChat();
  } else {
    await startGeminiChat();
  }
}

async function startGeminiChat() {
  if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
    speak("Voice input is not supported in this browser");
    return;
  }


  if (isReadingText) stopReading();
  
  speak("I'm listening. What would you like help with?");
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  
  recognition.onresult = async (event) => {
    const question = event.results[0][0].transcript;
    updateTextDisplay(`You: ${question}`);    
    speak("Let me think...");
    try {

      const response = await askGemini(question);
      updateTextDisplay(`Assistant: ${response}`);
      speak(response);
    } catch (error) {
      console.error("Gemini error:", error);
      speak("Sorry, I couldn't get an answer at this time.");
    }
  };
  
  recognition.onerror = (event) => {
    console.error("Recognition error:", event.error);
    speak("Sorry, I didn't catch that. Please try again.");
  };
  
  recognition.onend = () => {

    if (isGeminiActive) {
      recognition.start();
    } else {
      updateButtonStates();
    }
  };
  
  recognition.start();
  isGeminiActive = true;
  updateButtonStates();
}

function stopGeminiChat() {
  if (recognition) {
    recognition.stop();
  }
  isGeminiActive = false;
  updateButtonStates();
  speak("Assistant disconnected.");
}


function updateTextDisplay(content) {
  textDisplay.textContent += (textDisplay.textContent ? '\n' : '') + content;
  textDisplay.scrollTop = textDisplay.scrollHeight;
}


function updateButtonStates() {

  readTextBtn.textContent = isReadingText ? "Stop Scanning" : "Scan Text";
  readTextBtn.style.backgroundColor = isReadingText ? "red" : "yellow";
  readTextBtn.style.color = isReadingText ? "white" : "darkgreen";
  

  askGeminiBtn.textContent = isGeminiActive ? "Stop Listening" : "Ask For Help";
  askGeminiBtn.style.backgroundColor = isGeminiActive ? "red" : "yellow";
  askGeminiBtn.style.color = isGeminiActive ? "white" : "darkgreen";
  

  readTextBtn.disabled = isGeminiActive;
  cameraDetectionBtn.disabled = isGeminiActive;
}

function speak(text) {
  if (!text) return;
  

  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;  
  utterance.pitch = 1.0; 
  window.speechSynthesis.speak(utterance);
}