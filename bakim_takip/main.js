const { app, BrowserWindow, ipcMain, dialog, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

const DB_FILE = path.join(app.getPath('userData'), 'data.json');

function load() {
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    if (!db.expenses) db.expenses = [];
    if (!db.nextExpenseId) db.nextExpenseId = 1;
    return db;
  } catch {
    return { vehicles: [], logs: [], expenses: [], nextVehicleId: 1, nextLogId: 1, nextExpenseId: 1 };
  }
}

function save(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function isPlainObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
function str(x, max) { return String(x ?? '').slice(0, max); }
function photoStr(x) { return (typeof x === 'string' && x.startsWith('data:image/') && x.length <= 700000) ? x : null; }

function sanitizeVehicle(v) {
  if (!isPlainObj(v)) return null;
  return {
    id: v.id,
    brand: str(v.brand, 200),
    model: str(v.model, 200),
    year: v.year != null ? str(v.year, 20) : null,
    engine: v.engine != null ? str(v.engine, 200) : null,
    purchase_km: Number(v.purchase_km) || 0,
    current_km: Number(v.current_km) || 0,
    photo: photoStr(v.photo),
    created_at: typeof v.created_at === 'string' ? v.created_at : new Date().toISOString(),
  };
}

function sanitizePart(p) {
  if (!isPlainObj(p)) return null;
  return { key: str(p.key, 100), name: str(p.name, 200), brand: str(p.brand, 200), cost: Number(p.cost) || 0 };
}

function sanitizeLog(l) {
  if (!isPlainObj(l) || !Array.isArray(l.parts)) return null;
  return {
    id: l.id,
    vehicle_id: l.vehicle_id,
    km: Number(l.km) || 0,
    date: str(l.date, 40),
    parts: l.parts.map(sanitizePart).filter(Boolean),
    notes: str(l.notes, 2000),
    total_cost: Number(l.total_cost) || 0,
    service_name: str(l.service_name, 200),
    created_at: typeof l.created_at === 'string' ? l.created_at : new Date().toISOString(),
  };
}

function sanitizeExpense(e) {
  if (!isPlainObj(e)) return null;
  return {
    id: e.id,
    vehicle_id: e.vehicle_id,
    type: str(e.type, 40),
    date: str(e.date, 40),
    amount: Number(e.amount) || 0,
    km: e.km != null ? Number(e.km) : null,
    due_date: e.due_date != null ? str(e.due_date, 40) : null,
    notes: str(e.notes, 2000),
    created_at: typeof e.created_at === 'string' ? e.created_at : new Date().toISOString(),
  };
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1150, height: 720,
    minWidth: 900, minHeight: 600,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  return win;
}

function deriveCurrentKm(vehicle, logs) {
  const maxLogKm = logs
    .filter(l => l.vehicle_id === vehicle.id)
    .reduce((m, l) => Math.max(m, l.km), 0);
  return Math.max(vehicle.current_km, maxLogKm);
}

ipcMain.handle('vehicles:list', () => {
  const db = load();
  return db.vehicles.map(v => ({ ...v, current_km: deriveCurrentKm(v, db.logs) }));
});

ipcMain.handle('vehicles:create', (e, body) => {
  const db = load();
  const vehicle = {
    id: db.nextVehicleId++,
    brand: body.brand,
    model: body.model,
    year: body.year || null,
    engine: body.engine || null,
    purchase_km: body.purchase_km || 0,
    current_km: body.current_km || 0,
    photo: photoStr(body.photo),
    created_at: new Date().toISOString(),
  };
  db.vehicles.push(vehicle);
  save(db);
  return vehicle;
});

ipcMain.handle('vehicles:update', (e, id, body) => {
  const db = load();
  const idx = db.vehicles.findIndex(v => v.id === id);
  if (idx === -1) throw new Error('Araç bulunamadı');
  db.vehicles[idx] = { ...db.vehicles[idx], ...body };
  save(db);
  return db.vehicles[idx];
});

ipcMain.handle('vehicles:delete', (e, id) => {
  const db = load();
  db.vehicles = db.vehicles.filter(v => v.id !== id);
  db.logs = db.logs.filter(l => l.vehicle_id !== id);
  db.expenses = db.expenses.filter(x => x.vehicle_id !== id);
  save(db);
  return { success: true };
});

ipcMain.handle('maintenance:list', (e, vehicleId) => {
  const db = load();
  return db.logs
    .filter(l => l.vehicle_id === vehicleId)
    .sort((a, b) => b.km - a.km);
});

ipcMain.handle('maintenance:create', (e, vehicleId, body) => {
  const db = load();
  const { km, date, parts, notes = '', total_cost = 0, service_name = '' } = body;
  const log = {
    id: db.nextLogId++,
    vehicle_id: vehicleId,
    km, date, parts, notes, total_cost, service_name,
    created_at: new Date().toISOString(),
  };
  db.logs.push(log);
  save(db);
  return { id: log.id };
});

ipcMain.handle('maintenance:updateLog', (e, id, body) => {
  const db = load();
  const idx = db.logs.findIndex(l => l.id === id);
  if (idx === -1) throw new Error('Kayıt bulunamadı');
  const { km, date, parts, notes = '', total_cost = 0, service_name = '' } = body;
  db.logs[idx] = { ...db.logs[idx], km, date, parts, notes, total_cost, service_name };
  save(db);
  return db.logs[idx];
});

ipcMain.handle('maintenance:deleteLog', (e, id) => {
  const db = load();
  db.logs = db.logs.filter(l => l.id !== id);
  save(db);
  return { success: true };
});

ipcMain.handle('expenses:list', (e, vehicleId) => {
  const db = load();
  return db.expenses
    .filter(x => x.vehicle_id === vehicleId)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
});

ipcMain.handle('expenses:create', (e, vehicleId, body) => {
  const db = load();
  const { type, date, amount, km = null, due_date = null, notes = '' } = body;
  const expense = {
    id: db.nextExpenseId++,
    vehicle_id: vehicleId,
    type, date, amount, km, due_date, notes,
    created_at: new Date().toISOString(),
  };
  db.expenses.push(expense);
  save(db);
  return expense;
});

ipcMain.handle('expenses:update', (e, id, body) => {
  const db = load();
  const idx = db.expenses.findIndex(x => x.id === id);
  if (idx === -1) throw new Error('Masraf kaydı bulunamadı');
  const { type, date, amount, km = null, due_date = null, notes = '' } = body;
  db.expenses[idx] = { ...db.expenses[idx], type, date, amount, km, due_date, notes };
  save(db);
  return db.expenses[idx];
});

ipcMain.handle('expenses:delete', (e, id) => {
  const db = load();
  db.expenses = db.expenses.filter(x => x.id !== id);
  save(db);
  return { success: true };
});

ipcMain.handle('backup:export', async () => {
  const win = BrowserWindow.getFocusedWindow();
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Yedek Al',
    defaultPath: `bakim-takip-yedek-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (canceled || !filePath) return { success: false };
  fs.writeFileSync(filePath, fs.readFileSync(DB_FILE, 'utf8'));
  return { success: true, filePath };
});

ipcMain.handle('backup:import', async () => {
  const win = BrowserWindow.getFocusedWindow();
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Yedekten Geri Yükle',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (canceled || !filePaths.length) return { success: false };
  const data = JSON.parse(fs.readFileSync(filePaths[0], 'utf8'));
  if (!Array.isArray(data.vehicles) || !Array.isArray(data.logs)) {
    throw new Error('Geçersiz yedek dosyası');
  }
  const vehicles = data.vehicles.map(sanitizeVehicle).filter(Boolean);
  const logs = data.logs.map(sanitizeLog).filter(Boolean);
  const expenses = (data.expenses || []).map(sanitizeExpense).filter(Boolean);
  const maxId = (arr) => arr.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0);
  save({
    vehicles, logs, expenses,
    nextVehicleId: maxId(vehicles) + 1,
    nextLogId: maxId(logs) + 1,
    nextExpenseId: maxId(expenses) + 1,
  });
  return { success: true };
});

const PARTS = [
  { key: 'motor_yagi', name: 'Motor Yağı', km: 7000 }, { key: 'yag_filtresi', name: 'Yağ Filtresi', km: 7000 },
  { key: 'hava_filtresi', name: 'Hava Filtresi', km: 15000 }, { key: 'polen_filtresi', name: 'Polen Filtresi', km: 15000 },
  { key: 'yakit_filtresi', name: 'Yakıt Filtresi', km: 30000 }, { key: 'triger', name: 'Triger Kayışı', km: 60000 },
  { key: 'devirdaim', name: 'Devirdaim Pompası', km: 60000 }, { key: 'bujiler', name: 'Bujiler', km: 40000 },
  { key: 'on_balata', name: 'Ön Fren Balata', km: 40000 }, { key: 'arka_balata', name: 'Arka Fren Balata', km: 40000 },
  { key: 'fren_diski', name: 'Fren Diski', km: 60000 }, { key: 'antifriz', name: 'Antifriz', km: 40000 },
  { key: 'sanziman_yagi', name: 'Şanzıman Yağı', km: 60000 }, { key: 'direksiyon_yagi', name: 'Direksiyon Yağı', km: 40000 },
  { key: 'klima_gazi', name: 'Klima Gazı', km: 40000 },
];

function checkDueReminders() {
  if (!Notification.isSupported()) return;
  const db = load();
  const now = Date.now();
  const soonMs = 14 * 24 * 60 * 60 * 1000;
  const typeLabels = { sigorta: 'Sigorta', muayene: 'Muayene' };
  for (const exp of db.expenses) {
    if (!exp.due_date || !typeLabels[exp.type]) continue;
    const due = new Date(exp.due_date).getTime();
    if (due - now > soonMs) continue;
    const vehicle = db.vehicles.find(v => v.id === exp.vehicle_id);
    const overdue = due < now;
    new Notification({
      title: `${typeLabels[exp.type]} ${overdue ? 'süresi geçti' : 'yaklaşıyor'}`,
      body: `${vehicle ? vehicle.brand + ' ' + vehicle.model : 'Araç'} — ${exp.due_date}`,
    }).show();
  }
  for (const vehicle of db.vehicles) {
    const logs = db.logs.filter(l => l.vehicle_id === vehicle.id);
    const currentKm = deriveCurrentKm(vehicle, db.logs);
    const lastOf = {};
    for (const log of [...logs].sort((a, b) => b.km - a.km))
      for (const p of log.parts)
        if (!lastOf[p.key]) lastOf[p.key] = { km: log.km };
    for (const part of PARTS) {
      const last = lastOf[part.key];
      if (!last) continue;
      const prog = Math.min(100, Math.round(((currentKm - last.km) / part.km) * 100));
      if (prog < 90) continue;
      const overdue = prog >= 100;
      new Notification({
        title: `${part.name} ${overdue ? 'değişim zamanı geçti' : 'değişimi yaklaşıyor'}`,
        body: `${vehicle.brand} ${vehicle.model} için bakım gerekebilir.`,
      }).show();
    }
  }
}

app.whenReady().then(() => {
  createWindow();
  checkDueReminders();
  setInterval(checkDueReminders, 24 * 60 * 60 * 1000);
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
