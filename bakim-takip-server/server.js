const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// â”€â”€ Veri dosyasÄ± â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DB_FILE = path.join(__dirname, 'data.json');

function load() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return { vehicles: [], logs: [], nextVehicleId: 1, nextLogId: 1 };
  }
}

function save(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// â”€â”€ AraÃ§lar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get('/vehicles', (req, res) => {
  res.json(load().vehicles);
});

app.post('/vehicles', (req, res) => {
  const db = load();
  const vehicle = {
    id: db.nextVehicleId++,
    brand: req.body.brand,
    model: req.body.model,
    year: req.body.year || null,
    engine: req.body.engine || null,
    purchase_km: req.body.purchase_km || 0,
    current_km: req.body.current_km || 0,
    created_at: new Date().toISOString(),
  };
  db.vehicles.push(vehicle);
  save(db);
  res.json(vehicle);
});

app.put('/vehicles/:id', (req, res) => {
  const db = load();
  const idx = db.vehicles.findIndex(v => v.id == req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'AraÃ§ bulunamadÄ±' });
  db.vehicles[idx] = { ...db.vehicles[idx], ...req.body };
  save(db);
  res.json({ success: true });
});

app.delete('/vehicles/:id', (req, res) => {
  const db = load();
  db.vehicles = db.vehicles.filter(v => v.id != req.params.id);
  db.logs     = db.logs.filter(l => l.vehicle_id != req.params.id);
  save(db);
  res.json({ success: true });
});

// â”€â”€ BakÄ±m kayÄ±tlarÄ± â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get('/maintenance/:vehicleId', (req, res) => {
  const logs = load().logs
    .filter(l => l.vehicle_id == req.params.vehicleId)
    .sort((a, b) => b.km - a.km);
  res.json(logs);
});

app.post('/maintenance/:vehicleId', (req, res) => {
  const db = load();
  const { km, date, parts, notes = '', total_cost = 0 } = req.body;
  const vehicle = db.vehicles.find(v => v.id == req.params.vehicleId);
  if (vehicle && km > vehicle.current_km) vehicle.current_km = km;
  const log = {
    id: db.nextLogId++,
    vehicle_id: parseInt(req.params.vehicleId),
    km, date, parts, notes, total_cost,
    created_at: new Date().toISOString(),
  };
  db.logs.push(log);
  save(db);
  res.json({ id: log.id });
});

app.delete('/maintenance/log/:id', (req, res) => {
  const db = load();
  db.logs = db.logs.filter(l => l.id != req.params.id);
  save(db);
  res.json({ success: true });
});

// â”€â”€ SaÄŸlÄ±k kontrolÃ¼ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// â”€â”€ BaÅŸlat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('\nâœ… Sunucu Ã§alÄ±ÅŸÄ±yor â†’ http://localhost:' + PORT);
  console.log('   Veriler data.json dosyasÄ±nda saklanÄ±yor.\n');
});