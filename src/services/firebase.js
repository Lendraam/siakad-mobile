// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBq71FL4NOt1L2XniygmT1hsGtp5N3odU4",
  authDomain: "mini-siakad-bcff1.firebaseapp.com",
  projectId: "mini-siakad-bcff1",
  storageBucket: "mini-siakad-bcff1.firebasestorage.app",
  messagingSenderId: "284681493240",
  appId: "1:284681493240:web:b1a886dcf2d5f385c4390d",
  measurementId: "G-QSY1PQWYYX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// messaging will be lazily initialized on-demand to avoid server-side imports
let messaging = null;

// VAPID key (public) for Web Push. Prefer environment override.
const DEFAULT_VAPID_KEY = process.env.REACT_APP_FIREBASE_VAPID_KEY || process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY || 'BKje5wtsJRmgNKULUFaVNBRRqB313zzZDwbIVuYps2pm2uRvfU2H_IOO0ZOx-bpK9SvU-RcDMTNfid9Rali8j50';

export async function requestPermissionAndGetToken(vapidKey = DEFAULT_VAPID_KEY) {
  if (typeof window === 'undefined') throw new Error('Not running in a browser environment');
  if (typeof Notification === 'undefined') throw new Error('Notifications API not available');

  // Lazy-import messaging functions only in browser
  if (!messaging) {
    try {
      const mod = await import('firebase/messaging');
      const { getMessaging } = mod;
      // Register service worker for background notifications if available
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        } catch (e) {
          // ignore registration failure; getToken may still work
        }
      }

      messaging = getMessaging(app);
    } catch (e) {
      throw new Error('Firebase Messaging not available: ' + e.message);
    }
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission not granted');

  const { getToken } = await import('firebase/messaging');
  // Provide the serviceWorkerRegistration if available
  let swReg = null;
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      swReg = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    } catch (e) {
      swReg = null;
    }
  }
  const token = await getToken(messaging, swReg ? { vapidKey, serviceWorkerRegistration: swReg } : { vapidKey });
  return token;
}

export async function onMessageListener(cb) {
  if (typeof window === 'undefined') return () => {};
  if (!messaging) {
    try {
      const mod = await import('firebase/messaging');
      const { getMessaging } = mod;
      messaging = getMessaging(app);
    } catch (e) {
      return () => {};
    }
  }

  const { onMessage } = await import('firebase/messaging');
  return onMessage(messaging, payload => cb(payload));
}

// Fetch KHS documents for a given student NIM from Firestore (lazy-loaded)
export async function fetchKHSForNim(nim) {
  if (typeof window === 'undefined') throw new Error('Firestore access must run in browser or Node with credentials');
  try {
    const mod = await import('firebase/firestore');
    const { getFirestore, collection, query, where, orderBy, getDocs } = mod;
    const db = getFirestore(app);
    const q = query(collection(db, 'khs'), where('nim', '==', String(nim)), orderBy('year', 'desc'));
    const snap = await getDocs(q);
    const results = [];
    snap.forEach(d => results.push({ id: d.id, ...d.data() }));
    return results;
  } catch (e) {
    throw new Error('Failed to fetch KHS: ' + e.message);
  }
}

// Realtime DB fetch (client-side) using REST API. Defaults to public RTDB URL if set.
const DEFAULT_RTD_URL = process.env.EXPO_PUBLIC_FIREBASE_RTD_URL || 'https://mini-siakad-bcff1-default-rtdb.firebaseio.com';

export async function fetchKHSFromRTDB(nim, rtdbUrl = DEFAULT_RTD_URL) {
  if (!nim) return [];
  // build query: /khs.json?orderBy="nim"&equalTo="<nim>"
  try {
    const url = buildRTDBKhsQueryUrl(nim, rtdbUrl);
    const res = await fetch(url);
    if (!res.ok) throw new Error('RTDB request failed: ' + res.statusText);
    const data = await res.json();
    // If RTDB complains about missing index, fallback to fetching all and filter client-side
    if (data && data.error && String(data.error).toLowerCase().includes('index not defined')) {
      console.warn('RTDB index missing for nim query, falling back to fetch-all');
      const allUrl = `${base}/khs.json`;
      const allRes = await fetch(allUrl);
      if (!allRes.ok) throw new Error('RTDB fetch-all failed: ' + allRes.statusText);
      const allData = await allRes.json();
      if (!allData) return [];
      const filtered = Object.keys(allData)
        .map(k => ({ id: k, ...allData[k] }))
        .filter(item => String(item.nim) === String(nim));
      filtered.sort((a, b) => (b.year || '').localeCompare(a.year || ''));
      return filtered;
    }
    if (!data) return [];
    // data is an object of id -> record
    const results = Object.keys(data).map(k => ({ id: k, ...data[k] }));
    // sort by year/semester descending if available
    results.sort((a, b) => (b.year || '').localeCompare(a.year || ''));
    return results;
  } catch (e) {
    console.warn('fetchKHSFromRTDB error', e.message);
    return [];
  }
}

export function buildRTDBKhsQueryUrl(nim, rtdbUrl = DEFAULT_RTD_URL) {
  const base = (rtdbUrl || DEFAULT_RTD_URL).replace(/\/$/, '');
  const orderBy = encodeURIComponent('"nim"');
  const equalTo = encodeURIComponent('"' + String(nim) + '"');
  return `${base}/khs.json?orderBy=${orderBy}&equalTo=${equalTo}`;
}

export async function fetchAllKHSFromRTDB(rtdbUrl = DEFAULT_RTD_URL) {
  try {
    const base = (rtdbUrl || DEFAULT_RTD_URL).replace(/\/$/, '');
    const url = `${base}/khs.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('RTDB fetch-all failed: ' + res.statusText);
    const data = await res.json();
    if (!data) return [];
    const results = Object.keys(data).map(k => ({ id: k, ...data[k] }));
    // sort by nim/year for stable display
    results.sort((a, b) => (String(a.nim || '') + (a.year || '')).localeCompare(String(b.nim || '') + (b.year || '')));
    return results;
  } catch (e) {
    console.warn('fetchAllKHSFromRTDB error', e.message);
    return [];
  }
}
