// Firebase configuration للصفحة الرئيسية
const firebaseConfig = {
    apiKey: "AIzaSyAkgEiYYlmpMe0NLewulheovlTQMz5C980",
    authDomain: "bein-42f9e.firebaseapp.com",
    projectId: "bein-42f9e",
    storageBucket: "bein-42f9e.firebasestorage.app",
    messagingSenderId: "143741167050",
    appId: "1:143741167050:web:922d3a0cddb40f67b21b33",
    measurementId: "G-JH198SKCFS"
};

// Global Firebase variables
let firebaseApp = null;
let db = null;
let firebaseInitialized = false;

// Initialize Firebase function
async function initializeFirebase() {
    return new Promise((resolve, reject) => {
        try {
            console.log('🚀 جاري تهيئة Firebase...');
            
            // Check if Firebase is available
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase SDK لم يتم تحميله');
            }

            // Check if Firebase is already initialized
            if (!firebase.apps.length) {
                firebaseApp = firebase.initializeApp(firebaseConfig);
                console.log('✅ تم تهيئة Firebase بنجاح');
            } else {
                firebaseApp = firebase.apps[0];
                console.log('✅ Firebase مهيأ مسبقاً');
            }

            // Initialize Firestore
            db = firebase.firestore();
            console.log('✅ تم تهيئة Firestore بنجاح');

            firebaseInitialized = true;
            resolve({ app: firebaseApp, db: db });
            
        } catch (error) {
            console.error('❌ فشل تهيئة Firebase:', error);
            reject(error);
        }
    });
}

// Test Firebase connection
async function testFirebaseConnection() {
    try {
        if (!db) {
            await initializeFirebase();
        }
        
        const testDoc = db.collection('test_connection').doc('test');
        await testDoc.set({ 
            test: true, 
            timestamp: new Date(),
            message: 'Testing Firestore connection'
        });
        
        await testDoc.delete();
        
        console.log('✅ اختبار اتصال Firebase ناجح');
        return true;
    } catch (error) {
        console.error('❌ فشل اختبار اتصال Firebase:', error);
        return false;
    }
}

// Load data from Firebase with error handling
async function loadFirebaseData(collectionName) {
    try {
        if (!firebaseInitialized || !db) {
            await initializeFirebase();
        }
        
        const snapshot = await db.collection(collectionName).get();
        
        if (snapshot.empty) {
            console.log(`ℹ️ لا توجد بيانات في ${collectionName}`);
            return [];
        }
        
        const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        console.log(`✅ تم تحميل ${data.length} عنصر من ${collectionName}`);
        return data;
        
    } catch (error) {
        console.error(`❌ خطأ في تحميل ${collectionName}:`, error);
        throw error;
    }
}

// Save data to Firebase
async function saveFirebaseData(collectionName, data) {
    try {
        if (!firebaseInitialized || !db) {
            await initializeFirebase();
        }
        
        const docRef = await db.collection(collectionName).add(data);
        console.log(`✅ تم حفظ البيانات في ${collectionName} مع ID: ${docRef.id}`);
        return docRef.id;
        
    } catch (error) {
        console.error(`❌ خطأ في حفظ البيانات في ${collectionName}:`, error);
        throw error;
    }
}

// Update data in Firebase
async function updateFirebaseData(collectionName, docId, data) {
    try {
        if (!firebaseInitialized || !db) {
            await initializeFirebase();
        }
        
        await db.collection(collectionName).doc(docId).update(data);
        console.log(`✅ تم تحديث الوثيقة ${docId} في ${collectionName}`);
        
    } catch (error) {
        console.error(`❌ خطأ في تحديث البيانات في ${collectionName}:`, error);
        throw error;
    }
}

// Delete data from Firebase
async function deleteFirebaseData(collectionName, docId) {
    try {
        if (!firebaseInitialized || !db) {
            await initializeFirebase();
        }
        
        await db.collection(collectionName).doc(docId).delete();
        console.log(`✅ تم حذف الوثيقة ${docId} من ${collectionName}`);
        
    } catch (error) {
        console.error(`❌ خطأ في حذف البيانات من ${collectionName}:`, error);
        throw error;
    }
}

// Save data to localStorage as backup
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        console.log(`💾 تم حفظ البيانات في localStorage تحت مفتاح: ${key}`);
    } catch (error) {
        console.error('❌ خطأ في حفظ البيانات في localStorage:', error);
    }
}

// Load data from localStorage
function loadFromLocalStorage(key) {
    try {
        const data = localStorage.getItem(key);
        if (data) {
            return JSON.parse(data);
        }
        return null;
    } catch (error) {
        console.error('❌ خطأ في تحميل البيانات من localStorage:', error);
        return null;
    }
}

// Export Firebase utilities for use in other files
window.firebaseUtils = {
    initializeFirebase,
    testFirebaseConnection,
    loadFirebaseData,
    saveFirebaseData,
    updateFirebaseData,
    deleteFirebaseData,
    saveToLocalStorage,
    loadFromLocalStorage,
    getDB: () => db,
    isInitialized: () => firebaseInitialized
};
