// js/admin.js
// نظام إدارة متكامل مع Firebase مع دعم التعديل
class AdminManager {
    constructor() {
        this.isAuthenticated = false;
        this.firebaseAvailable = false;
        this.firestoreAvailable = false;
        this.sections = [];
        this.channels = [];
        this.editingSection = null;
        this.editingChannel = null;
        this.init();
    }

    async init() {
        console.log('AdminManager initializing...');
        
        this.checkAuthentication();
        await this.checkFirebase();
        this.setupUI();
    }

    checkAuthentication() {
        const storedAuth = localStorage.getItem('adminAuth');
        const storedEmail = localStorage.getItem('adminEmail');
        
        console.log('Authentication check:', { storedAuth, storedEmail });
        
        this.isAuthenticated = storedAuth === 'true' && storedEmail;
        
        if (this.isAuthenticated) {
            console.log('User authenticated:', storedEmail);
            this.showAdminPanel();
        } else {
            console.log('User not authenticated');
            this.showLoginRequired();
        }
    }

    async checkFirebase() {
        try {
            if (typeof firebase === 'undefined' || !mainDb) {
                this.showFirebaseStatus('Firebase غير متاح', 'error');
                return;
            }

            const testDoc = mainDb.collection('test_connection').doc('test');
            await testDoc.set({ 
                test: true, 
                timestamp: new Date(),
                message: 'Testing Firestore connection'
            });
            
            await testDoc.delete();
            
            this.firebaseAvailable = true;
            this.firestoreAvailable = true;
            this.showFirebaseStatus('الاتصال بقاعدة البيانات ناجح', 'success');
            
        } catch (error) {
            console.error('Firebase connection test failed:', error);
            
            if (error.code === 'permission-denied') {
                this.showFirebaseStatus('صلاحيات غير كافية - تحقق من قواعد Firestore', 'error');
            } else if (error.code === 'unavailable') {
                this.showFirebaseStatus('لا يمكن الاتصل
