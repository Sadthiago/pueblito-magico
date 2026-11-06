/**
 * flowers-data.js
 * Capa de datos: flores en localStorage, fotos y melodías en IndexedDB,
 * protocolo del código QR y copias de seguridad.
 */

const STORAGE_KEY = 'jardin_magico_flores_v1';
const FLOWER_TYPES = ['astromelia', 'sunflower', 'rose', 'tulip', 'daisy', 'wildflower'];
const MELODY_NAMES = {
  casita: 'Piano de la casita',
  cajita: 'Cajita de música',
  atardecer: 'Piano del atardecer'
};

// La flor nunca se marchita: pierde brillo muy despacio y se queda en este mínimo.
const WATER_DECAY_PER_DAY = 5;
const WATER_FLOOR = 55;

// Por encima de este largo un QR impreso en una tarjetita ya cuesta escanearlo.
const QR_DIRECT_LIMIT = 900;

// Mensajitos del buzón. Santiago: edita estos textos con tus propias palabras.
const QUICK_LETTERS = [
  { label: 'Abre cuando tengas un día difícil', text: 'Recuerda: tu sonrisa es mi cosa favorita en el mundo entero.' },
  { label: 'Por qué te regalo flores amarillas', text: 'Promesa: por cada flor física que te dé, este jardín seguirá creciendo sin fin.' },
  { label: 'Abre si me extrañas', text: 'Eres magia pura. Gracias por existir.' }
];

const INITIAL_DEMO_FLOWER = {
  id: 'flor_bienvenida_01',
  type: 'astromelia',
  color: '#facc15',
  title: 'Las Primeras Flores de Nuestro Jardín',
  date: '2026-09-21',
  letter: 'Mi niña hermosa,\n\nTe regalo este rinconcito mágico. Las flores en un florero duran solo unos días, pero en este jardín que construí pensando en ti, cada pétalo, cada color y cada recuerdo van a permanecer vivos para siempre.\n\nCada vez que te regale flores físicas, vendrá un código QR. Al escanearlo, tu flor nacerá aquí con su propia carta y fotos de nosotros.\n\nTe quiero con todo mi corazón.',
  meaning: 'La astromelia representa la amistad, la devoción y un amor que dura.',
  signature: 'Siempre tuyo',
  realPhoto: '',
  couplePhoto: '',
  music: '',
  waterLevel: 100,
  plantedAt: Date.parse('2026-09-21T12:00:00')
};

function todayISO() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function newFlowerId() {
  return 'flor_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

function dataURLToBlob(dataURL) {
  const [head, body] = dataURL.split(',');
  const mime = (head.match(/^data:([^;,]+)/) || [])[1] || 'application/octet-stream';
  if (!/;base64/i.test(head)) return new Blob([decodeURIComponent(body)], { type: mime });
  const bytes = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// ================= FOTOS Y MELODÍAS =================
// localStorage solo aguanta unos 5 MB: con fotos se llenaría a las pocas flores.
const Media = {
  _db: null,
  _urls: new Map(),

  _open() {
    if (!this._db) {
      this._db = new Promise((resolve, reject) => {
        const request = indexedDB.open('jardin_magico_media', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('media');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return this._db;
  },

  async _tx(mode, run) {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('media', mode);
      const request = run(tx.objectStore('media'));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  },

  async put(blob) {
    const key = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    await this._tx('readwrite', (store) => store.put(blob, key));
    return 'idb:' + key;
  },

  async remove(ref) {
    if (!ref || !ref.startsWith('idb:')) return;
    await this._tx('readwrite', (store) => store.delete(ref.slice(4)));
    if (this._urls.has(ref)) URL.revokeObjectURL(this._urls.get(ref));
    this._urls.delete(ref);
  },

  // Dirección utilizable en <img> o <audio>. Vacía si el archivo ya no existe.
  async url(ref) {
    if (!ref || !ref.startsWith('idb:')) return ref || '';
    if (this._urls.has(ref)) return this._urls.get(ref);
    const blob = await this._tx('readonly', (store) => store.get(ref.slice(4)));
    if (!blob) return '';
    const url = URL.createObjectURL(blob);
    this._urls.set(ref, url);
    return url;
  },

  async dataURL(ref) {
    if (!ref || !ref.startsWith('idb:')) return ref || '';
    const blob = await this._tx('readonly', (store) => store.get(ref.slice(4)));
    return blob ? blobToDataURL(blob) : '';
  }
};

// ================= VALIDACIÓN =================
// Todo lo que llega por QR o por archivo pasa por aquí antes de tocar la página.
function safePhoto(value) {
  if (typeof value !== 'string') return '';
  return /^(https?:\/\/|idb:[a-z0-9]+$|data:image\/(png|jpe?g|webp|gif|svg\+xml)[;,])/i.test(value) ? value : '';
}

function safeMusic(value) {
  if (typeof value !== 'string') return '';
  if (MELODY_NAMES[value]) return value;
  return /^(https?:\/\/|idb:[a-z0-9]+$|data:audio\/[a-z0-9.+-]+[;,])/i.test(value) ? value : '';
}

function normalizeFlower(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const text = (value, max, fallback = '') => (typeof value === 'string' && value.trim() ? value.slice(0, max) : fallback);
  const number = (value) => (Number.isFinite(value) ? value : null);
  return {
    id: typeof raw.id === 'string' && /^[\w-]{1,64}$/.test(raw.id) ? raw.id : newFlowerId(),
    type: FLOWER_TYPES.includes(raw.type) ? raw.type : 'sunflower',
    color: /^#[0-9a-f]{6}$/i.test(raw.color) ? raw.color : '#facc15',
    title: text(raw.title, 140, 'Una flor para ti'),
    date: /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : todayISO(),
    letter: text(raw.letter, 8000, 'Flores con todo mi amor.'),
    meaning: text(raw.meaning, 600, 'Una flor que representa el cariño más puro que te tengo.'),
    signature: text(raw.signature, 60, 'Siempre tuyo'),
    realPhoto: safePhoto(raw.realPhoto),
    couplePhoto: safePhoto(raw.couplePhoto),
    music: safeMusic(raw.music),
    waterLevel: Math.min(100, Math.max(0, number(raw.waterLevel) ?? 100)),
    plantedAt: number(raw.plantedAt) ?? Date.now(),
    lastWatered: number(raw.lastWatered)
  };
}

function encodeBase64Url(text) {
  const binary = Array.from(new TextEncoder().encode(text), (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeBase64Url(code) {
  // URLSearchParams convierte los "+" sin escapar en espacios: los QR antiguos los traían.
  const base64 = code.replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/');
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

const FlowerStore = {
  getAll() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        this.saveAll([INITIAL_DEMO_FLOWER]);
        return [normalizeFlower(INITIAL_DEMO_FLOWER)];
      }
      return JSON.parse(data).map(normalizeFlower).filter(Boolean);
    } catch (e) {
      console.error('Error al leer de localStorage', e);
      return [normalizeFlower(INITIAL_DEMO_FLOWER)];
    }
  },

  saveAll(flowers) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(flowers));
      return true;
    } catch (e) {
      console.error('Error al guardar en localStorage', e);
      return false;
    }
  },

  get(id) {
    return this.getAll().find((flower) => flower.id === id) || null;
  },

  // Saca las fotos y melodías pesadas del objeto y las guarda en IndexedDB.
  async _ingest(flower) {
    for (const field of ['realPhoto', 'couplePhoto', 'music']) {
      const value = flower[field];
      if (typeof value === 'string' && value.startsWith('data:') && value.length > 2000) {
        try {
          flower[field] = await Media.put(dataURLToBlob(value));
        } catch (e) {
          console.error('IndexedDB no disponible, la foto queda dentro de la flor', e);
        }
      }
    }
    return flower;
  },

  // Devuelve la flor guardada, o null si no hubo espacio para guardarla.
  async add(rawFlower) {
    const flower = await this._ingest(normalizeFlower(rawFlower));
    const list = this.getAll();
    const index = list.findIndex((item) => item.id === flower.id);
    if (index >= 0) {
      const { waterLevel, plantedAt, lastWatered } = list[index];
      list[index] = { ...flower, waterLevel, plantedAt, lastWatered };
    } else {
      list.push({ ...flower, waterLevel: 100, plantedAt: Date.now() });
    }
    return this.saveAll(list) ? list[index >= 0 ? index : list.length - 1] : null;
  },

  async remove(id) {
    const list = this.getAll();
    const flower = list.find((item) => item.id === id);
    if (!flower) return;
    this.saveAll(list.filter((item) => item.id !== id));
    await Promise.all([flower.realPhoto, flower.couplePhoto, flower.music].map((ref) => Media.remove(ref).catch(() => {})));
  },

  water(id) {
    const list = this.getAll();
    const flower = list.find((item) => item.id === id);
    if (flower) {
      flower.waterLevel = 100;
      flower.lastWatered = Date.now();
      this.saveAll(list);
    }
    return flower;
  },

  waterAll() {
    const list = this.getAll();
    list.forEach((flower) => {
      flower.waterLevel = 100;
      flower.lastWatered = Date.now();
    });
    this.saveAll(list);
    return list;
  },

  // Nivel de hoy, descontando los días que lleva sin regar.
  levelOf(flower) {
    const since = flower.lastWatered || flower.plantedAt || Date.now();
    const days = Math.max(0, (Date.now() - since) / 86400000);
    return Math.max(WATER_FLOOR, Math.round((flower.waterLevel ?? 100) - days * WATER_DECAY_PER_DAY));
  },

  // ================= PROTOCOLO QR =================
  encodeFlowerToURL(flower, baseUrl = window.location.origin + window.location.pathname) {
    const payload = {
      id: flower.id,
      t: flower.type,
      c: flower.color,
      tt: flower.title,
      d: flower.date,
      l: flower.letter,
      m: flower.meaning || undefined,
      s: flower.signature || undefined,
      rp: flower.realPhoto || undefined,
      cp: flower.couplePhoto || undefined,
      mu: flower.music || undefined
    };
    return `${baseUrl}?flor=${encodeBase64Url(JSON.stringify(payload))}`;
  },

  decodeFlowerFromURL() {
    const code = new URLSearchParams(window.location.search).get('flor');
    if (!code) return null;
    try {
      const data = JSON.parse(decodeBase64Url(code));
      return normalizeFlower({
        id: data.id,
        type: data.t,
        color: data.c,
        title: data.tt,
        date: data.d,
        letter: data.l,
        meaning: data.m,
        signature: data.s,
        realPhoto: data.rp,
        couplePhoto: data.cp,
        music: data.mu
      });
    } catch (e) {
      console.error('Error al decodificar el QR:', e);
      return null;
    }
  },

  // Flores con fotos: el QR solo lleva ?f=<id> y la flor vive en flores/<id>.json.
  packagedFlowerURL(flower, baseUrl = window.location.origin + window.location.pathname) {
    return `${baseUrl}?f=${encodeURIComponent(flower.id)}`;
  },

  async fetchPackagedFlower(id, baseUrl = '') {
    if (!/^[\w-]{1,64}$/.test(id)) return null;
    const response = await fetch(`${baseUrl}flores/${id}.json`, { cache: 'no-cache' });
    if (!response.ok) return null;
    const data = await response.json();
    return normalizeFlower(data.flower || data);
  },

  // ================= COPIAS DE SEGURIDAD =================
  async _inline(flower) {
    const copy = { ...flower };
    for (const field of ['realPhoto', 'couplePhoto', 'music']) {
      copy[field] = await Media.dataURL(copy[field]).catch(() => '');
    }
    return copy;
  },

  async packageFlower(flower) {
    return { app: 'jardin-magico', version: 1, flower: await this._inline(flower) };
  },

  async exportBackup() {
    const flowers = await Promise.all(this.getAll().map((flower) => this._inline(flower)));
    return { app: 'jardin-magico', version: 1, exportedAt: new Date().toISOString(), flowers };
  },

  // Devuelve cuántas flores se recuperaron. Las que ya existen conservan su riego.
  async importBackup(data) {
    if (!data || data.app !== 'jardin-magico' || !Array.isArray(data.flowers)) {
      throw new Error('formato');
    }
    let restored = 0;
    for (const raw of data.flowers) {
      const flower = normalizeFlower(raw);
      if (!flower) continue;
      const saved = await this.add(flower);
      if (!saved) throw new Error('espacio');
      const list = this.getAll();
      const target = list.find((item) => item.id === flower.id);
      if (target && flower.plantedAt < target.plantedAt) {
        target.plantedAt = flower.plantedAt;
        this.saveAll(list);
      }
      restored += 1;
    }
    return restored;
  },

  // Pasa a IndexedDB las fotos de versiones anteriores, que vivían en localStorage.
  async migrate() {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    const list = this.getAll();
    let changed = false;
    for (const flower of list) {
      if (flower.id === INITIAL_DEMO_FLOWER.id && /^(data:image\/svg|https:\/\/[^/]*unsplash)/.test(flower.realPhoto)) {
        flower.realPhoto = '';
        flower.couplePhoto = '';
        changed = true;
      }
      const before = flower.realPhoto + flower.couplePhoto + flower.music;
      await this._ingest(flower);
      if (before !== flower.realPhoto + flower.couplePhoto + flower.music) changed = true;
    }
    if (changed) this.saveAll(list);
  }
};
