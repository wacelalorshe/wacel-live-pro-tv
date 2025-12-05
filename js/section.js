// تطبيق عرض القسم مع معالجة كاملة للأخطاء
class SectionApp {
    constructor() {
        this.section = null;
        this.channels = [];
        this.sectionId = null;
        this.firebaseInitialized = false;
        this.init();
    }

    async init() {
        console.log('🚀 بدء تشغيل صفحة القسم...');
        
        // تعيين السنة الحالية
        document.getElementById('currentYear').textContent = new Date().getFullYear();
        
        // الحصول على معرف القسم من رابط الصفحة
        const urlParams = new URLSearchParams(window.location.search);
        this.sectionId = urlParams.get('id');
        
        console.log('📋 معرّف القسم:', this.sectionId);
        
        if (!this.sectionId) {
            this.showError('لم يتم تحديد قسم. الرجاء العودة للصفحة الرئيسية واختيار قسم.');
            return;
        }
        
        // إعداد مستمعي الأحداث
        this.setupEventListeners();
        
        // محاولة تحميل البيانات
        await this.loadData();
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
                return;
            } catch (firebaseError) {
                console.warn('⚠️ فشل تحميل Firebase:', firebaseError.message);
            }
            
            // المحاولة الثانية: من localStorage
            try {
                await this.loadFromLocalStorage();
                console.log('✅ تم تحميل البيانات من localStorage');
                return;
            } catch (localStorageError) {
                console.warn('⚠️ فشل تحميل localStorage:', localStorageError.message);
            }
            
            // إذا فشل كل شيء، استخدم البيانات الافتراضية
            this.loadDefaultData();
            
        } catch (error) {
            console.error('❌ خطأ غير متوقع:', error);
            this.showError('حدث خطأ غير متوقع: ' + error.message);
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
                    // استخدام الإعدادات من الصفحة الرئيسية
                    const firebaseConfig = {
                        apiKey: "AIzaSyAkgEiYYlmpMe0NLewulheovlTQMz5C980",
                        authDomain: "bein-42f9e.firebaseapp.com",
                        projectId: "bein-42f9e",
                        storageBucket: "bein-42f9e.firebasestorage.app",
                        messagingSenderId: "143741167050",
                        appId: "1:143741167050:web:922d3a0cddb40f67b21b33",
                        measurementId: "G-JH198SKCFS"
                    };
                    
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
                
                // 3. جلب بيانات القسم
                const sectionDoc = await db.collection('sections').doc(this.sectionId).get();
                
                if (!sectionDoc.exists) {
                    reject(new Error('القسم غير موجود في قاعدة البيانات'));
                    return;
                }
                
                this.section = {
                    id: sectionDoc.id,
                    ...sectionDoc.data()
                };
                
                console.log('✅ تم تحميل القسم:', this.section.name);
                
                // 4. جلب القنوات الخاصة بهذا القسم
                let channelsQuery;
                try {
                    channelsQuery = await db.collection('channels')
                        .where('sectionId', '==', this.sectionId)
                        .orderBy('order')
                        .get();
                } catch (orderError) {
                    // إذا فشل الترتيب، نجلب بدون ترتيب
                    console.warn('⚠️ فشل ترتيب القنوات، جاري جلب بدون ترتيب:', orderError);
                    channelsQuery = await db.collection('channels')
                        .where('sectionId', '==', this.sectionId)
                        .get();
                }
                
                if (channelsQuery && !channelsQuery.empty) {
                    this.channels = channelsQuery.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    console.log(`✅ تم تحميل ${this.channels.length} قناة`);
                } else {
                    console.log('⚠️ لا توجد قنوات في هذا القسم');
                    this.channels = [];
                }
                
                // 5. حفظ في localStorage كنسخة احتياطية
                this.saveToLocalStorage();
                
                // 6. عرض البيانات
                this.displayData();
                
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
                
                const sections = JSON.parse(savedSections);
                
                // 2. البحث عن القسم المطلوب
                this.section = sections.find(s => s.id === this.sectionId);
                
                if (!this.section) {
                    reject(new Error('القسم غير موجود في البيانات المحلية'));
                    return;
                }
                
                console.log('✅ تم العثور على القسم في البيانات المحلية:', this.section.name);
                
                // 3. جلب القنوات من localStorage
                const savedChannels = localStorage.getItem('bein_channels');
                if (savedChannels) {
                    const allChannels = JSON.parse(savedChannels);
                    this.channels = allChannels.filter(channel => channel.sectionId === this.sectionId);
                    console.log(`✅ تم تحميل ${this.channels.length} قناة من البيانات المحلية`);
                } else {
                    this.channels = [];
                }
                
                // 4. عرض البيانات
                this.displayData();
                resolve(true);
                
            } catch (error) {
                console.error('❌ فشل تحميل البيانات المحلية:', error);
                reject(error);
            }
        });
    }

    loadDefaultData() {
        console.log('📋 استخدام البيانات الافتراضية...');
        
        this.section = {
            id: this.sectionId || 'default-1',
            name: 'قسم القنوات',
            description: 'استمتع بمشاهدة القنوات المتاحة في هذا القسم',
            order: 1,
            isActive: true
        };
        
        this.channels = [
            {
                id: 'default-1',
                name: 'قناة تجريبية 1',
                image: 'https://via.placeholder.com/100x100/2F2562/FFFFFF?text=TV+1',
                url: '#',
                order: 1,
                sectionId: this.sectionId,
                appUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player',
                downloadUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player'
            },
            {
                id: 'default-2',
                name: 'قناة تجريبية 2',
                image: 'https://via.placeholder.com/100x100/2F2562/FFFFFF?text=TV+2',
                url: '#',
                order: 2,
                sectionId: this.sectionId,
                appUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player',
                downloadUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player'
            },
            {
                id: 'default-3',
                name: 'قناة تجريبية 3',
                image: 'https://via.placeholder.com/100x100/2F2562/FFFFFF?text=TV+3',
                url: '#',
                order: 3,
                sectionId: this.sectionId,
                appUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player',
                downloadUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player'
            }
        ];
        
        this.displayData();
        this.saveToLocalStorage();
        
        this.showAlert('⚠️ تم تحميل البيانات الافتراضية. تأكد من اتصال الإنترنت للبيانات الحقيقية.', 'warning');
    }

    saveToLocalStorage() {
        try {
            // حفظ الأقسام
            let allSections = [];
            const savedSections = localStorage.getItem('bein_sections');
            
            if (savedSections) {
                allSections = JSON.parse(savedSections);
                
                // تحديث القسم الحالي إذا كان موجوداً
                const existingIndex = allSections.findIndex(s => s.id === this.section.id);
                if (existingIndex !== -1) {
                    allSections[existingIndex] = this.section;
                } else {
                    allSections.push(this.section);
                }
            } else {
                allSections = [this.section];
            }
            
            localStorage.setItem('bein_sections', JSON.stringify(allSections));
            
            // حفظ القنوات
            let allChannels = [];
            const savedChannels = localStorage.getItem('bein_channels');
            
            if (savedChannels) {
                allChannels = JSON.parse(savedChannels);
                
                // إزالة القنوات القديمة لهذا القسم
                allChannels = allChannels.filter(c => c.sectionId !== this.sectionId);
                
                // إضافة القنوات الجديدة
                allChannels = [...allChannels, ...this.channels];
            } else {
                allChannels = this.channels;
            }
            
            localStorage.setItem('bein_channels', JSON.stringify(allChannels));
            
            console.log('💾 تم حفظ البيانات في التخزين المحلي');
            
        } catch (error) {
            console.error('❌ خطأ في حفظ البيانات محلياً:', error);
        }
    }

    showLoading() {
        const container = document.getElementById('channelsContainer');
        if (container) {
            container.innerHTML = `
                <div class="loading">
                    <div class="spinner-border text-primary mb-3" role="status">
                        <span class="visually-hidden">جاري التحميل...</span>
                    </div>
                    <p>جاري تحميل القنوات...</p>
                    <small>يرجى الانتظار</small>
                </div>
            `;
        }
    }

    displayData() {
        // تحديث عنوان ووصف القسم
        document.getElementById('sectionHeader').textContent = this.section.name;
        document.getElementById('sectionName').textContent = this.section.name;
        document.getElementById('sectionDescription').textContent = 
            this.section.description || 'استمتع بمشاهدة القنوات المتاحة في هذا القسم';
        
        // عرض القنوات
        this.renderChannels();
    }

    renderChannels() {
        const container = document.getElementById('channelsContainer');
        
        if (!container) {
            console.error('❌ حاوية القنوات غير موجودة');
            return;
        }
        
        if (!this.channels || this.channels.length === 0) {
            container.innerHTML = `
                <div class="loading">
                    <i class="uil uil-tv-retro" style="font-size: 3rem; color: #6c757d;"></i>
                    <p class="mt-3">لا توجد قنوات في هذا القسم</p>
                    <small>سيتم إضافة قنوات قريباً</small>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.channels.map(channel => `
            <div class="channel-card" data-channel-id="${channel.id}">
                <div class="channel-logo">
                    <img src="${channel.image || 'https://via.placeholder.com/100x100/2F2562/FFFFFF?text=TV'}" 
                         alt="${channel.name}"
                         onerror="this.src='https://via.placeholder.com/100x100/2F2562/FFFFFF?text=TV'">
                </div>
                <div class="channel-name">${channel.name}</div>
            </div>
        `).join('');
        
        // إضافة مستمعي الأحداث للقنوات
        this.setupChannelEventListeners();
    }

    setupChannelEventListeners() {
        document.querySelectorAll('.channel-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const channelId = card.getAttribute('data-channel-id');
                const channel = this.channels.find(c => c.id === channelId);
                if (channel) {
                    this.openChannel(channel);
                }
            });
        });
    }

    openChannel(channel) {
        console.log('🔗 فتح القناة:', channel.name);
        
        // إذا كان هناك رابط مباشر، افتحه
        if (channel.url && channel.url !== '#' && channel.url.trim() !== '') {
            try {
                window.open(channel.url, '_blank');
                return;
            } catch (error) {
                console.error('❌ خطأ في فتح الرابط:', error);
            }
        }
        
        // وإلا اعرض نافذة التثبيت
        this.showInstallModal(channel);
    }

    showInstallModal(channel) {
        const modal = document.getElementById('installModal');
        if (modal) {
            modal.style.display = "block";
            
            // زر التحميل
            const confirmBtn = document.getElementById('confirmInstall');
            if (confirmBtn) {
                confirmBtn.onclick = () => {
                    const downloadUrl = channel.downloadUrl || 
                                        channel.appUrl || 
                                        'https://play.google.com/store/apps/details?id=com.xpola.player';
                    window.open(downloadUrl, '_blank');
                    this.closeModal();
                };
            }
            
            // زر الإلغاء
            const cancelBtn = document.getElementById('cancelInstall');
            if (cancelBtn) {
                cancelBtn.onclick = () => {
                    this.closeModal();
                };
            }
        }
    }

    closeModal() {
        const modal = document.getElementById('installModal');
        if (modal) {
            modal.style.display = "none";
        }
    }

    showError(message) {
        console.error('❌ خطأ:', message);
        
        const container = document.getElementById('channelsContainer');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <i class="uil uil-exclamation-triangle" style="font-size: 3rem; color: #ff6b6b;"></i>
                    <h4 class="mt-3" style="color: #ff6b6b;">حدث خطأ</h4>
                    <p>${message}</p>
                    <div class="mt-4">
                        <a href="index.html" class="btn btn-primary me-2">
                            <i class="uil uil-home"></i> العودة للرئيسية
                        </a>
                        <button onclick="window.location.reload()" class="btn btn-secondary me-2">
                            <i class="uil uil-redo"></i> إعادة تحميل الصفحة
                        </button>
                        <button onclick="window.sectionApp.loadData()" class="btn btn-warning">
                            <i class="uil uil-refresh"></i> إعادة تحميل البيانات
                        </button>
                    </div>
                    <div class="mt-3" style="font-size: 12px; color: #aaa;">
                        <p>معرف القسم: ${this.sectionId || 'غير محدد'}</p>
                        <p>Firebase مهيأ: ${this.firebaseInitialized ? 'نعم' : 'لا'}</p>
                    </div>
                </div>
            `;
        }
    }

    showAlert(message, type = 'info') {
        // إزالة أي تنبيهات سابقة
        const oldAlerts = document.querySelectorAll('.custom-alert');
        oldAlerts.forEach(alert => alert.remove());
        
        const alertDiv = document.createElement('div');
        alertDiv.className = `custom-alert alert alert-${type} alert-dismissible fade show mt-3`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
        `;
        
        const content = document.querySelector('.content');
        if (content) {
            content.insertBefore(alertDiv, content.firstChild);
        }
        
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    setupEventListeners() {
        // إغلاق النافذة المنبثقة عند النقر خارجها
        window.addEventListener('click', (event) => {
            const modal = document.getElementById('installModal');
            if (event.target === modal) {
                this.closeModal();
            }
        });
        
        // زر الإلغاء في النافذة المنبثقة
        const cancelBtn = document.getElementById('cancelInstall');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }
    }
}

// دالة اختبار Firebase
function testFirebaseConnection() {
    console.log('🔍 اختبار اتصال Firebase...');
    
    // التحقق من تحميل Firebase SDK
    if (typeof firebase === 'undefined') {
        console.error('❌ Firebase SDK غير محمل');
        console.log('🔄 حاول تحميل Firebase SDK يدوياً...');
        
        // محاولة تحميل SDK يدوياً
        const script = document.createElement('script');
        script.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js';
        script.onload = () => {
            console.log('✅ تم تحميل firebase-app');
            const script2 = document.createElement('script');
            script2.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js';
            script2.onload = () => {
                console.log('✅ تم تحميل firebase-firestore');
                alert('تم تحميل Firebase بنجاح. أعد تحميل الصفحة.');
            };
            document.head.appendChild(script2);
        };
        document.head.appendChild(script);
        
        return false;
    }
    
    console.log('✅ Firebase SDK محمل');
    
    // اختبار الوظائف الأساسية
    try {
        const testObj = firebase;
        console.log('✅ firebase object موجود');
        
        if (typeof firebase.initializeApp === 'function') {
            console.log('✅ firebase.initializeApp موجود');
        }
        
        if (typeof firebase.firestore === 'function') {
            console.log('✅ firebase.firestore موجود');
        }
        
        return true;
    } catch (error) {
        console.error('❌ فشل اختبار Firebase:', error);
        return false;
    }
}

// بدء التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏠 صفحة القسم جاهزة للتشغيل');
    
    // اختبار اتصال Firebase أولاً
    const firebaseOk = testFirebaseConnection();
    
    if (!firebaseOk) {
        console.warn('⚠️ Firebase غير جاهز، سيتم استخدام البيانات المحلية');
    }
    
    window.sectionApp = new SectionApp();
});

// جعل الدوال متاحة عالمياً للاستخدام
window.reloadSectionData = function() {
    if (window.sectionApp) {
        window.sectionApp.loadData();
    }
};

window.testFirebase = testFirebaseConnection;
