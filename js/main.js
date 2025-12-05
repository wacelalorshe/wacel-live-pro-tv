// js/main.js

// تطبيق Bein Sport - الصفحة الرئيسية
class BeinSportApp {
    constructor() {
        this.sections = [];
        this.channels = [];
        this.currentSection = null;
        this.init();
    }

    async init() {
        console.log('🚀 بدء تشغيل تطبيق Bein Sport...');
        
        document.getElementById('currentYear').textContent = new Date().getFullYear();
        this.setupEventListeners();
        
        try {
            // تهيئة Firebase أولاً
            await initializeMainFirebase();
            console.log('✅ Firebase جاهز للاستخدام');
            
            // تحميل البيانات
            await this.loadData();
            
            console.log('✅ تم تهيئة التطبيق بنجاح');
        } catch (error) {
            console.error('❌ فشل تهيئة التطبيق:', error);
            this.showErrorState('فشل في الاتصال بقاعدة البيانات. جاري استخدام البيانات المحلية...');
            await this.loadFromLocalStorage();
        }
    }

    async loadData() {
        console.log('📥 جاري تحميل البيانات...');
        
        try {
            // محاولة التحميل من Firebase أولاً
            const firebaseLoaded = await this.loadFromFirebase();
            
            if (firebaseLoaded) {
                console.log('✅ تم تحميل البيانات من Firebase');
                this.renderData();
            } else {
                // إذا فشل Firebase، استخدم التخزين المحلي
                console.log('💾 تحميل البيانات من التخزين المحلي...');
                await this.loadFromLocalStorage();
                this.renderData();
            }
        } catch (error) {
            console.error('❌ خطأ في تحميل البيانات:', error);
            await this.loadFromLocalStorage();
            this.renderData();
        }
    }

    async loadFromFirebase() {
        if (!mainDb) {
            console.error('❌ Firestore غير مهيأ');
            return false;
        }

        try {
            console.log('📡 جاري جلب البيانات من Firebase...');
            
            // تحميل الأقسام - بدون شرط isActive أولاً
            let sectionsSnapshot;
            try {
                sectionsSnapshot = await mainDb.collection('sections')
                    .orderBy('order')
                    .get();
            } catch (error) {
                console.warn('⚠️ فشل في ترتيب الأقسام، جاري جلب بدون ترتيب:', error);
                sectionsSnapshot = await mainDb.collection('sections').get();
            }

            if (sectionsSnapshot.empty) {
                console.log('ℹ️ لا توجد أقسام في Firebase');
                return false;
            }

            this.sections = sectionsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log(`✅ تم تحميل ${this.sections.length} قسم من Firebase`);
            console.log('تفاصيل الأقسام:', this.sections);
            
            // تحميل القنوات
            const channelsSnapshot = await mainDb.collection('channels').get();
            if (!channelsSnapshot.empty) {
                this.channels = channelsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                console.log(`✅ تم تحميل ${this.channels.length} قناة من Firebase`);
            }
            
            // حفظ في localStorage للاستخدام المستقبلي
            this.saveToLocalStorage();
            
            return true;

        } catch (error) {
            console.error('❌ خطأ في تحميل البيانات من Firebase:', error);
            return false;
        }
    }

    async loadFromLocalStorage() {
        try {
            const savedSections = localStorage.getItem('bein_sections');
            const savedChannels = localStorage.getItem('bein_channels');
            
            if (savedSections) {
                this.sections = JSON.parse(savedSections);
                console.log(`✅ تم تحميل ${this.sections.length} قسم من localStorage`);
            }
            
            if (savedChannels) {
                this.channels = JSON.parse(savedChannels);
                console.log(`✅ تم تحميل ${this.channels.length} قناة من localStorage`);
            }
            
            if (this.sections.length === 0) {
                this.loadDefaultData();
            }
        } catch (error) {
            console.error('❌ خطأ في تحميل البيانات المحلية:', error);
            this.loadDefaultData();
        }
    }

    showErrorState(message) {
        const container = document.getElementById('sectionsContainer');
        if (container) {
            container.innerHTML = `
                <div class="loading">
                    <i class="uil uil-exclamation-triangle text-warning mb-3" style="font-size: 3rem;"></i>
                    <p>${message}</p>
                    <button class="btn btn-primary mt-2" onclick="app.retryLoadData()">
                        <i class="uil uil-redo"></i> إعادة المحاولة
                    </button>
                </div>
            `;
        }
    }

    renderData() {
        this.renderSections();
    }

    getActiveSections() {
        // عرض جميع الأقسام بغض النظر عن حالة isActive
        return this.sections
            .sort((a, b) => (a.order || 1) - (b.order || 1));
    }

    renderSections() {
        const container = document.getElementById('sectionsContainer');
        if (!container) {
            console.error('❌ حاوية الأقسام غير موجودة');
            return;
        }

        const activeSections = this.getActiveSections();
        
        if (activeSections.length === 0) {
            this.showErrorState('لا توجد أقسام متاحة حالياً');
            return;
        }

        console.log(`🎯 عرض ${activeSections.length} قسم في الواجهة`);
        
        // عرض الأقسام كبطاقات مع روابط فردية لكل قسم
        container.innerHTML = `
            <div class="sections-grid">
                ${activeSections.map(section => {
                    const channelCount = this.getChannelsCount(section.id);
                    const sectionLink = `section.html?id=${section.id}`;
                    
                    return `
                        <a href="${sectionLink}" class="section-card" data-section-id="${section.id}">
                            <div class="section-card-link">
                                ${section.image ? `
                                    <div class="section-image">
                                        <img src="${section.image}" alt="${section.name}" 
                                             onerror="this.src='https://via.placeholder.com/200x150/2F2562/FFFFFF?text=No+Image'">
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

        // إضافة event listeners للأقسام بعد عرضها
        this.setupSectionEventListeners();
    }

    setupSectionEventListeners() {
        const sectionCards = document.querySelectorAll('.section-card');
        sectionCards.forEach(card => {
            card.addEventListener('click', (e) => {
                const sectionId = card.getAttribute('data-section-id');
                console.log('🎯 تم النقر على القسم:', sectionId);
                
                // السماح للرابط بالعمل بشكل طبيعي (سيذهب إلى section.html)
                // لا حاجة لمنع السلوك الافتراضي
            });
        });
    }

    // دالة جديدة: الحصول على عدد القنوات في القسم
    getChannelsCount(sectionId) {
        return this.channels.filter(channel => channel.sectionId === sectionId).length;
    }

    showSection(sectionId) {
        console.log('📂 محاولة عرض القسم:', sectionId);
        
        const section = this.sections.find(s => s.id === sectionId);
        if (!section) {
            console.error('❌ القسم غير موجود:', sectionId);
            return;
        }

        this.currentSection = section;
        
        // تحديث واجهة قسم القنوات
        document.getElementById('sectionHeader').textContent = section.name;
        document.getElementById('sectionName').textContent = section.name;
        document.getElementById('sectionDescription').textContent = section.description || 'استمتع بمشاهدة القنوات المتاحة في هذا القسم';
        
        // عرض القنوات
        this.renderSectionChannels(sectionId);
        
        // الانتقال لصفحة القسم
        showPage('sectionPage');
    }

    renderSectionChannels(sectionId) {
        const container = document.getElementById('channelsContainer');
        if (!container) {
            console.error('❌ حاوية القنوات غير موجودة');
            return;
        }

        const sectionChannels = this.channels
            .filter(channel => channel.sectionId === sectionId)
            .sort((a, b) => (a.order || 1) - (b.order || 1));

        console.log(`📺 عرض ${sectionChannels.length} قناة في قسم ${sectionId}`);

        if (sectionChannels.length === 0) {
            container.innerHTML = '<div class="loading">لا توجد قنوات في هذا القسم</div>';
            return;
        }

        container.innerHTML = sectionChannels.map(channel => `
            <div class="channel-card" data-channel-id="${channel.id}">
                <div class="channel-logo">
                    <img src="${channel.image || 'https://via.placeholder.com/200x100/2F2562/FFFFFF?text=No+Image'}" 
                         alt="${channel.name}"
                         onerror="this.src='https://via.placeholder.com/200x100/2F2562/FFFFFF?text=No+Image'">
                </div>
                <div class="channel-name">${channel.name}</div>
            </div>
        `).join('');

        this.setupChannelEventListeners(sectionChannels);
    }

    setupChannelEventListeners(sectionChannels) {
        document.querySelectorAll('.channel-card').forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const channelId = card.getAttribute('data-channel-id');
                const channel = sectionChannels.find(c => c.id === channelId);
                if (channel) {
                    console.log('🔗 فتح القناة:', channel.name);
                    this.openChannel(channel);
                }
            });
        });
    }

    openChannel(channel) {
        if (channel.url && channel.url !== '#' && channel.url.trim() !== '') {
            try {
                window.open(channel.url, '_blank');
            } catch (error) {
                console.error('❌ خطأ في فتح الرابط:', error);
                this.showInstallModal(channel);
            }
        } else {
            this.showInstallModal(channel);
        }
    }

    showInstallModal(channel) {
        const modal = document.getElementById('installModal');
        if (modal) {
            modal.style.display = "block";
            const confirmBtn = document.getElementById('confirmInstall');
            if (confirmBtn) {
                confirmBtn.onclick = () => {
                    const downloadUrl = channel.downloadUrl || channel.appUrl || 'https://play.google.com/store/apps/details?id=com.xpola.player';
                    window.open(downloadUrl, '_blank');
                    this.closeModal();
                };
            }
        }
    }

    closeModal() {
        const modal = document.getElementById('installModal');
        if (modal) modal.style.display = "none";
    }

    setupEventListeners() {
        console.log('🔧 إعداد مستمعي الأحداث...');

        window.addEventListener('click', (event) => {
            if (event.target === document.getElementById('installModal')) {
                this.closeModal();
            }
        });

        const confirmInstall = document.getElementById('confirmInstall');
        if (confirmInstall) {
            confirmInstall.addEventListener('click', () => {
                window.open('https://play.google.com/store/apps/details?id=com.xpola.player', '_blank');
                this.closeModal();
            });
        }

        const cancelInstall = document.getElementById('cancelInstall');
        if (cancelInstall) {
            cancelInstall.addEventListener('click', () => {
                this.closeModal();
            });
        }
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

    loadDefaultData() {
        console.log('📋 استخدام البيانات الافتراضية...');
        
        this.sections = [{
            id: 'default-1',
            name: 'قنوات بي إن سبورت',
            order: 1,
            isActive: true,
            description: 'جميع قنوات بي إن سبورت الرياضية',
            image: 'https://via.placeholder.com/200x150/2F2562/FFFFFF?text=BEIN+SPORT'
        }, {
            id: 'default-2', 
            name: 'القنوات الرياضية',
            order: 2,
            isActive: true,
            description: 'أفضل القنوات الرياضية',
            image: 'https://via.placeholder.com/200x150/2F2562/FFFFFF?text=SPORTS'
        }];
        
        this.channels = [
            {
                id: 'default-1',
                name: 'bein sport 1',
                image: 'https://via.placeholder.com/200x100/2F2562/FFFFFF?text=BEIN+1',
                url: '#',
                appUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player',
                downloadUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player',
                order: 1,
                sectionId: 'default-1'
            },
            {
                id: 'default-2',
                name: 'bein sport 2', 
                image: 'https://via.placeholder.com/200x100/2F2562/FFFFFF?text=BEIN+2',
                url: '#',
                appUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player',
                downloadUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player',
                order: 2,
                sectionId: 'default-1'
            }
        ];
        
        this.saveToLocalStorage();
    }

    async retryLoadData() {
        console.log('🔄 إعادة محاولة تحميل البيانات...');
        await this.loadData();
    }
}

// Global Functions
function showPage(pageId) {
    // إخفاء جميع الصفحات
    document.getElementById('mainPage').style.display = 'none';
    document.getElementById('sectionPage').style.display = 'none';
    
    // إظهار الصفحة المطلوبة
    document.getElementById(pageId).style.display = 'block';
}

// بدء التطبيق
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏠 تهيئة التطبيق...');
    window.app = new BeinSportApp();
});
