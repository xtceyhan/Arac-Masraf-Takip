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
  const { km, date, parts, notes = '', total_cost = 0 } = body;
  const log = {
    id: db.nextLogId++,
    vehicle_id: vehicleId,
    km, date, parts, notes, total_cost,
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
  const { km, date, parts, notes = '', total_cost = 0 } = body;
  db.logs[idx] = { ...db.logs[idx], km, date, parts, notes, total_cost };
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
  save(data);
  return { success: true };
});

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
}

app.whenReady().then(() => {
  createWindow();
  checkDueReminders();
  setInterval(checkDueReminders, 24 * 60 * 60 * 1000);
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
