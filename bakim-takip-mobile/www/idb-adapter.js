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
            await Promise.all([clearStore('vehicles'), clearStore('logs'), clearStore('expenses')]);
            const vStore = await store('vehicles', 'readwrite');
            data.vehicles.forEach(v => vStore.put(v));
            const lStore = await store('logs', 'readwrite');
            data.logs.forEach(l => lStore.put(l));
            const eStore = await store('expenses', 'readwrite');
            (data.expenses || []).forEach(e => eStore.put(e));
            resolve({ success: true });
          } catch (e) { reject(e); }
        };
        input.click();
      });
    },
  },
};
