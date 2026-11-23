/**
 * nube.js
 * Guarda el jardín en Firebase para que sea el mismo en todos los dispositivos.
 *
 * - Cada clave es una cuenta de Firebase con un correo escondido que nadie escribe:
 *   la de ella riega y hace brotar flores; la de Santiago además las crea y las quita.
 * - Las flores viven en la colección "flores". Fotos y canciones viajan partidas en
 *   pedazos dentro de "archivos" (cada documento de Firestore aguanta 1 MB como máximo)
 *   y, una vez bajadas, se quedan guardadas en el teléfono.
 * - El celular conserva su copia: si no hay señal se ve lo último que llegó, y lo que
 *   se riegue sin señal se sube después. Gana el cambio más reciente (editadoEn).
 */

const CLOUD_DOMAIN = '@pueblito-magico-245f6.firebaseapp.com';
const CLOUD_ACCOUNTS = { ella: 'ella' + CLOUD_DOMAIN, santiago: 'santiago' + CLOUD_DOMAIN };
const CLOUD_SYNCED_KEY = 'jardin_magico_nube_ids';
const CLOUD_CHUNK = 700000;
const CLOUD_MEDIA_FIELDS = ['realPhoto', 'couplePhoto', 'music'];
// Lo único que la cuenta de ella puede cambiar de una flor que ya está en la nube.
const CLOUD_CARE_FIELDS = ['waterLevel', 'lastWatered', 'porSembrar', 'plantedAt', 'editadoEn'];

const Cloud = {
  available: false,
  user: null,
  role: null,
  _auth: null,
  _db: null,
  _remote: new Map(),
  _unsubscribe: null,
  _onChange: null,
  _chain: Promise.resolve(),
  // Lo que ya se subió (id → editadoEn), para no repetirlo mientras la nube lo confirma.
  _sent: new Map(),

  init() {
    if (this.available) return true;
    if (!window.firebase || typeof FIREBASE_CONFIG === 'undefined') return false;
    try {
      firebase.initializeApp(FIREBASE_CONFIG);
      this._auth = firebase.auth();
      this._db = firebase.firestore();
      this.available = true;
    } catch (e) {
      console.error('No pude iniciar Firebase', e);
    }
    return this.available;
  },

  // ================= CLAVES =================
  // Resuelve con la cuenta que ya entró en este dispositivo, o null.
  currentUser() {
    return new Promise((resolve) => {
      const stop = this._auth.onAuthStateChanged((user) => {
        stop();
        this._setUser(user);
        resolve(user);
      });
    });
  },

  _setUser(user) {
    this.user = user || null;
    this.role = !user ? null : user.email === CLOUD_ACCOUNTS.santiago ? 'santiago' : 'ella';
  },

  isAdmin() {
    return this.role === 'santiago';
  },

  // Prueba la clave con las dos cuentas: quien la escribe nunca ve un correo.
  async signIn(key) {
    let lastError = null;
    for (const email of [CLOUD_ACCOUNTS.ella, CLOUD_ACCOUNTS.santiago]) {
      try {
        const { user } = await this._auth.signInWithEmailAndPassword(email, key);
        this._setUser(user);
        return user;
      } catch (e) {
        lastError = e;
        if (!/invalid-credential|invalid-login|wrong-password|user-not-found|invalid-email/.test(e.code || '')) throw e;
      }
    }
    throw lastError;
  },

  // Deja el dispositivo como recién estrenado, para que lo que quede aquí no resucite flores borradas.
  async signOut() {
    this.stop();
    await this._auth.signOut();
    this._setUser(null);
    try {
      localStorage.removeItem(CLOUD_SYNCED_KEY);
      localStorage.setItem(STORAGE_KEY, '[]');
    } catch (e) {}
  },

  // ================= SINCRONIZACIÓN =================
  // Resuelve cuando llega el jardín de la nube (o a los 6 s, si no hay señal).
  start(onChange) {
    this._onChange = onChange;
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, 6000);
      this._unsubscribe = this._db.collection('flores').onSnapshot((snapshot) => {
        this._remote = new Map(snapshot.docs
          .map((doc) => normalizeFlower({ ...doc.data(), id: doc.id }))
          .filter(Boolean)
          .map((flower) => [flower.id, flower]));
        this.sync().finally(() => {
          clearTimeout(timer);
          resolve();
        });
      }, (error) => {
        console.error('No pude escuchar el jardín en la nube', error);
        clearTimeout(timer);
        resolve();
      });
    });
  },

  stop() {
    if (this._unsubscribe) this._unsubscribe();
    this._unsubscribe = null;
    this._remote = new Map();
  },

  // Las sincronizaciones van en fila para no subir dos veces la misma foto.
  sync() {
    this._chain = this._chain
      .then(() => this._syncOnce())
      .catch((e) => console.error('No pude sincronizar el jardín', e));
    return this._chain;
  },

  _syncedIds() {
    try {
      const raw = localStorage.getItem(CLOUD_SYNCED_KEY);
      return { first: raw === null, ids: new Set(raw ? JSON.parse(raw) : []) };
    } catch (e) {
      return { first: false, ids: new Set() };
    }
  },

  async _syncOnce() {
    if (!this.user || !this._unsubscribe) return;
    const { first, ids: synced } = this._syncedIds();
    const local = FlowerStore.getAll();
    const localIds = new Set(local.map((flower) => flower.id));
    const result = [];
    const uploads = [];
    let changed = false;

    for (const mine of local) {
      const remote = this._remote.get(mine.id);
      const alreadySent = (this._sent.get(mine.id) || -1) >= mine.editadoEn;
      if (alreadySent && (!remote || remote.editadoEn < mine.editadoEn)) {
        result.push(mine);
        continue;
      }
      if (remote) {
        if (mine.editadoEn > remote.editadoEn) {
          result.push(mine);
          uploads.push(mine);
        } else {
          result.push(remote);
          if (JSON.stringify(mine) !== JSON.stringify(remote)) changed = true;
        }
        continue;
      }
      // Ya estuvo en la nube y no está: la quitaron desde otro dispositivo.
      // En el computador de Santiago, lo de antes de la nube son pruebas: manda la nube.
      const goneOrTest = synced.has(mine.id) || (first && this.isAdmin());
      const staleWelcome = mine.id === INITIAL_DEMO_FLOWER.id && this._remote.size > 0;
      if (goneOrTest || staleWelcome) {
        changed = true;
        CLOUD_MEDIA_FIELDS.forEach((field) => Media.remove(mine[field]).catch(() => {}));
        continue;
      }
      result.push(mine);
      uploads.push(mine);
    }

    for (const [id, remote] of this._remote) {
      synced.add(id);
      if (!localIds.has(id)) {
        result.push(remote);
        changed = true;
      }
    }

    try { localStorage.setItem(CLOUD_SYNCED_KEY, JSON.stringify([...synced])); } catch (e) {}
    if (changed) {
      FlowerStore.saveAll(result);
      if (this._onChange) this._onChange();
    }

    for (const flower of uploads) {
      try {
        await this._upload(flower);
        this._sent.set(flower.id, flower.editadoEn);
      } catch (e) {
        console.error(`No pude subir la flor ${flower.id}`, e);
      }
    }
  },

  async _upload(flower) {
    const remote = this._remote.get(flower.id);
    const ref = this._db.collection('flores').doc(flower.id);
    if (remote && !this.isAdmin()) {
      const care = {};
      CLOUD_CARE_FIELDS.forEach((field) => { care[field] = flower[field] ?? null; });
      await ref.update(care);
      return;
    }
    const ready = await this._uploadMedia(flower);
    const { id, ...data } = ready;
    await ref.set(data);
  },

  // Sube las fotos y canciones que aún viven solo en este teléfono y cambia sus referencias.
  async _uploadMedia(flower) {
    const ready = { ...flower };
    const swaps = {};
    for (const field of CLOUD_MEDIA_FIELDS) {
      const value = ready[field];
      const heavy = value.startsWith('idb:') || (value.startsWith('data:') && value.length > 2000);
      if (!heavy) continue;
      ready[field] = await this._uploadFile(value);
      swaps[field] = ready[field];
    }
    if (Object.keys(swaps).length) FlowerStore.replaceMedia(flower.id, swaps);
    return ready;
  },

  // ================= ARCHIVOS =================
  async _uploadFile(value) {
    const dataURL = value.startsWith('idb:') ? await Media.dataURL(value) : value;
    if (!dataURL) return '';
    const key = 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const parts = Math.ceil(dataURL.length / CLOUD_CHUNK);
    const files = this._db.collection('archivos');
    // El primer pedazo va de último: si existe, el archivo está completo.
    for (let i = parts - 1; i >= 0; i -= 1) {
      await files.doc(`${key}_${i}`).set({ parts, d: dataURL.slice(i * CLOUD_CHUNK, (i + 1) * CLOUD_CHUNK) });
    }
    const ref = 'nube:' + key;
    await Media.cache(ref, dataURLToBlob(dataURL)).catch(() => {});
    if (value.startsWith('idb:')) Media.remove(value).catch(() => {});
    return ref;
  },

  async fetchFile(ref) {
    if (!this.user || !ref.startsWith('nube:')) return null;
    const key = ref.slice(5);
    const files = this._db.collection('archivos');
    const head = await files.doc(`${key}_0`).get();
    if (!head.exists) return null;
    const { parts, d } = head.data();
    const rest = await Promise.all(Array.from({ length: parts - 1 }, (_, i) => files.doc(`${key}_${i + 1}`).get()));
    return dataURLToBlob(d + rest.map((doc) => doc.data().d).join(''));
  },

  async _removeFile(ref) {
    if (!ref || !ref.startsWith('nube:')) return;
    const key = ref.slice(5);
    const files = this._db.collection('archivos');
    const head = await files.doc(`${key}_0`).get();
    const parts = head.exists ? head.data().parts : 1;
    await Promise.all(Array.from({ length: parts }, (_, i) => files.doc(`${key}_${i}`).delete()));
  },

  // ================= ACCIONES DEL PANEL =================
  async removeFlower(flower) {
    if (!this.isAdmin()) return;
    await this._db.collection('flores').doc(flower.id).delete();
    await Promise.all(CLOUD_MEDIA_FIELDS.map((field) => this._removeFile(flower[field]).catch(() => {})));
  },

  // Espera a que la flor quede subida y lo comprueba en la nube.
  async ensureUploaded(id) {
    await this.sync();
    const doc = await this._db.collection('flores').doc(id).get();
    return doc.exists;
  },

  // ================= CANCIONES DEL JARDÍN =================
  watchSongs(onSongs) {
    if (!this.user) return () => {};
    return this._db.collection('canciones').onSnapshot((snapshot) => {
      const songs = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: String(data.title || 'Canción').slice(0, 80),
            artist: String(data.artist || '').slice(0, 80),
            cover: safePhoto(data.cover),
            ref: safeMusic(data.ref),
            addedAt: data.addedAt || 0
          };
        })
        .filter((song) => song.ref)
        .sort((a, b) => a.addedAt - b.addedAt);
      onSongs(songs);
    }, (error) => console.error('No pude escuchar las canciones', error));
  },

  // value: un data:audio/… del archivo elegido o un enlace https a un .mp3; cover: la portada (data:image/… o '')
  async addSong({ title, artist = '', cover = '', value }) {
    if (!this.isAdmin()) throw new Error('solo Santiago');
    const ref = /^https?:\/\//i.test(value) ? value : await this._uploadFile(value);
    if (!safeMusic(ref)) throw new Error('canción no válida');
    const coverRef = cover ? await this._uploadFile(cover) : '';
    await this._db.collection('canciones').add({ title: title.slice(0, 80), artist: artist.slice(0, 80), cover: coverRef, ref, addedAt: Date.now() });
  },

  async removeSong(song) {
    if (!this.isAdmin()) return;
    await this._db.collection('canciones').doc(song.id).delete();
    await this._removeFile(song.ref).catch(() => {});
    if (song.cover) await this._removeFile(song.cover).catch(() => {});
    Media.remove(song.ref).catch(() => {});
  },

  async getFlower(id) {
    if (!this.user) return null;
    const doc = await this._db.collection('flores').doc(id).get();
    return doc.exists ? normalizeFlower({ ...doc.data(), id: doc.id }) : null;
  }
};
