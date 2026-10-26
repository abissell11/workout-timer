// ===== EDIT HERE: exercise names and images (any size; prep_images.py makes them uniform) =====
const EXERCISES = [
  { name: 'Chest Fly', image: 'images/ex1.jpg' },
  { name: 'Side Bend', image: 'images/ex2.jpg' },
  { name: 'Lateral Raise', image: 'images/ex3.jpg' },
  { name: 'Russian Twist', image: 'images/ex4.jpg' },
  { name: 'Bench Press', image: 'images/ex5.jpg' },
  { name: 'Sumo Squat', image: 'images/ex6.jpg' },
  { name: 'Bicep Curl', image: 'images/ex7.jpg' },
  { name: 'Bent Over Row', image: 'images/ex8.jpg' },
];
const DEFAULT_REPS = 10, DEFAULT_SETS = 3;
// Rest seconds; ?rest=3 in the URL overrides for testing.
const REST = Math.max(1, parseInt(new URLSearchParams(location.search).get('rest')) || 45);
// ==============================================================================================

const $ = id => document.getElementById(id);
const C = 2 * Math.PI * 90;
let idx = 0, setNo = 1, remaining = REST, endAt = 0, tick = null, paused = false, wakeLock = null, actx = null;

const key = i => 'ex' + (i + 1) + ':' + EXERCISES[i].name;
function load(i) { try { return JSON.parse(localStorage.getItem(key(i))) || {}; } catch { return {}; } }
function save() {
  const reps = clamp($('reps').value, 999, DEFAULT_REPS), sets = clamp($('sets').value, 20, DEFAULT_SETS);
  localStorage.setItem(key(idx), JSON.stringify({ reps, sets })); return { reps, sets };
}
function clamp(v, max, d) { v = parseInt(v); return v > 0 ? Math.min(v, max) : d; }
function show(id) { for (const s of ['exercise', 'timer', 'done']) $(s).classList.toggle('hidden', s !== id); }

function renderExercise() {
  const ex = EXERCISES[idx], v = load(idx);
  $('img').src = ex.image; $('img').alt = ex.name; $('name').textContent = ex.name;
  $('progress').textContent = `${idx + 1} / ${EXERCISES.length}`;
  $('reps').value = v.reps || DEFAULT_REPS; $('sets').value = v.sets || DEFAULT_SETS;
  $('back').disabled = idx === 0; updateSetInfo(); show('exercise');
}
function updateSetInfo() {
  const sets = clamp($('sets').value, 20, DEFAULT_SETS); if (setNo > sets) setNo = sets;
  $('setinfo').textContent = `Set ${setNo} of ${sets} · ${clamp($('reps').value, 999, DEFAULT_REPS)} reps`;
}
function goTo(i) { stopTimer(); idx = i; setNo = 1; if (idx >= EXERCISES.length) { show('done'); releaseWake(); } else renderExercise(); }

function startRest() {
  unlockAudio(); const { reps, sets } = save();
  $('tname').textContent = EXERCISES[idx].name;
  $('tset').textContent = `Set ${setNo} of ${sets} done · ${reps} reps`;
  $('tnext').textContent = setNo < sets ? `Next: set ${setNo + 1} of ${sets}` :
    (idx + 1 < EXERCISES.length ? `Next exercise: ${EXERCISES[idx + 1].name}` : 'Last rest — then finished!');
  remaining = REST; paused = false; $('pause').textContent = 'Pause';
  endAt = Date.now() + remaining * 1000; draw(remaining); show('timer'); requestWake();
  clearInterval(tick); tick = setInterval(onTick, 200);
}
function onTick() {
  if (paused) return;
  const left = Math.max(0, (endAt - Date.now()) / 1000); draw(left);
  if (left <= 0) { stopTimer(); finishRest(); }
}
function draw(left) {
  $('count').textContent = Math.ceil(left);
  $('arc').style.strokeDashoffset = C * (1 - left / REST);
}
function stopTimer() { clearInterval(tick); tick = null; }
function finishRest() {
  beep(); if (navigator.vibrate) navigator.vibrate([150, 80, 150, 80, 300]);
  const sets = load(idx).sets || DEFAULT_SETS;
  if (setNo < sets) { setNo++; renderExercise(); } else goTo(idx + 1);
  if (idx < EXERCISES.length) releaseWake();
}
function togglePause() {
  if (!paused) { remaining = Math.max(0, (endAt - Date.now()) / 1000); paused = true; $('pause').textContent = 'Resume'; }
  else { endAt = Date.now() + remaining * 1000; paused = false; $('pause').textContent = 'Pause'; }
}

// ---- Audio: funky 5-note arpeggio ----
function unlockAudio() {
  if (!actx) { const A = window.AudioContext || window.webkitAudioContext; if (A) actx = new A(); }
  if (actx && actx.state === 'suspended') actx.resume();
}
function beep() {
  if (!actx) return; const t0 = actx.currentTime + 0.05;
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C5 E5 G5 C6 E6
  const times = [0, 0.12, 0.24, 0.36, 0.52], lens = [0.1, 0.1, 0.1, 0.12, 0.35];
  notes.forEach((f, i) => {
    const o = actx.createOscillator(), g = actx.createGain(), t = t0 + times[i];
    o.type = i === 4 ? 'triangle' : 'square'; o.frequency.setValueAtTime(f, t);
    if (i === 4) o.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.3);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + lens[i]);
    o.connect(g).connect(actx.destination); o.start(t); o.stop(t + lens[i] + 0.02);
  });
}

// ---- Wake lock ----
async function requestWake() { try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => wakeLock = null); } } catch {} }
function releaseWake() { if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; } }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && tick) requestWake(); });

// ---- Wiring ----
document.addEventListener('pointerdown', unlockAudio, { once: true });
$('go').onclick = startRest;
$('reps').oninput = $('sets').oninput = () => { save(); updateSetInfo(); };
$('back').onclick = () => idx > 0 && goTo(idx - 1);
$('skip').onclick = () => goTo(idx + 1);
$('pause').onclick = togglePause;
$('cancel').onclick = () => { stopTimer(); releaseWake(); renderExercise(); };
$('restart').onclick = () => goTo(0);
$('total').textContent = EXERCISES.length;
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
renderExercise();
