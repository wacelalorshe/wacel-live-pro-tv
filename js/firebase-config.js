// firebase-config.js
// Firebase configuration - نفس إعدادات الصفحة الرئيسية
const firebaseConfig = {
    apiKey: "AIzaSyAkgEiYYlmpMe0NLewulheovlTQMz5C980",
    authDomain: "bein-42f9e.firebaseapp.com",
    projectId: "bein-42f9e",
    storageBucket: "bein-42f9e.firebasestorage.app",
    messagingSenderId: "143741167050",
    appId: "1:143741167050:web:922d3a0cddb40f67b21b33",
    measurementId: "G-JH198SKCFS"
};

// متغيرات عالمية
let db = null;
let isFirebaseInitialized = false;

// دالة لتهيئة Firebase
async function initializeFirebase() {
    return new Promise((resolve, reject) => {
        try {
            console.log('🚀 محاولة تهيئة Firebase...');
            
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase SDK لم يتم تحميله');
            }

            // التحقق إذا كان Firebase مهيأ بالفعل
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            
            // الحصول على كائن Firestore
            db = firebase.firestore();
            isFirebaseInitialized = true;
            
            console.log('✅ Firebase مهيأ بنجاح');
            resolve(db);
            
        } catch (error) {
            console.error('❌ فشل في تهيئة Firebase:', error);
            reject(error);
        }
    });
}

// دالة للحصول على كائن قاعدة البيانات
function getFirestore() {
    if (!db) {
        throw new Error('Firestore لم يتم تهيئته بعد. قم باستدعاء initializeFirebase أولاً.');
    }
    return db;
}

// تصدير الدوال والمتغيرات للاستخدام في ملفات أخرى
window.firebaseConfig = {
    initializeFirebase,
    getFirestore,
    isInitialized: () => isFirebaseInitialized
};
