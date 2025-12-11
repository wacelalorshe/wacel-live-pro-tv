// js/section.js
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

// تطبيق عرض القنوات في القسم
class SectionChannelsApp {
    constructor() {
        this.section = null;
        this.channels = [];
        this.hasInstalledApp = localStorage.getItem('app_installed') === 'true';
        this.currentSectionId = null;
        this.init();
    }

    async init() {
        console.log('🚀 بدء تشغيل صفحة القسم...');
        
        // تعيين السنة الحالية
        document.getElementById('currentYear').textContent = new Date().getFullYear();
        
        // الحصول على معرف القسم من URL
        this.currentSectionId = this.getSectionIdFromURL();
        
        if (!this.currentSectionId) {
            this.showError('لم يتم تحديد القسم');
            return;
        }
        
        // تحديث العنوان
        document.getElementById('sectionHeader').textContent = 'جاري التحميل...';
        
        // تحميل البيانات
        await this.loadData();
        
        // إعداد نقرات الأزرار
        this.setupEventListeners();
        
        console.log('✅ تم تهيئة صفحة القسم بنجاح');
    }

    getSectionIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    async loadData() {
        console.log('📥 جاري تحميل بيانات القسم...');
        
        // عرض حالة التحميل
        this.showLoading();
        
        try {
            // المحاولة الأولى: من Firebase
            try {
                await this.loadFromFirebase();
                console.log('✅ تم تحميل بيانات القسم من Firebase');
                return;
            } catch (firebaseError) {
                console.warn('⚠️ فشل تحميل Firebase:', firebaseError.message);
                
                // إذا فشل Firebase، حاول استخدام localStorage تلقائياً
                try {
                    await this.loadFromLocalStorage();
                    console.log('✅ تم تحميل بيانات القسم من localStorage');
                    return;
                } catch (localStorageError) {
                    console.warn('⚠️ فشل تحميل localStorage:', localStorageError.message);
                    throw new Error('لا توجد بيانات متاحة');
                }
            }
            
        } catch (error) {
            console.error('❌ خطأ في تحميل البيانات:', error);
            this.showError('حدث خطأ في تحميل البيانات. يرجى المحاولة مرة أخرى.');
        }
    }

    async loadFromFirebase() {
        return new Promise(async (resolve, reject) => {
            try {
                // 1. التحقق من وجود Firebase
                if (typeof firebase === 'undefined') {
                    throw new Error('Firebase SDK غير محمل');
                }
                
                // 2. تهيئة Firebase
                let db;
                try {
                    if (!firebase.apps.length) {
                        firebase.initializeApp(firebaseConfig);
                    }
                    db = firebase.firestore();
                } catch (initError) {
                    throw new Error('فشل تهيئة قاعدة البيانات');
                }
                
                if (!db) {
                    throw new Error('قاعدة البيانات غير متاحة');
                }
                
                // 3. جلب بيانات القسم
                const sectionDoc = await db.collection('sections').doc(this.currentSectionId).get();
                
                if (!sectionDoc.exists) {
                    throw new Error('القسم غير موجود');
                }
                
                this.section = {
                    id: sectionDoc.id,
                    ...sectionDoc.data()
                };
                
                // 4. تحديث معلومات القسم في الواجهة
                this.updateSectionInfo();
                
                // 5. جلب قنوات القسم
                const channelsQuery = db.collection('channels')
                    .where('sectionId', '==', this.currentSectionId)
                    .orderBy('order');
                
                const channelsSnapshot = await channelsQuery.get();
                
                if (channelsSnapshot.empty) {
                    console.log('ℹ️ لا توجد قنوات في هذا القسم');
                    this.channels = [];
                } else {
                    this.channels = channelsSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    console.log(`✅ تم تحميل ${this.channels.length} قناة للقسم`);
                }
                
                // 6. حفظ في localStorage كنسخة احتياطية
                this.saveToLocalStorage();
                
                // 7. عرض القنوات
                this.renderChannels();
                
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
                // 1. جلب الأقسام من localStorage
                const savedSections = localStorage.getItem('bein_sections');
                if (!savedSections) {
                    throw new Error('لا توجد بيانات محلية للأقسام');
                }
                
                const sections = JSON.parse(savedSections);
                this.section = sections.find(s => s.id === this.currentSectionId);
                
                if (!this.section) {
                    throw new Error('القسم غير موجود في البيانات المحلية');
                }
                
                // 2. تحديث معلومات القسم في الواجهة
                this.updateSectionInfo();
                
                // 3. جلب القنوات من localStorage
                const savedChannels = localStorage.getItem('bein_channels');
                if (savedChannels) {
                    const allChannels = JSON.parse(savedChannels);
                    this.channels = allChannels.filter(channel => channel.sectionId === this.currentSectionId);
                    
                    // ترتيب القنوات حسب الترتيب
                    this.channels.sort((a, b) => (a.order || 999) - (b.order || 999));
                    
                    console.log(`✅ تم تحميل ${this.channels.length} قناة من localStorage`);
                } else {
                    this.channels = [];
                }
                
                // 4. عرض القنوات
                this.renderChannels();
                
                resolve(true);
                
            } catch (error) {
                console.error('❌ فشل تحميل البيانات المحلية:', error);
                reject(error);
            }
        });
    }

    updateSectionInfo() {
        if (!this.section) return;
        
        document.getElementById('sectionName').textContent = this.section.name;
        document.getElementById('sectionHeader').textContent = this.section.name;
        
        if (this.section.description) {
            document.getElementById('sectionDescription').textContent = this.section.description;
        } else {
            document.getElementById('sectionDescription').textContent = `قسم ${this.section.name} - ${this.channels.length} قناة`;
        }
    }

    renderChannels() {
        const container = document.getElementById('channelsContainer');
        if (!container) {
            console.error('❌ حاوية القنوات غير موجودة');
            return;
        }

        // تصفية القنوات النشطة وترتيبها
        const activeChannels = this.channels
            .filter(channel => channel.isActive !== false)
            .sort((a, b) => (a.order || 1) - (b.order || 1));
        
        if (activeChannels.length === 0) {
            container.innerHTML = `
                <div class="loading" style="grid-column: 1 / -1;">
                    <i class="uil uil-tv-retro" style="font-size: 3rem; color: #6c757d;"></i>
                    <p class="mt-3">لا توجد قنوات متاحة في هذا القسم حالياً</p>
                    <small>سيتم إضافة قنوات قريباً</small>
                </div>
            `;
            return;
        }

        console.log(`🎯 عرض ${activeChannels.length} قناة في القسم`);
        
        // إنشاء HTML للقنوات
        container.innerHTML = activeChannels.map(channel => {
            const defaultImage = 'https://via.placeholder.com/200x100/2F2562/FFFFFF?text=TV';
            const channelImage = channel.image || defaultImage;
            
            return `
                <div class="channel-card" data-channel-id="${channel.id}">
                    <div class="channel-logo">
                        <img src="${channelImage}" alt="${channel.name}" 
                             onerror="this.src='${defaultImage}'">
                    </div>
                    <div class="channel-name">${channel.name}</div>
                    ${channel.description ? `<div class="channel-description">${channel.description}</div>` : ''}
                </div>
            `;
        }).join('');

        // إضافة مستمعي الأحداث للقنوات
        this.addChannelClickListeners();
        
        console.log('✅ تم عرض القنوات بنجاح');
    }

    addChannelClickListeners() {
        const channelCards = document.querySelectorAll('.channel-card');
        channelCards.forEach(card => {
            card.addEventListener('click', (e) => {
                const channelId = card.getAttribute('data-channel-id');
                this.handleChannelClick(channelId, e);
            });
        });
    }

    handleChannelClick(channelId, event) {
        event.preventDefault();
        event.stopPropagation();
        
        const channel = this.channels.find(c => c.id === channelId);
        if (!channel) return;
        
        console.log(`📺 نقر على القناة: ${channel.name}`);
        
        // التحقق من التثبيت
        if (!this.hasInstalledApp) {
            this.showInstallModal(channel);
        } else {
            this.openChannel(channel);
        }
    }

    showInstallModal(channel) {
        const modal = document.getElementById('installModal');
        const confirmBtn = document.getElementById('confirmInstall');
        const cancelBtn = document.getElementById('cancelInstall');
        
        // إزالة المستمعين السابقين
        confirmBtn.replaceWith(confirmBtn.cloneNode(true));
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));
        
        const newConfirmBtn = document.getElementById('confirmInstall');
        const newCancelBtn = document.getElementById('cancelInstall');
        
        // إضافة مستمعين جدد
        newConfirmBtn.addEventListener('click', () => {
            this.installApp(channel);
        });
        
        newCancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        // عرض المودال
        modal.style.display = 'block';
        
        // إغلاق المودال عند النقر خارج المحتوى
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    installApp(channel) {
        console.log('📱 تثبيت التطبيق...');
        
        const modal = document.getElementById('installModal');
        modal.style.display = 'none';
        
        // فتح رابط تحميل التطبيق
        const appUrl = channel.appUrl || 'https://play.google.com/store/apps/details?id=com.xpola.player';
        window.open(appUrl, '_blank');
        
        // تحديث حالة التثبيت
        this.hasInstalledApp = true;
        localStorage.setItem('app_installed', 'true');
        
        // فتح القناة بعد ثواني
        setTimeout(() => {
            this.openChannel(channel);
        }, 2000);
    }

    openChannel(channel) {
        console.log(`▶️ فتح القناة: ${channel.name}`);
        
        if (!channel.url || channel.url === '#') {
            this.showError('رابط البث غير متوفر حالياً');
            return;
        }
        
        // فتح رابط البث في نافذة جديدة
        window.open(channel.url, '_blank');
        
        // تسجيل النشاط
        this.logChannelView(channel);
    }

    logChannelView(channel) {
        try {
            // يمكنك إضافة كود لتسجيل المشاهدات هنا
            console.log(`📊 تسجيل مشاهدة القناة: ${channel.name}`);
        } catch (error) {
            console.warn('⚠️ فشل تسجيل المشاهدة:', error);
        }
    }

    showLoading() {
        const container = document.getElementById('channelsContainer');
        if (container) {
            container.innerHTML = `
                <div class="loading" style="grid-column: 1 / -1;">
                    <div class="spinner-border text-primary mb-3" role="status">
                        <span class="visually-hidden">جاري التحميل...</span>
                    </div>
                    <p>جاري تحميل القنوات...</p>
                    <small>يرجى الانتظار</small>
                </div>
            `;
        }
    }

    showError(message) {
        const container = document.getElementById('channelsContainer');
        if (container) {
            container.innerHTML = `
                <div class="loading" style="grid-column: 1 / -1;">
                    <i class="uil uil-exclamation-triangle" style="font-size: 3rem; color: #dc3545;"></i>
                    <p class="mt-3 text-danger">${message}</p>
                    <button class="btn btn-primary mt-3" onclick="location.reload()">
                        <i class="uil uil-redo"></i> إعادة المحاولة
                    </button>
                </div>
            `;
        }
    }

    saveToLocalStorage() {
        try {
            // لا نحتاج لحفظ شيء هنا لأن البيانات محفوظة مسبقاً في main.js
        } catch (error) {
            console.error('❌ خطأ في حفظ البيانات محلياً:', error);
        }
    }

    setupEventListeners() {
        // يمكن إضافة مستمعي أحداث إضافية هنا
    }

    async retryLoadData() {
        console.log('🔄 إعادة محاولة تحميل بيانات القسم...');
        await this.loadData();
    }
}

// بدء التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    console.log('📂 تهيئة صفحة القسم...');
    window.sectionApp = new SectionChannelsApp();
});

// دالة مساعدة للعودة للرئيسية
function goToIndexWithCheck() {
    window.location.href = 'index.html';
}

// دالة مساعدة للذهاب لجدول المباريات
function goToMatchesWithCheck() {
    window.location.href = 'matches.html';
}

// جعل الدوال متاحة عالمياً
window.reloadSectionData = function() {
    if (window.sectionApp) {
        window.sectionApp.retryLoadData();
    }
};
