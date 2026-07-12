const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  vehicles: {
    list: () => ipcRenderer.invoke('vehicles:list'),
    create: (body) => ipcRenderer.invoke('vehicles:create', body),
    update: (id, body) => ipcRenderer.invoke('vehicles:update', id, body),
    delete: (id) => ipcRenderer.invoke('vehicles:delete', id),
  },
  maintenance: {
    list: (vehicleId) => ipcRenderer.invoke('maintenance:list', vehicleId),
    create: (vehicleId, body) => ipcRenderer.invoke('maintenance:create', vehicleId, body),
    updateLog: (id, body) => ipcRenderer.invoke('maintenance:updateLog', id, body),
    deleteLog: (id) => ipcRenderer.invoke('maintenance:deleteLog', id),
  },
  expenses: {
    list: (vehicleId) => ipcRenderer.invoke('expenses:list', vehicleId),
    create: (vehicleId, body) => ipcRenderer.invoke('expenses:create', vehicleId, body),
    update: (id, body) => ipcRenderer.invoke('expenses:update', id, body),
    delete: (id) => ipcRenderer.invoke('expenses:delete', id),
  },
  backup: {
    export: () => ipcRenderer.invoke('backup:export'),
    import: () => ipcRenderer.invoke('backup:import'),
  },
});
