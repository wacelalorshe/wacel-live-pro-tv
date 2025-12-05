// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAkgEiYYlmpMe0NLewulheovlTQMz5C980",
    authDomain: "bein-42f9e.firebaseapp.com",
    projectId: "bein-42f9e",
    storageBucket: "bein-42f9e.firebasestorage.app",
    messagingSenderId: "143741167050",
    appId: "1:143741167050:web:922d3a0cddb40f67b21b33",
    measurementId: "G-JH198SKCFS"
};

// تطبيق Bein Sport - الصفحة الرئيسية
class BeinSportApp {
    constructor() {
        this.sections = [];
        this.channels = [];
        this.firebaseInitialized = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.init();
    }

    async init() {
        console.log('🚀 بدء تشغيل تطبيق Bein Sport...');
        
        // تعيين السنة الحالية
        document.getElementById('currentYear').textContent = new Date().getFullYear();
        
        // تحميل البيانات تلقائياً
        await this.loadData();
        
        console.log('✅ تم تهيئة التطبيق بنجاح');
    }

    async loadData() {
        console.log('📥 جاري تحميل البيانات...');
        
        // عرض حالة التحميل
        this.showLoading();
        
        try {
            // المحاولة الأولى: من Firebase
            try {
                await this.loadFromFirebase();
                console.log('✅ تم تحميل البيانات من Firebase');
                this.showSuccessMessage('تم تحميل البيانات بنجاح');
                return;
            } catch (firebaseError) {
                console.warn('⚠️ فشل تحميل Firebase:', firebaseError.message);
                
                // إذا فشل Firebase، حاول استخدام localStorage تلقائياً
                try {
                    await this.loadFromLocalStorage();
                    console.log('✅ تم تحميل البيانات من localStorage');
                    this.showInfoMessage('تم تحميل البيانات المحلية');
                    return;
                } catch (localStorageError) {
                    console.warn('⚠️ فشل تحميل localStorage:', localStorageError.message);
                    
                    // إذا فشل localStorage، استخدم البيانات الافتراضية تلقائياً
                    this.loadDefaultData();
                    console.log('✅ تم تحميل البيانات الافتراضية');
                    this.showWarningMessage('تم تحميل البيانات الافتراضية. تحقق من اتصال الإنترنت.');
                }
            }
            
        } catch (error) {
            console.error('❌ خطأ غير متوقع:', error);
            // في حالة حدوث خطأ غير متوقع، استخدم البيانات الافتراضية
            this.loadDefaultData();
        }
    }

    async loadFromFirebase() {
        return new Promise(async (resolve, reject) => {
            try {
                console.log('📡 جاري جلب البيانات من Firebase...');
                
                // 1. التحقق من وجود Firebase
                if (typeof firebase === 'undefined') {
                    console.error('❌ Firebase SDK غير محمل');
                    reject(new Error('Firebase SDK غير محمل'));
                    return;
                }
                
                // 2. تهيئة Firebase
                let db;
                try {
                    // تهيئة Firebase إذا لم يكن مهيأ
                    if (!firebase.apps.length) {
                        firebase.initializeApp(firebaseConfig);
                        console.log('✅ تم تهيئة Firebase بنجاح');
                    } else {
                        console.log('✅ Firebase مهيأ مسبقاً');
                    }
                    
                    db = firebase.firestore();
                    this.firebaseInitialized = true;
                    
                } catch (initError) {
                    console.error('❌ فشل تهيئة Firebase:', initError);
                    reject(initError);
                    return;
                }
                
                if (!db) {
                    reject(new Error('قاعدة البيانات غير متاحة'));
                    return;
                }
                
                console.log('✅ Firestore جاهز للاستخدام');
                
                // إضافة timeout لتجنب الانتظار الطويل
                const timeoutPromise = new Promise((_, rejectTimeout) => {
                    setTimeout(() => rejectTimeout(new Error('انتهت مهلة الاتصال بقاعدة البيانات')), 10000);
                });
                
                // 3. جلب الأقسام مع timeout
                let sectionsSnapshot;
                try {
                    sectionsSnapshot = await Promise.race([
                        db.collection('sections').orderBy('order').get(),
                        timeoutPromise
                    ]);
                } catch (orderError) {
                    // إذا فشل الترتيب أو انتهت المهلة
                    console.warn('⚠️ فشل ترتيب الأقسام، جاري جلب بدون ترتيب:', orderError);
                    sectionsSnapshot = await Promise.race([
                        db.collection('sections').get(),
                        timeoutPromise
                    ]);
                }
                
                if (sectionsSnapshot.empty) {
                    console.log('ℹ️ لا توجد أقسام في Firebase');
                    reject(new Error('لا توجد أقسام في قاعدة البيانات'));
                    return;
                }
                
                this.sections = sectionsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                console.log(`✅ تم تحميل ${this.sections.length} قسم من Firebase`);
                
                // 4. جلب القنوات مع timeout
                try {
                    const channelsSnapshot = await Promise.race([
                        db.collection('channels').get(),
                        timeoutPromise
                    ]);
                    
                    if (!channelsSnapshot.empty) {
                        this.channels = channelsSnapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));
                        console.log(`✅ تم تحميل ${this.channels.length} قناة من Firebase`);
                    }
                } catch (channelsError) {
                    console.warn('⚠️ فشل تحميل القنوات:', channelsError);
                    this.channels = [];
                }
                
                // 5. حفظ في localStorage كنسخة احتياطية
                this.saveToLocalStorage();
                
                // 6. عرض البيانات
                this.renderSections();
                
                resolve(true);
                
            } catch (error) {
                console.error('❌ فشل تحميل Firebase:', error);
                reject(error);
            }
        });
    }

    async loadFromLocalStorage() {
        return new Promise((resolve, reject) => {
            try {
                console.log('💾 جاري تحميل البيانات من التخزين المحلي...');
                
                // 1. جلب الأقسام من localStorage
                const savedSections = localStorage.getItem('bein_sections');
                if (!savedSections) {
                    reject(new Error('لا توجد بيانات محلية للأقسام'));
                    return;
                }
                
                this.sections = JSON.parse(savedSections);
                console.log(`✅ تم تحميل ${this.sections.length} قسم من localStorage`);
                
                // 2. جلب القنوات من localStorage
                const savedChannels = localStorage.getItem('bein_channels');
                if (savedChannels) {
                    this.channels = JSON.parse(savedChannels);
                    console.log(`✅ تم تحميل ${this.channels.length} قناة من localStorage`);
                }
                
                // 3. عرض البيانات
                this.renderSections();
                
                resolve(true);
                
            } catch (error) {
                console.error('❌ فشل تحميل البيانات المحلية:', error);
                reject(error);
            }
        });
    }

    loadDefaultData() {
        console.log('📋 استخدام البيانات الافتراضية...');
        
        this.sections = [
            {
                id: 'bein-sports',
                name: 'قنوات بي إن سبورت',
                order: 1,
                isActive: true,
                description: 'جميع قنوات بي إن سبورت الرياضية',
                image: 'https://via.placeholder.com/200x150/2F2562/FFFFFF?text=BEIN+SPORT'
            },
            {
                id: 'sports-channels',
                name: 'القنوات الرياضية',
                order: 2,
                isActive: true,
                description: 'أفضل القنوات الرياضية العالمية',
                image: 'https://via.placeholder.com/200x150/2F2562/FFFFFF?text=SPORTS'
            },
            {
                id: 'arabic-channels',
                name: 'القنوات العربية',
                order: 3,
                isActive: true,
                description: 'القنوات العربية المشهورة',
                image: 'https://via.placeholder.com/200x150/2F2562/FFFFFF?text=ARABIC'
            },
            {
                id: 'entertainment',
                name: 'قنوات الترفيه',
                order: 4,
                isActive: true,
                description: 'قنوات الأفلام والمسلسلات',
                image: 'https://via.placeholder.com/200x150/2F2562/FFFFFF?text=ENTERTAIN'
            }
        ];
        
        this.channels = [
            {
                id: 'bein-1',
                name: 'بي إن سبورت 1',
                image: 'https://via.placeholder.com/200x100/2F2562/FFFFFF?text=BEIN+1',
                url: '#',
                order: 1,
                sectionId: 'bein-sports',
                appUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player'
            },
            {
                id: 'bein-2',
                name: 'بي إن سبورت 2',
                image: 'https://via.placeholder.com/200x100/2F2562/FFFFFF?text=BEIN+2',
                url: '#',
                order: 2,
                sectionId: 'bein-sports',
                appUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player'
            },
            {
                id: 'bein-3',
                name: 'بي إن سبورت 3',
                image: 'https://via.placeholder.com/200x100/2F2562/FFFFFF?text=BEIN+3',
                url: '#',
                order: 3,
                sectionId: 'bein-sports',
                appUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player'
            }
        ];
        
        this.saveToLocalStorage();
        this.renderSections();
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('bein_sections', JSON.stringify(this.sections));
            localStorage.setItem('bein_channels', JSON.stringify(this.channels));
            console.log('💾 تم حفظ البيانات في التخزين المحلي');
        } catch (error) {
            console.error('❌ خطأ في حفظ البيانات محلياً:', error);
        }
    }

    showLoading() {
        const container = document.getElementById('sectionsContainer');
        if (container) {
            container.innerHTML = `
                <div class="loading">
                    <div class="spinner-border text-primary mb-3" role="status">
                        <span class="visually-hidden">جاري التحميل...</span>
                    </div>
                    <p>جاري تحميل الأقسام...</p>
                    <small>يرجى الانتظار</small>
                </div>
            `;
        }
    }

    renderSections() {
        const container = document.getElementById('sectionsContainer');
        if (!container) {
            console.error('❌ حاوية الأقسام غير موجودة');
            return;
        }

        // تصفية الأقسام النشطة وترتيبها
        const activeSections = this.sections
            .filter(section => section.isActive !== false)
            .sort((a, b) => (a.order || 1) - (b.order || 1));
        
        if (activeSections.length === 0) {
            container.innerHTML = `
                <div class="loading">
                    <i class="uil uil-folder" style="font-size: 3rem; color: #6c757d;"></i>
                    <p class="mt-3">لا توجد أقسام متاحة حالياً</p>
                    <small>سيتم إضافة أقسام قريباً</small>
                </div>
            `;
            return;
        }

        console.log(`🎯 عرض ${activeSections.length} قسم في الواجهة`);
        
        // إنشاء HTML للأقسام
        container.innerHTML = `
            <div class="sections-grid">
                ${activeSections.map(section => {
                    const channelCount = this.channels.filter(channel => channel.sectionId === section.id).length;
                    const sectionLink = `section.html?id=${section.id}`;
                    
                    return `
                        <a href="${sectionLink}" class="section-card" data-section-id="${section.id}">
                            <div class="section-card-link">
                                ${section.image ? `
                                    <div class="section-image">
                                        <img src="${section.image}" alt="${section.name}" 
                                             onerror="this.src='https://via.placeholder.com/100x100/2F2562/FFFFFF?text=IMG'">
                                    </div>
                                ` : `
                                    <div class="section-icon">
                                        <i class="uil uil-folder"></i>
                                    </div>
                                `}
                                <div class="section-name">${section.name}</div>
                                ${section.description ? `<div class="section-description-card">${section.description}</div>` : ''}
                                <div class="section-badge">${channelCount} قناة</div>
                            </div>
                        </a>
                    `;
                }).join('')}
            </div>
        `;

        console.log('✅ تم عرض الأقسام بنجاح');
    }

    showSuccessMessage(message) {
        // إزالة أي تنبيهات سابقة
        const oldAlerts = document.querySelectorAll('.custom-alert');
        oldAlerts.forEach(alert => alert.remove());
        
        // عرض رسالة النجاح مؤقتة
        const alertDiv = document.createElement('div');
        alertDiv.className = `custom-alert alert alert-success alert-dismissible fade show`;
        alertDiv.innerHTML = `
            <i class="uil uil-check-circle me-2"></i> ${message}
            <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
        `;
        
        const content = document.querySelector('.content');
        if (content) {
            content.insertBefore(alertDiv, content.firstChild);
        }
        
        // إزالة الرسالة بعد 3 ثواني
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 3000);
    }

    showInfoMessage(message) {
        // إزالة أي تنبيهات سابقة
        const oldAlerts = document.querySelectorAll('.custom-alert');
        oldAlerts.forEach(alert => alert.remove());
        
        // عرض رسالة معلومات مؤقتة
        const alertDiv = document.createElement('div');
        alertDiv.className = `custom-alert alert alert-info alert-dismissible fade show`;
        alertDiv.innerHTML = `
            <i class="uil uil-info-circle me-2"></i> ${message}
            <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
        `;
        
        const content = document.querySelector('.content');
        if (content) {
            content.insertBefore(alertDiv, content.firstChild);
        }
        
        // إزالة الرسالة بعد 3 ثواني
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 3000);
    }

    showWarningMessage(message) {
        // إزالة أي تنبيهات سابقة
        const oldAlerts = document.querySelectorAll('.custom-alert');
        oldAlerts.forEach(alert => alert.remove());
        
        // عرض رسالة تحذير مؤقتة
        const alertDiv = document.createElement('div');
        alertDiv.className = `custom-alert alert alert-warning alert-dismissible fade show`;
        alertDiv.innerHTML = `
            <i class="uil uil-exclamation-triangle me-2"></i> ${message}
            <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
        `;
        
        const content = document.querySelector('.content');
        if (content) {
            content.insertBefore(alertDiv, content.firstChild);
        }
        
        // إزالة الرسالة بعد 5 ثواني
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    async retryLoadData() {
        console.log('🔄 إعادة محاولة تحميل البيانات...');
        await this.loadData();
    }
}

// بدء التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏠 تهيئة التطبيق...');
    window.app = new BeinSportApp();
});

// جعل الدوال متاحة عالمياً
window.reloadAppData = function() {
    if (window.app) {
        window.app.retryLoadData();
    }
};
