const DB_NAME = 'bakim-takip';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('vehicles')) db.createObjectStore('vehicles', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('logs')) db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('expenses')) db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const dbPromise = openDB();

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function store(name, mode) {
  const db = await dbPromise;
  return db.transaction(name, mode).objectStore(name);
}

async function getAll(name) {
  return reqToPromise((await store(name, 'readonly')).getAll());
}

async function getOne(name, id) {
  return reqToPromise((await store(name, 'readonly')).get(id));
}

async function addRecord(name, value) {
  const id = await reqToPromise((await store(name, 'readwrite')).add(value));
  return { ...value, id };
}

async function putRecord(name, value) {
  const id = await reqToPromise((await store(name, 'readwrite')).put(value));
  return { ...value, id };
}

async function deleteRecord(name, id) {
  await reqToPromise((await store(name, 'readwrite')).delete(id));
  return { success: true };
}

async function clearStore(name) {
  return reqToPromise((await store(name, 'readwrite')).clear());
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

function deriveCurrentKm(vehicle, logs) {
  const maxLogKm = logs
    .filter(l => l.vehicle_id === vehicle.id)
    .reduce((m, l) => Math.max(m, l.km), 0);
  return Math.max(vehicle.current_km, maxLogKm);
}

window.api = {
  vehicles: {
    async list() {
      const [vehicles, logs] = await Promise.all([getAll('vehicles'), getAll('logs')]);
      return vehicles.map(v => ({ ...v, current_km: deriveCurrentKm(v, logs) }));
    },
    async create(body) {
      return addRecord('vehicles', {
        brand: body.brand,
        model: body.model,
        year: body.year || null,
        engine: body.engine || null,
        purchase_km: body.purchase_km || 0,
        current_km: body.current_km || 0,
        photo: body.photo || null,
        created_at: new Date().toISOString(),
      });
    },
    async update(id, body) {
      const existing = await getOne('vehicles', id);
      if (!existing) throw new Error('Araç bulunamadı');
      return putRecord('vehicles', { ...existing, ...body, id });
    },
    async delete(id) {
      await deleteRecord('vehicles', id);
      const [logs, expenses] = await Promise.all([getAll('logs'), getAll('expenses')]);
      const logStore = await store('logs', 'readwrite');
      for (const l of logs.filter(x => x.vehicle_id === id)) logStore.delete(l.id);
      const expStore = await store('expenses', 'readwrite');
      for (const e of expenses.filter(x => x.vehicle_id === id)) expStore.delete(e.id);
      return { success: true };
    },
  },
  maintenance: {
    async list(vehicleId) {
      const logs = await getAll('logs');
      return logs.filter(l => l.vehicle_id === vehicleId).sort((a, b) => b.km - a.km);
    },
    async create(vehicleId, body) {
      const { km, date, parts, notes = '', total_cost = 0 } = body;
      const log = await addRecord('logs', { vehicle_id: vehicleId, km, date, parts, notes, total_cost, created_at: new Date().toISOString() });
      return { id: log.id };
    },
    async updateLog(id, body) {
      const existing = await getOne('logs', id);
      if (!existing) throw new Error('Kayıt bulunamadı');
      const { km, date, parts, notes = '', total_cost = 0 } = body;
      return putRecord('logs', { ...existing, km, date, parts, notes, total_cost, id });
    },
    async deleteLog(id) {
      return deleteRecord('logs', id);
    },
  },
  expenses: {
    async list(vehicleId) {
      const expenses = await getAll('expenses');
      return expenses.filter(x => x.vehicle_id === vehicleId).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    },
    async create(vehicleId, body) {
      const { type, date, amount, km = null, due_date = null, notes = '' } = body;
      return addRecord('expenses', { vehicle_id: vehicleId, type, date, amount, km, due_date, notes, created_at: new Date().toISOString() });
    },
    async update(id, body) {
      const existing = await getOne('expenses', id);
      if (!existing) throw new Error('Masraf kaydı bulunamadı');
      const { type, date, amount, km = null, due_date = null, notes = '' } = body;
      return putRecord('expenses', { ...existing, type, date, amount, km, due_date, notes, id });
    },
    async delete(id) {
      return deleteRecord('expenses', id);
    },
  },
  backup: {
    async export() {
      const [vehicles, logs, expenses] = await Promise.all([getAll('vehicles'), getAll('logs'), getAll('expenses')]);
      const data = { vehicles, logs, expenses };
      const filename = `bakim-takip-yedek-${new Date().toISOString().slice(0, 10)}.json`;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return { success: true, filePath: filename };
    },
    async import() {
      return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = async () => {
          try {
            const file = input.files[0];
            if (!file) { resolve({ success: false }); return; }
            const data = JSON.parse(await file.text());
            if (!Array.isArray(data.vehicles) || !Array.isArray(data.logs)) throw new Error('Geçersiz yedek dosyası');
            const vehicles = data.vehicles.map(sanitizeVehicle).filter(Boolean);
            const logs = data.logs.map(sanitizeLog).filter(Boolean);
            const expenses = (data.expenses || []).map(sanitizeExpense).filter(Boolean);
            await Promise.all([clearStore('vehicles'), clearStore('logs'), clearStore('expenses')]);
            const vStore = await store('vehicles', 'readwrite');
            vehicles.forEach(v => vStore.put(v));
            const lStore = await store('logs', 'readwrite');
            logs.forEach(l => lStore.put(l));
            const eStore = await store('expenses', 'readwrite');
            expenses.forEach(e => eStore.put(e));
            resolve({ success: true });
          } catch (e) { reject(e); }
        };
        input.click();
      });
    },
  },
};
