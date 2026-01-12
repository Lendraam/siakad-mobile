importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyBq71FL4NOt1L2XniygmT1hsGtp5N3odU4",
  authDomain: "mini-siakad-bcff1.firebaseapp.com",
  projectId: "mini-siakad-bcff1",
  storageBucket: "mini-siakad-bcff1.firebasestorage.app",
  messagingSenderId: "284681493240",
  appId: "1:284681493240:web:b1a886dcf2d5f385c4390d",
  measurementId: "G-QSY1PQWYYX"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const notification = payload.notification || {};
  const title = notification.title || 'Notifikasi';
  const options = {
    body: notification.body || '',
    icon: '/favicon.png'
  };
  self.registration.showNotification(title, options);
});
