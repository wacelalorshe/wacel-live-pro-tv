// js/firebase-config.js

// إعدادات Firebase الرئيسية للتطبيق (القنوات والأقسام)
const mainFirebaseConfig = {
    apiKey: "AIzaSyAkgEiYYlmpMe0NLewulheovlTQMz5C980",
    authDomain: "bein-42f9e.firebaseapp.com",
    projectId: "bein-42f9e",
    storageBucket: "bein-42f9e.firebasestorage.app",
    messagingSenderId: "143741167050",
    appId: "1:143741167050:web:922d3a0cddb40f67b21b33",
    measurementId: "G-JH198SKCFS"
};

// إعدادات Firebase للمباريات
const matchesFirebaseConfig = {
    apiKey: "AIzaSyCqE7ZwveHg1dIhYf1Hlo7OpHyCZudeZvM",
    authDomain: "wacel-live.firebaseapp.com",
    databaseURL: "https://wacel-live-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "wacel-live",
    storageBucket: "wacel-live.firebasestorage.app",
    messagingSenderId: "185108554006",
    appId: "1:185108554006:web:93171895b1d4bb07c6f037"
};

// تهيئة Firebase للتطبيق الرئيسي
let mainApp, mainDb;
let matchesApp, matchesDb;

// دالة لتهيئة Firebase الرئيسي
function initializeMainFirebase() {
    try {
        if (!firebase.apps.length) {
            mainApp = firebase.initializeApp(mainFirebaseConfig, "main");
        } else {
            mainApp = firebase.app("main");
        }
        mainDb = firebase.firestore(mainApp);
        console.log("✅ Firebase الرئيسي مهيأ بنجاح");
        return { app: mainApp, db: mainDb };
    } catch (error) {
        console.error("❌ فشل تهيئة Firebase الرئيسي:", error);
        return null;
    }
}

// دالة لتهيئة Firebase للمباريات
function initializeMatchesFirebase() {
    try {
        if (!firebase.apps.length) {
            matchesApp = firebase.initializeApp(matchesFirebaseConfig, "matches");
        } else {
            matchesApp = firebase.app("matches");
        }
        matchesDb = firebase.database(matchesApp);
        console.log("✅ Firebase للمباريات مهيأ بنجاح");
        return { app: matchesApp, db: matchesDb };
    } catch (error) {
        console.error("❌ فشل تهيئة Firebase للمباريات:", error);
        return null;
    }
}
