let timerInterval;
let totalSeconds = 0;
let detector;
const webcam = document.getElementById("webcam");
const minutesEl = document.getElementById("minutes");
const secondsEl = document.getElementById("seconds");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const alertCard = document.getElementById("alertCard");
const alertText = document.getElementById("alertText");
const statusText = document.getElementById("statusText");

async function setupCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 320, height: 240 },
    audio: false
  });
  webcam.srcObject = stream;
  await new Promise((resolve) => { webcam.onloadedmetadata = resolve; });
}

async function initPose() {
  const detectorConfig = { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING };
  detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, detectorConfig);
}

function updateTimer() {
  totalSeconds++;
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  minutesEl.textContent = mins.toString().padStart(2,'0');
  secondsEl.textContent = secs.toString().padStart(2,'0');
}

function showAlert(message) {
  alertText.textContent = message;
  alertCard.style.display = "block";
  setTimeout(()=>{alertCard.style.display="none";}, 5000);
}

async function checkPosture() {
  const poses = await detector.estimatePoses(webcam);
  if (poses.length > 0) {
    const keypoints = poses[0].keypoints;
    const leftShoulder = keypoints.find(k => k.name === "left_shoulder");
    const rightShoulder = keypoints.find(k => k.name === "right_shoulder");
    if (leftShoulder && rightShoulder) {
      const shoulderDiff = Math.abs(leftShoulder.y - rightShoulder.y);
      if (shoulderDiff > 20) { // Threshold krumm
        const texts = [
          "Ups, dein Rücken macht wieder Yoga ohne dich! 😱",
          "Rücken sagt: 'Hallo? Ich bin noch da!' 🤨",
          "Gerade sitzen, bitte! Dein Rücken liebt dich. ❤️",
          "Noch 5 Minuten, dann gibt’s Streck-Party! 🕺",
          "Du krummst schon wieder – Zeit für ein kleines Yoga! 🧘‍♂️"
        ];
        const randomText = texts[Math.floor(Math.random()*texts.length)];
        showAlert(randomText);
      }
    }
  }
  requestAnimationFrame(checkPosture);
}

startBtn.addEventListener("click", async () => {
  if(timerInterval) return;
  await setupCamera();
  await initPose();
  timerInterval = setInterval(updateTimer,1000);
  statusText.textContent = "Alles läuft – Rückenbuddy überwacht dich!";
  checkPosture();
});

resetBtn.addEventListener("click", ()=>{
  clearInterval(timerInterval);
  timerInterval = null;
  totalSeconds = 0;
  minutesEl.textContent = "00";
  secondsEl.textContent = "00";
  alertCard.style.display = "none";
  statusText.textContent = "Alles gut – gerade sitzen, oder?";
});
