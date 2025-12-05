// تطبيق عرض القسم
class SectionApp {
    constructor() {
        this.section = null;
        this.channels = [];
        this.sectionId = null;
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
            this.showError('لم يتم تحديد قسم. الرجاء العودة للصفحة الرئيسية واختيار قسم.', 'no-section-id');
            return;
        }
        
        // إعداد مستمعي الأحداث
        this.setupEventListeners();
        
        // محاولة تحميل البيانات
        await this.loadData();
    }

    async loadData() {
        console.log('📥 جاري تحميل البيانات...');
        let firebaseError = null;
        let localStorageError = null;
        
        try {
            // أولاً: محاولة التحميل من Firebase
            const firebaseLoaded = await this.tryLoadFromFirebase();
            
            if (firebaseLoaded) {
                console.log('✅ تم تحميل البيانات من Firebase');
                return;
            }
        } catch (error) {
            firebaseError = error;
            console.error('❌ فشل تحميل Firebase:', error);
        }
        
        try {
            // ثانياً: محاولة التحميل من التخزين المحلي
            const localStorageLoaded = await this.tryLoadFromLocalStorage();
            
            if (localStorageLoaded) {
                console.log('✅ تم تحميل البيانات من التخزين المحلي');
                return;
            }
        } catch (error) {
            localStorageError = error;
            console.error('❌ فشل تحميل localStorage:', error);
        }
        
        // إذا فشل كل شيء
        let errorMessage = 'فشل في تحميل البيانات. تأكد من اتصالك بالإنترنت.';
        if (firebaseError) {
            errorMessage += '<br>خطأ Firebase: ' + firebaseError.message;
        }
        if (localStorageError) {
            errorMessage += '<br>خطأ localStorage: ' + localStorageError.message;
        }
        this.showError(errorMessage, 'load-failed');
    }

    async tryLoadFromFirebase() {
        try {
            console.log('📡 جاري جلب البيانات من Firebase...');
            
            // تهيئة Firebase إذا لم تكن مهيأة
            if (!window.firebaseUtils || !window.firebaseUtils.isInitialized()) {
                console.log('🔧 جاري تهيئة Firebase...');
                await window.firebaseUtils.initializeFirebase();
            }
            
            const db = window.firebaseUtils.getDB();
            if (!db) {
                throw new Error('Firestore غير متاح');
            }
            
            // 1. جلب بيانات القسم
            const sectionDoc = await db.collection('sections').doc(this.sectionId).get();
            
            if (!sectionDoc.exists) {
                throw new Error('القسم غير موجود في قاعدة البيانات. تأكد من أن المعرف صحيح.');
            }
            
            this.section = {
                id: sectionDoc.id,
                ...sectionDoc.data()
            };
            
            console.log('✅ تم تحميل القسم:', this.section.name);
            
            // 2. جلب القنوات الخاصة بهذا القسم
            const channelsQuery = await db.collection('channels')
                .where('sectionId', '==', this.sectionId)
                .orderBy('order', 'asc')
                .get();
            
            if (!channelsQuery.empty) {
                this.channels = channelsQuery.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                console.log(`✅ تم تحميل ${this.channels.length} قناة`);
            } else {
                console.log('⚠️ لا توجد قنوات في هذا القسم');
                this.channels = [];
            }
            
            // 3. عرض البيانات
            this.displayData();
            return true;
            
        } catch (error) {
            console.warn('⚠️ فشل تحميل Firebase:', error.message);
            throw error;
        }
    }

    async tryLoadFromLocalStorage() {
        try {
            console.log('💾 جاري تحميل البيانات من التخزين المحلي...');
            
            // 1. جلب الأقسام من localStorage
            const savedSections = window.firebaseUtils ? window.firebaseUtils.loadFromLocalStorage('bein_sections') : null;
            if (!savedSections) {
                throw new Error('لا توجد بيانات محلية للأقسام');
            }
            
            // 2. البحث عن القسم المطلوب
            this.section = savedSections.find(s => s.id === this.sectionId);
            
            if (!this.section) {
                throw new Error('القسم غير موجود في البيانات المحلية');
            }
            
            console.log('✅ تم العثور على القسم في البيانات المحلية:', this.section.name);
            
            // 3. جلب القنوات من localStorage
            const savedChannels = window.firebaseUtils ? window.firebaseUtils.loadFromLocalStorage('bein_channels') : null;
            if (savedChannels) {
                this.channels = savedChannels.filter(channel => channel.sectionId === this.sectionId);
                console.log(`✅ تم تحميل ${this.channels.length} قناة من البيانات المحلية`);
            } else {
                this.channels = [];
            }
            
            // 4. عرض البيانات
            this.displayData();
            return true;
            
        } catch (error) {
            console.warn('⚠️ فشل تحميل البيانات المحلية:', error.message);
            throw error;
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

    showError(message, errorType) {
        console.error(`❌ خطأ (${errorType}):`, message);
        const container = document.getElementById('channelsContainer');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <i class="uil uil-exclamation-triangle" style="font-size: 3rem;"></i>
                    <h4 class="mt-3">حدث خطأ</h4>
                    <p>${message}</p>
                    <div class="mt-4">
                        <a href="index.html" class="btn btn-primary me-2">
                            <i class="uil uil-home"></i> العودة للرئيسية
                        </a>
                        <button onclick="window.location.reload()" class="btn btn-secondary">
                            <i class="uil uil-redo"></i> إعادة تحميل
                        </button>
                        <button onclick="sectionApp.loadData()" class="btn btn-warning mt-2">
                            <i class="uil uil-refresh"></i> إعادة تحميل البيانات
                        </button>
                    </div>
                </div>
            `;
        }
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

// بدء التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏠 صفحة القسم جاهزة للتشغيل');
    window.sectionApp = new SectionApp();
});
