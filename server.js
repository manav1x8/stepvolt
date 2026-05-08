const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('../frontend'));

// In-memory data store
let stepData = [];
let sessionId = 1;

// Power generation constants (based on piezoelectric footstep research)
const POWER_PER_STEP_WATT_SECONDS = 0.005; // ~5 mW per step average
const VOLTAGE_PER_STEP = 0.8;              // ~0.8V per step
const CURRENT_PER_STEP = 0.006;            // ~6mA per step

function calculatePower(steps) {
  const energy_joules = steps * POWER_PER_STEP_WATT_SECONDS;
  const voltage = (steps * VOLTAGE_PER_STEP).toFixed(2);
  const current = (steps * CURRENT_PER_STEP * 1000).toFixed(2); // in mA
  const power_mW = (steps * POWER_PER_STEP_WATT_SECONDS * 1000).toFixed(2);
  const energy_Wh = (energy_joules / 3600).toFixed(6);
  const led_hours = (energy_joules / 0.06).toFixed(2); // LED uses ~60mW
  return { energy_joules, voltage, current, power_mW, energy_Wh, led_hours };
}

// POST: Add step data
app.post('/api/steps', (req, res) => {
  const { steps, location, footType } = req.body;
  if (!steps || isNaN(steps) || steps <= 0) {
    return res.status(400).json({ error: 'Invalid steps value' });
  }
  const power = calculatePower(Number(steps));
  const entry = {
    id: sessionId++,
    steps: Number(steps),
    location: location || 'Main Entrance',
    footType: footType || 'Normal',
    timestamp: new Date().toISOString(),
    ...power
  };
  stepData.push(entry);
  res.json({ success: true, data: entry });
});

// GET: All step records
app.get('/api/steps', (req, res) => {
  res.json({ success: true, data: stepData });
});

// GET: Summary / stats
app.get('/api/summary', (req, res) => {
  if (stepData.length === 0) {
    return res.json({ success: true, data: null });
  }
  const totalSteps = stepData.reduce((sum, d) => sum + d.steps, 0);
  const power = calculatePower(totalSteps);
  const byLocation = {};
  stepData.forEach(d => {
    if (!byLocation[d.location]) byLocation[d.location] = 0;
    byLocation[d.location] += d.steps;
  });
  res.json({
    success: true,
    data: {
      totalSessions: stepData.length,
      totalSteps,
      ...power,
      byLocation,
      records: stepData
    }
  });
});

// DELETE: Clear all data
app.delete('/api/steps', (req, res) => {
  stepData = [];
  sessionId = 1;
  res.json({ success: true, message: 'All data cleared' });
});

// Seed sample data
const sampleLocations = ['Main Entrance', 'Library', 'Cafeteria', 'Sports Hall', 'Lab Block'];
for (let i = 0; i < 8; i++) {
  const steps = Math.floor(Math.random() * 500) + 50;
  const power = calculatePower(steps);
  stepData.push({
    id: sessionId++,
    steps,
    location: sampleLocations[i % sampleLocations.length],
    footType: i % 2 === 0 ? 'Heavy' : 'Normal',
    timestamp: new Date(Date.now() - (8 - i) * 3600000).toISOString(),
    ...power
  });
}

app.listen(PORT, () => {
  console.log(`✅ Footstep Power Server running at http://localhost:${PORT}`);
});