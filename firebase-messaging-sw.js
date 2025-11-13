importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// O código do Firebase Messaging estava em conflito com o Service Worker do OneSignal.
// O código abaixo foi removido para garantir que o OneSignal funcione corretamente.

/*
// Scripts are imported using importScripts because this is a service worker.
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBscsAkO_yJYfVVtCBh3rNF8Cm51_HLW54",
    authDomain: "teste-rede-fcb99.firebaseapp.com",
    projectId: "teste-rede-fcb99",
    storageBucket: "teste-rede-fcb99.firebasestorage.app",
    messagingSenderId: "1006477304115",
    appId: "1:1006477304115:web:e88d8e5f2e75d1b4df5e46"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico'
  };

  return self.registration.showNotification(notificationTitle,
    notificationOptions);
});
*/
