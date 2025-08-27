let timerInterval;
let totalSeconds = 0;
let detector;
let lastAlertTime = 0;
const ALERT_COOLDOWN = 25 * 1000;

const webcam = document.getElementById("webcam");
const overlay = document.getElementById("overlay");
const ctx = overlay.getContext("2d");
const minutesEl = document.getElementById("minutes");
const secondsEl = document.getElementById("seconds");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const alertCard = document.getElementById("alertCard");
const alertText = document.getElementById("alertText");
const alertSound = document.getElementById("alertSound");

async function setupCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: false });
  webcam.srcObject = stream;
  await new Promise(resolve => { webcam.onloadedmetadata = resolve; });
}

async function initPose() {
  detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING });
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
  alertSound.play().catch(err => console.warn(err));
  setTimeout(()=>{ alertCard.style.display="none"; }, 5000);
}

async function drawOverlay(keypoints) {
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  const nose = keypoints.find(p => p.name === "nose");
  const leftShoulder = keypoints.find(p => p.name === "left_shoulder");
  const rightShoulder = keypoints.find(p => p.name === "right_shoulder");
  if (!nose || !leftShoulder || !rightShoulder) return;

  const shoulderMidX = (leftShoulder.x + rightShoulder.x)/2;
  const shoulderMidY = (leftShoulder.y + rightShoulder.y)/2;
  const forwardBend = nose.y - shoulderMidY;

  ctx.strokeStyle = forwardBend > 100 ? "red" : "green";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(shoulderMidX, shoulderMidY);
  ctx.lineTo(nose.x, nose.y);
  ctx.stroke();
}

async function checkPosture() {
  const poses = await detector.estimatePoses(webcam);
  if (poses.length > 0) {
    const k = poses[0].keypoints;
    const nose = k.find(p => p.name === "nose");
    const leftShoulder = k.find(p => p.name === "left_shoulder");
    const rightShoulder = k.find(p => p.name === "right_shoulder");
    if (!nose || !leftShoulder || !rightShoulder) return;

    const shoulderMidY = (leftShoulder.y + rightShoulder.y)/2;
    const forwardBend = nose.y - shoulderMidY;

    const now = Date.now();
    if (forwardBend > 100 && now - lastAlertTime > ALERT_COOLDOWN) {
      lastAlertTime = now;
      showAlert("Du sitzt stark nach vorne gebeugt – Brust raus, Rücken stolz! 🦁");
    }

    drawOverlay(k);
  }
  requestAnimationFrame(checkPosture);
}

startBtn.addEventListener("click", async () => {
  if(timerInterval) return;
  await setupCamera();
  await initPose();
  timerInterval = setInterval(updateTimer,1000);
  checkPosture();
});

resetBtn.addEventListener("click", ()=>{
  clearInterval(timerInterval);
  timerInterval = null;
  totalSeconds = 0;
  minutesEl.textContent="00";
  secondsEl.textContent="00";
  alertCard.style.display="none";
  ctx.clearRect(0,0,overlay.width,overlay.height);
});
