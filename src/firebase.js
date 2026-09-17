// Firebase Integration - Direct Cloud Firestore Database Only

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
  updateDoc,
  doc, 
  serverTimestamp 
} from 'firebase/firestore';

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
    console.log('Firebase Firestore connected directly to Cloud Database!');
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

// Save registration directly to Cloud Firestore Database
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
    const docRef = await addDoc(collection(db, 'registrations'), {
      ...record,
      createdServerTime: serverTimestamp()
    });
    record.id = docRef.id;
    return record;
  } else {
    throw new Error('Firebase Firestore is not initialized!');
  }
}

// Fetch all registrations directly from Cloud Firestore Database
export async function fetchAllRegistrations() {
  if (isFirebaseActive && db) {
    const q = query(collection(db, 'registrations'), orderBy('createdServerTime', 'desc'));
    const snapshot = await getDocs(q);
    const list = [];
    snapshot.forEach(docSnap => {
      list.push({ id: docSnap.id, ...docSnap.data() });
    });
    return list;
  }
  return [];
}

// Real-Time WebSocket Streaming directly from Cloud Firestore Database
export function listenToRegistrations(onUpdateCallback) {
  if (isFirebaseActive && db) {
    const q = query(collection(db, 'registrations'), orderBy('createdServerTime', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      onUpdateCallback(list);
    }, (err) => {
      console.error('Realtime listener error:', err);
      onUpdateCallback([]);
    });
  }

  onUpdateCallback([]);
  return () => {};
}

// Delete registration directly from Cloud Firestore Database
export async function deleteRegistration(id) {
  if (isFirebaseActive && db) {
    await deleteDoc(doc(db, 'registrations', id));
  }
}

// Update attendance status directly in Cloud Firestore Database
export async function updateAttendanceStatus(id, attendedStatus) {
  if (isFirebaseActive && db) {
    await updateDoc(doc(db, 'registrations', id), {
      attended: Boolean(attendedStatus),
      attendedAt: attendedStatus ? new Date().toISOString() : null
    });
  }
}

export function isFirebaseConnected() {
  return isFirebaseActive;
}
