importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCx28bKaCelYVeMwk2w2T535IVSYjklNj4",
  authDomain: "zenkus-ai.firebaseapp.com",
  projectId: "zenkus-ai",
  storageBucket: "zenkus-ai.firebasestorage.app",
  messagingSenderId: "84795941859",
  appId: "1:84795941859:web:81d0675b9ded00d4a3f6d6"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png'
  });
});
