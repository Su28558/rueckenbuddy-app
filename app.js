let timerInterval;
let totalSeconds = 0;
let detector;
let lastAlertTime = 0;
const ALERT_COOLDOWN = 25 * 1000; // nur alle 25 Sekunden warnen

const webcam = document.getElementById("webcam");
const minutesEl = document.getElementById("minutes");
const secondsEl = document.getElementById("seconds");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const alertCard = document.getElementById("alertCard");
const alertText = document.getElementById("alertText");
const statusText = document.getElementById("statusText");
const alertSound = document.getElementById("alertSound");

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
  alertSound.currentTime = 0; 
  alertSound.play();
  setTimeout(()=>{alertCard.style.display="none";}, 6000);
}

async function checkPosture() {
  const poses = await detector.estimatePoses(webcam);
  if (poses.length > 0) {
    const k = poses[0].keypoints;
    const leftShoulder = k.find(p => p.name === "left_shoulder");
    const rightShoulder = k.find(p => p.name === "right_shoulder");
    const nose = k.find(p => p.name === "nose");

    if (leftShoulder && rightShoulder && nose) {
      const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
      const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;

      const shoulderDiff = Math.abs(leftShoulder.y - rightShoulder.y); 
      const forwardBend = nose.y - shoulderMidY; 
      const headTilt = Math.abs(nose.x - shoulderMidX); 

      const now = Date.now();
      let alertMsg = null;

      if (shoulderDiff > 70) {
        alertMsg = "Eine Schulter hängt deutlich – richte dich auf! 💪";
      } else if (forwardBend > 120) {
        alertMsg = "Du bist stark nach vorne gebeugt – Brust raus, Rücken stolz! 🦁";
      } else if (headTilt > 100) {
        alertMsg = "Dein Kopf hängt krass schief – bleib im Lot! 🙂";
      }

      if (alertMsg && now - lastAlertTime > ALERT_COOLDOWN) {
        lastAlertTime = now;
        showAlert(alertMsg);
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
  statusText.textContent = "Alles läuft – Rückenbuddy passt auf dich auf!";
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
