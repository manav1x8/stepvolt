// ============================
// STEPVOLT - Frontend JS
// ============================

const API = 'http://localhost:3000/api';

// Chart instances
let barChart, doughnutChart, lineChart, scatterChart;

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  initCharts();
  loadData();
  setupLivePreview();
});

// ---- SCROLL HELPER ----
function scrollTo(selector) {
  document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth' });
}

// ---- LIVE PREVIEW ----
function setupLivePreview() {
  const input = document.getElementById('inp-steps');
  input.addEventListener('input', () => {
    const steps = parseInt(input.value);
    if (!steps || steps <= 0) {
      document.getElementById('preview-stats').style.display = 'none';
      document.getElementById('preview-hint').style.display = 'block';
      document.getElementById('step-visual').innerHTML = '';
      return;
    }
    const power = calcPower(steps);
    document.getElementById('preview-stats').style.display = 'grid';
    document.getElementById('preview-hint').style.display = 'none';
    document.getElementById('pv-power').textContent = power.power_mW + ' mW';
    document.getElementById('pv-voltage').textContent = power.voltage + ' V';
    document.getElementById('pv-current').textContent = power.current + ' mA';
    document.getElementById('pv-led').textContent = power.led_hours + ' hrs';

    // Step dots visual
    const visual = document.getElementById('step-visual');
    visual.innerHTML = '';
    const dots = Math.min(steps, 100);
    for (let i = 0; i < dots; i++) {
      const dot = document.createElement('div');
      dot.className = 'step-dot';
      visual.appendChild(dot);
    }
  });
}

// Local power calculation (mirrors backend)
function calcPower(steps) {
  return {
    power_mW: (steps * 0.005 * 1000).toFixed(2),
    voltage: (steps * 0.8).toFixed(2),
    current: (steps * 0.006 * 1000).toFixed(2),
    led_hours: ((steps * 0.005) / 0.06).toFixed(2)
  };
}

// ---- ADD STEPS ----
async function addSteps() {
  const steps = parseInt(document.getElementById('inp-steps').value);
  const location = document.getElementById('inp-location').value;
  const footType = document.getElementById('inp-foot').value;
  const btn = document.getElementById('btn-add');
  const resultEl = document.getElementById('form-result');

  if (!steps || steps <= 0) {
    showResult(resultEl, '⚠️ Please enter a valid number of steps.', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span>⏳ Processing...</span>';

  try {
    const res = await fetch(`${API}/steps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ steps, location, footType })
    });
    const data = await res.json();
    if (data.success) {
      const d = data.data;
      showResult(resultEl,
        `✅ Added! ${d.steps} steps → ${d.power_mW} mW | ${d.voltage} V | ${d.current} mA | LED: ${d.led_hours} hrs`,
        'success'
      );
      document.getElementById('inp-steps').value = '';
      document.getElementById('preview-stats').style.display = 'none';
      document.getElementById('step-visual').innerHTML = '';
      loadData();
    } else {
      showResult(resultEl, '❌ Error: ' + data.error, 'error');
    }
  } catch (e) {
    showResult(resultEl, '❌ Cannot connect to backend server. Make sure it\'s running on port 3000.', 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '<span>⚡ Calculate & Add</span>';
}

function showResult(el, msg, type) {
  el.style.display = 'block';
  el.textContent = msg;
  el.style.background = type === 'error' ? 'rgba(255,94,126,0.08)' : 'rgba(0,229,160,0.08)';
  el.style.borderColor = type === 'error' ? 'rgba(255,94,126,0.3)' : 'rgba(0,229,160,0.3)';
  el.style.color = type === 'error' ? 'var(--red)' : 'var(--green)';
}

// ---- LOAD DATA ----
async function loadData() {
  try {
    const [summaryRes, stepsRes] = await Promise.all([
      fetch(`${API}/summary`),
      fetch(`${API}/steps`)
    ]);
    const summary = await summaryRes.json();
    const steps = await stepsRes.json();

    if (summary.data) {
      updateCards(summary.data);
      updateHero(summary.data);
    }
    if (steps.data) {
      updateTable(steps.data);
      updateCharts(steps.data, summary.data);
    }
  } catch (e) {
    console.warn('Backend offline - using demo mode');
    loadDemoData();
  }
}

// ---- UPDATE HERO STATS ----
function updateHero(data) {
  animateValue('hs-steps', 0, data.totalSteps, '.hs-val');
  document.querySelector('#hs-power .hs-val').textContent = data.power_mW + ' mW';
  animateCount('hs-sessions', data.totalSessions, '.hs-val');
  document.querySelector('#hs-leds .hs-val').textContent = data.led_hours + ' hrs';
}

// ---- UPDATE CARDS ----
function updateCards(data) {
  document.getElementById('c-steps').textContent = data.totalSteps.toLocaleString();
  document.getElementById('c-power').textContent = data.power_mW + ' mW';
  document.getElementById('c-energy').textContent = (parseFloat(data.energy_Wh) * 1000000).toFixed(2) + ' µWh';
  document.getElementById('c-voltage').textContent = data.voltage + ' V';
  document.getElementById('c-current').textContent = data.current + ' mA';
  document.getElementById('c-led').textContent = data.led_hours + ' hrs';
}

// ---- UPDATE TABLE ----
function updateTable(records) {
  const tbody = document.getElementById('table-body');
  if (!records.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="no-data">No data yet. Log your first session above!</td></tr>';
    return;
  }
  tbody.innerHTML = records.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td class="td-steps">👣 ${r.steps.toLocaleString()}</td>
      <td><span class="td-loc">${r.location}</span></td>
      <td>${r.footType}</td>
      <td class="td-power">⚡ ${r.power_mW}</td>
      <td class="td-voltage">${r.voltage} V</td>
      <td class="td-current">${r.current} mA</td>
      <td class="td-led">💡 ${r.led_hours}</td>
      <td class="td-time">${new Date(r.timestamp).toLocaleString()}</td>
    </tr>
  `).join('');
}

// ---- CHARTS ----
function initCharts() {
  Chart.defaults.color = '#8a9bbf';
  Chart.defaults.borderColor = '#1e2d4a';
  Chart.defaults.font.family = "'Segoe UI', sans-serif";

  const ctx1 = document.getElementById('chart-bar').getContext('2d');
  barChart = new Chart(ctx1, {
    type: 'bar',
    data: { labels: [], datasets: [{
      label: 'Power (mW)',
      data: [],
      backgroundColor: 'rgba(0,229,160,0.5)',
      borderColor: '#00e5a0',
      borderWidth: 2,
      borderRadius: 6,
    }]},
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { title: { display: true, text: 'Session #', color: '#8a9bbf' }},
        y: { title: { display: true, text: 'Power (mW)', color: '#8a9bbf' }, beginAtZero: true }
      }
    }
  });

  const ctx2 = document.getElementById('chart-doughnut').getContext('2d');
  doughnutChart = new Chart(ctx2, {
    type: 'doughnut',
    data: { labels: [], datasets: [{
      data: [],
      backgroundColor: ['#00e5a0','#f5c518','#4d9fff','#ff5e7e','#b07aff','#00d4e5','#ff8c42'],
      borderWidth: 2,
      borderColor: '#161d2e',
    }]},
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { padding: 16, boxWidth: 12 } }
      },
      cutout: '60%'
    }
  });

  const ctx3 = document.getElementById('chart-line').getContext('2d');
  lineChart = new Chart(ctx3, {
    type: 'line',
    data: { labels: [], datasets: [
      {
        label: 'Power (mW)',
        data: [],
        borderColor: '#00e5a0',
        backgroundColor: 'rgba(0,229,160,0.08)',
        borderWidth: 2, pointRadius: 5, pointBackgroundColor: '#00e5a0',
        fill: true, tension: 0.4,
        yAxisID: 'y'
      },
      {
        label: 'Steps',
        data: [],
        borderColor: '#f5c518',
        backgroundColor: 'transparent',
        borderWidth: 2, pointRadius: 4, pointBackgroundColor: '#f5c518',
        fill: false, tension: 0.4,
        yAxisID: 'y1'
      }
    ]},
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { labels: { boxWidth: 12, padding: 16 }}},
      scales: {
        y: { type: 'linear', position: 'left', title: { display: true, text: 'Power (mW)', color: '#8a9bbf' }, beginAtZero: true },
        y1: { type: 'linear', position: 'right', title: { display: true, text: 'Steps', color: '#f5c518', font: { weight: 'bold' } }, grid: { drawOnChartArea: false }, beginAtZero: true }
      }
    }
  });

  const ctx4 = document.getElementById('chart-scatter').getContext('2d');
  scatterChart = new Chart(ctx4, {
    type: 'scatter',
    data: { datasets: [{
      label: 'Steps → Voltage',
      data: [],
      backgroundColor: 'rgba(255,94,126,0.6)',
      borderColor: '#ff5e7e',
      borderWidth: 1, pointRadius: 6,
    }]},
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { title: { display: true, text: 'Steps', color: '#8a9bbf' }, beginAtZero: true },
        y: { title: { display: true, text: 'Voltage (V)', color: '#8a9bbf' }, beginAtZero: true }
      }
    }
  });
}

function updateCharts(records, summary) {
  if (!records.length) return;

  // Bar chart - Steps vs Power per session
  barChart.data.labels = records.map((_, i) => `S${i + 1}`);
  barChart.data.datasets[0].data = records.map(r => parseFloat(r.power_mW));
  barChart.update();

  // Doughnut - Power by location
  if (summary?.byLocation) {
    const locs = Object.keys(summary.byLocation);
    const powers = locs.map(l => calcPower(summary.byLocation[l]).power_mW);
    doughnutChart.data.labels = locs;
    doughnutChart.data.datasets[0].data = powers;
    doughnutChart.update();
  }

  // Line - Power & Steps over sessions
  lineChart.data.labels = records.map((r, i) => `S${i + 1}`);
  lineChart.data.datasets[0].data = records.map(r => parseFloat(r.power_mW));
  lineChart.data.datasets[1].data = records.map(r => r.steps);
  lineChart.update();

  // Scatter - Steps vs Voltage
  scatterChart.data.datasets[0].data = records.map(r => ({
    x: r.steps,
    y: parseFloat(r.voltage)
  }));
  scatterChart.update();
}

// ---- CLEAR ALL ----
async function clearAll() {
  if (!confirm('Clear all session data? This cannot be undone.')) return;
  try {
    await fetch(`${API}/steps`, { method: 'DELETE' });
    loadData();
  } catch (e) {
    alert('Cannot reach backend server.');
  }
}

// ---- DEMO DATA (if backend offline) ----
function loadDemoData() {
  const demoRecords = [
    { steps: 120, location: 'Main Entrance', footType: 'Normal', power_mW: '600.00', voltage: '96.00', current: '720.00', led_hours: '10.00', timestamp: new Date().toISOString() },
    { steps: 350, location: 'Library', footType: 'Heavy', power_mW: '1750.00', voltage: '280.00', current: '2100.00', led_hours: '29.17', timestamp: new Date().toISOString() },
    { steps: 200, location: 'Cafeteria', footType: 'Normal', power_mW: '1000.00', voltage: '160.00', current: '1200.00', led_hours: '16.67', timestamp: new Date().toISOString() },
    { steps: 500, location: 'Sports Hall', footType: 'Running', power_mW: '2500.00', voltage: '400.00', current: '3000.00', led_hours: '41.67', timestamp: new Date().toISOString() },
    { steps: 180, location: 'Lab Block', footType: 'Light', power_mW: '900.00', voltage: '144.00', current: '1080.00', led_hours: '15.00', timestamp: new Date().toISOString() },
    { steps: 430, location: 'Corridor', footType: 'Normal', power_mW: '2150.00', voltage: '344.00', current: '2580.00', led_hours: '35.83', timestamp: new Date().toISOString() },
  ];
  const totalSteps = demoRecords.reduce((s, r) => s + r.steps, 0);
  const totPow = calcPower(totalSteps);
  const summaryData = {
    totalSteps, totalSessions: demoRecords.length, ...totPow,
    byLocation: { 'Main Entrance': 120, 'Library': 350, 'Cafeteria': 200, 'Sports Hall': 500, 'Lab Block': 180, 'Corridor': 430 }
  };
  updateCards(summaryData);
  updateHero(summaryData);
  updateTable(demoRecords);
  updateCharts(demoRecords, summaryData);

  const resultEl = document.getElementById('form-result');
  showResult(resultEl, '⚠️ Demo mode: Backend not connected. Start server.js to use live data.', 'error');
  resultEl.style.display = 'block';
}

// ---- COUNTER ANIMATIONS ----
function animateValue(parentId, from, to, childSelector) {
  const el = document.querySelector(`#${parentId} ${childSelector}`);
  if (!el) return;
  let start = null;
  const duration = 1200;
  const step = (ts) => {
    if (!start) start = ts;
    const progress = Math.min((ts - start) / duration, 1);
    el.textContent = Math.floor(progress * (to - from) + from).toLocaleString();
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function animateCount(parentId, to, childSelector) {
  animateValue(parentId, 0, to, childSelector);
}