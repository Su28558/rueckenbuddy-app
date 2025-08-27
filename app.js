let timerInterval;
let totalSeconds = 0;
let detector;
let lastAlertTime = 0;
const ALERT_COOLDOWN = 25 * 1000; // 25 Sekunden Cooldown

const webcam = document.getElementById("webcam");
const overlay = document.getElementById("overlay");
const ctx = overlay.getContext("2d");
const minutesEl = document.getElementById("minutes");
const secondsEl = document.getElementById("seconds");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const alertCard = document.getElementById("alertCard");
const alertText = document.getElementById("alertText");
const statusText = document.getElementById("statusText");
const alertSound = document.getElementById("alertSound");
const buddyImg = document.querySelector(".buddy-img img");

async function setupCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 320, height: 240 },
    audio: false
  });
  webcam.srcObject = stream;
  await new Promise(resolve => { webcam.onloadedmetadata = resolve; });
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
  alertSound.play().catch(err => console.warn("Sound konnte nicht abgespielt werden:", err));

  // Buddy Animation
  buddyImg.classList.add("buddy-alert");
  setTimeout(() => {
    alertCard.style.display = "none";
    buddyImg.classList.remove("buddy-alert");
  }, 6000);
}

async function drawOverlay(keypoints) {
  ctx.clearRect(0, 0, overlay.width, overlay.height);

  const leftShoulder = keypoints.find(p => p.name === "left_shoulder");
  const rightShoulder = keypoints.find(p => p.name === "right_shoulder");
  const nose = keypoints.find(p => p.name === "nose");

  if (leftShoulder && rightShoulder && nose) {
    const shoulderDiff = Math.abs(leftShoulder.y - rightShoulder.y);
    const forwardBend = nose.y - (leftShoulder.y + rightShoulder.y)/2;

    let color = 'green';
    if (shoulderDiff > 30 || forwardBend > 100) color = 'red';

    ctx.strokeStyle = color;
    ctx.lineWidth = 4;

    // Linie zwischen den Schultern
    ctx.beginPath();
    ctx.moveTo(leftShoulder.x, leftShoulder.y);
    ctx.lineTo(rightShoulder.x, rightShoulder.y);
    ctx.stroke();

    // Linie von Schulter-Mitte zum Kopf
    const shoulderMidX = (leftShoulder.x + rightShoulder.x)/2;
    const shoulderMidY = (leftShoulder.y + rightShoulder.y)/2;
    ctx.beginPath();
    ctx.moveTo(shoulderMidX, shoulderMidY);
    ctx.lineTo(nose.x, nose.y);
    ctx.stroke();
  }
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

      // Debug-Anzeige
      statusText.textContent = `SchulterDiff: ${Math.round(shoulderDiff)}, Vorne: ${Math.round(forwardBend)}, Kopf: ${Math.round(headTilt)}`;

      const now = Date.now();
      let alertMsg = null;

      if (shoulderDiff > 30) {
        alertMsg = "Eine Schulter hängt deutlich – richte dich auf! 💪";
      } else if (forwardBend > 100) {
        alertMsg = "Du sitzt stark nach vorne gebeugt – Brust raus, Rücken stolz! 🦁";
      } else if (headTilt > 75) {
        alertMsg = "Dein Kopf ist schief – gerade machen! 🙂";
      }

      if (alertMsg && now - lastAlertTime > ALERT_COOLDOWN) {
        lastAlertTime = now;
        showAlert(alertMsg);
      }

      // Overlay zeichnen
      drawOverlay(k);
    }
  }
  requestAnimationFrame(checkPosture);
}

startBtn.addEventListener("click", async () => {
  if (timerInterval) return;
  await setupCamera();
  await initPose();
  timerInterval = setInterval(updateTimer, 1000);
  statusText.textContent = "Alles läuft – Rückenbuddy passt auf dich auf!";
  checkPosture();
});

resetBtn.addEventListener("click", () => {
  clearInterval(timerInterval);
  timerInterval = null;
  totalSeconds = 0;
  minutesEl.textContent = "00";
  secondsEl.textContent = "00";
  alertCard.style.display = "none";
  statusText.textContent = "Alles gut – gerade sitzen, oder?";
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  buddyImg.classList.remove("buddy-alert");
});
