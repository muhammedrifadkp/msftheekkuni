// Firebase Integration with Firestore Realtime Listeners and LocalStorage Fallback

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  onSnapshot,
  query, 
  orderBy, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';

const STORAGE_KEY = 'msf_theekkuni_registrations_v1';
const FIREBASE_CONFIG_STORAGE_KEY = 'msf_theekkuni_firebase_config';

let app = null;
let db = null;
let isFirebaseActive = false;

// Default config from .env environment variables
const envFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

export function getStoredFirebaseConfig() {
  try {
    const raw = localStorage.getItem(FIREBASE_CONFIG_STORAGE_KEY);
    return raw ? JSON.parse(raw) : envFirebaseConfig;
  } catch (e) {
    return envFirebaseConfig;
  }
}

export function saveFirebaseConfig(configObj) {
  try {
    localStorage.setItem(FIREBASE_CONFIG_STORAGE_KEY, JSON.stringify(configObj));
    return initFirebase(configObj);
  } catch (e) {
    console.error('Failed to save Firebase config:', e);
    return false;
  }
}

export function initFirebase(config) {
  if (!config || !config.apiKey || !config.projectId) {
    isFirebaseActive = false;
    return false;
  }
  try {
    app = initializeApp(config);
    db = getFirestore(app);
    isFirebaseActive = true;
    console.log('Firebase Firestore connected with Realtime WebSockets!');
    return true;
  } catch (err) {
    console.error('Firebase init error:', err);
    isFirebaseActive = false;
    return false;
  }
}

// Auto init on startup with .env or stored config
const activeConfig = getStoredFirebaseConfig();
if (activeConfig && activeConfig.apiKey) {
  initFirebase(activeConfig);
}

// Timeout helper so calls NEVER hang indefinitely if Firestore rules block or network delays
function withTimeout(promise, ms = 3500) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Operation timed out after ${ms}ms`));
    }, ms);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Helper to save registration
export async function saveRegistration(registrationData) {
  const regId = 'TK-NKY-' + Math.floor(1000 + Math.random() * 9000);
  const now = new Date();
  
  const record = {
    ...registrationData,
    regId,
    timestamp: now.toISOString(),
    formattedDate: now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  };

  if (isFirebaseActive && db) {
    try {
      const docRefPromise = addDoc(collection(db, 'registrations'), {
        ...record,
        createdServerTime: serverTimestamp()
      });
      
      // Wait max 3.5 seconds for Firebase, otherwise fallback to local
      const docRef = await withTimeout(docRefPromise, 3500);
      record.id = docRef.id;
      saveToLocalStorage(record);
      return record;
    } catch (err) {
      console.warn('Firebase save timed out or failed, saving to LocalStorage fallback:', err);
    }
  }

  // LocalStorage Fallback (Ensures form NEVER hangs!)
  record.id = 'local_' + Date.now();
  saveToLocalStorage(record);
  return record;
}

function saveToLocalStorage(record) {
  const existing = getLocalRegistrations();
  if (!existing.some(item => item.regId === record.regId)) {
    existing.unshift(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  }
}

function getLocalRegistrations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

// Helper to fetch all registrations once
export async function fetchAllRegistrations() {
  if (isFirebaseActive && db) {
    try {
      const q = query(collection(db, 'registrations'), orderBy('createdServerTime', 'desc'));
      const snapshot = await withTimeout(getDocs(q), 3500);
      const list = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      const localItems = getLocalRegistrations();
      localItems.forEach(item => {
        if (!list.some(l => l.regId === item.regId)) {
          list.push(item);
        }
      });
      return list;
    } catch (err) {
      console.warn('Firebase fetch timed out or failed, using local:', err);
    }
  }

  return getLocalRegistrations();
}

// Real-Time WebSocket Listener: Pushes new registrations instantly to Admin Dashboard
export function listenToRegistrations(onUpdateCallback) {
  if (isFirebaseActive && db) {
    try {
      const q = query(collection(db, 'registrations'), orderBy('createdServerTime', 'desc'));
      return onSnapshot(q, (snapshot) => {
        const list = [];
        snapshot.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        const localItems = getLocalRegistrations();
        localItems.forEach(item => {
          if (!list.some(l => l.regId === item.regId)) {
            list.push(item);
          }
        });
        onUpdateCallback(list);
      }, (err) => {
        console.warn('Realtime listener fallback to static:', err);
        onUpdateCallback(getLocalRegistrations());
      });
    } catch (err) {
      console.warn('Realtime listener init error:', err);
    }
  }

  onUpdateCallback(getLocalRegistrations());
  return () => {};
}

// Helper to delete registration
export async function deleteRegistration(id) {
  if (isFirebaseActive && db && !id.startsWith('local_')) {
    try {
      await withTimeout(deleteDoc(doc(db, 'registrations', id)), 3000);
    } catch (err) {
      console.error('Firebase delete failed:', err);
    }
  }

  const list = getLocalRegistrations().filter(item => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function isFirebaseConnected() {
  return isFirebaseActive;
}
