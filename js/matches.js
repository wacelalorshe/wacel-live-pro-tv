// matches.js - تطبيق صفحة المباريات

class MatchesApp {
    constructor() {
        this.matches = [];
        this.firebaseConfig = {
            apiKey: "AIzaSyCqE7ZwveHg1dIhYf1Hlo7OpHyCZudeZvM",
            authDomain: "wacel-live.firebaseapp.com",
            databaseURL: "https://wacel-live-default-rtdb.asia-southeast1.firebasedatabase.app",
            projectId: "wacel-live",
            storageBucket: "wacel-live.firebasestorage.app",
            messagingSenderId: "185108554006",
            appId: "1:185108554006:web:93171895b1d4bb07c6f037"
        };
        this.db = null;
        this.firebaseApp = null;
        this.init();
    }

    async init() {
        console.log('🚀 بدء تشغيل صفحة المباريات...');
        
        // تعيين السنة الحالية
        document.getElementById('currentYear').textContent = new Date().getFullYear();
        
        // تعيين التواريخ
        this.setDates();
        
        // محاولة تحميل البيانات
        await this.loadData();
    }

    setDates() {
        const today = new Date();
        
        // التاريخ الميلادي
        const gregDate = today.toLocaleDateString('ar-AR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        document.getElementById('greg-date').textContent = gregDate;
        
        // يمكن إضافة التاريخ الهجري هنا إذا كان لديك مكتبة للتحويل
        // document.getElementById('hijri-date').textContent = '...';
    }

    async loadData() {
        console.log('📥 جاري تحميل المباريات...');
        
        // عرض حالة التحميل
        this.showLoading();
        
        try {
            // محاولة التحميل من Firebase
            const firebaseLoaded = await this.tryLoadFromFirebase();
            
            if (firebaseLoaded) {
                console.log('✅ تم تحميل المباريات من Firebase');
                return;
            }
            
            // إذا فشل Firebase، حاول من localStorage
            const localStorageLoaded = await this.tryLoadFromLocalStorage();
            
            if (localStorageLoaded) {
                console.log('✅ تم تحميل المباريات من التخزين المحلي');
                this.showInfoMessage('يتم عرض البيانات المخزنة مسبقاً. تحقق من اتصال الإنترنت للبيانات الحالية.');
                return;
            }
            
            // إذا فشل كل شيء
            this.showError('فشل في تحميل المباريات. تأكد من اتصالك بالإنترنت.');
            
        } catch (error) {
            console.error('❌ خطأ غير متوقع:', error);
            this.showError('حدث خطأ غير متوقع: ' + error.message);
        }
    }

    async tryLoadFromFirebase() {
        return new Promise((resolve, reject) => {
            try {
                console.log('📡 جاري جلب المباريات من Firebase...');
                
                // 1. التحقق من وجود Firebase
                if (typeof firebase === 'undefined') {
                    console.error('❌ Firebase SDK غير محمل');
                    reject(new Error('Firebase SDK غير محمل'));
                    return;
                }
                
                // 2. تهيئة Firebase
                try {
                    // تهيئة Firebase إذا لم يكن مهيأ
                    if (!firebase.apps.length) {
                        this.firebaseApp = firebase.initializeApp(this.firebaseConfig);
                        console.log('✅ تم تهيئة Firebase بنجاح');
                    } else {
                        this.firebaseApp = firebase.apps[0];
                        console.log('✅ Firebase مهيأ مسبقاً');
                    }
                    
                    this.db = firebase.database(this.firebaseApp);
                    
                } catch (initError) {
                    console.error('❌ فشل تهيئة Firebase:', initError);
                    reject(initError);
                    return;
                }
                
                if (!this.db) {
                    reject(new Error('قاعدة البيانات غير متاحة'));
                    return;
                }
                
                console.log('✅ Firebase Realtime Database جاهز للاستخدام');
                
                // 3. جلب المباريات
                this.db.ref('matches').on('value', (snapshot) => {
                    this.handleMatchesSnapshot(snapshot);
                    resolve(true);
                }, (error) => {
                    console.error('❌ فشل جلب المباريات:', error);
                    reject(error);
                });
                
            } catch (error) {
                console.error('❌ فشل تحميل Firebase:', error);
                reject(error);
            }
        });
    }

    handleMatchesSnapshot(snapshot) {
        const container = document.getElementById('matchesContainer');
        
        if (!snapshot.exists()) {
            container.innerHTML = `
                <div class="loading">
                    <i class="uil uil-calendar-slash" style="font-size: 3rem; color: #6c757d;"></i>
                    <p class="mt-3">لا توجد مباريات اليوم</p>
                    <small>سيتم إضافة مباريات قريباً</small>
                </div>
            `;
            return;
        }
        
        const matchesData = snapshot.val();
        this.matches = [];
        
        // تحويل البيانات إلى مصفوفة
        for (const key in matchesData) {
            this.matches.push({
                id: key,
                ...matchesData[key]
            });
        }
        
        console.log(`✅ تم تحميل ${this.matches.length} مباراة`);
        
        // حفظ في localStorage كنسخة احتياطية
        this.saveToLocalStorage();
        
        // عرض المباريات
        this.renderMatches();
    }

    async tryLoadFromLocalStorage() {
        return new Promise((resolve, reject) => {
            try {
                console.log('💾 جاري تحميل المباريات من التخزين المحلي...');
                
                const savedMatches = localStorage.getItem('bein_matches');
                if (!savedMatches) {
                    reject(new Error('لا توجد مباريات مخزنة محلياً'));
                    return;
                }
                
                this.matches = JSON.parse(savedMatches);
                console.log(`✅ تم تحميل ${this.matches.length} مباراة من التخزين المحلي`);
                
                this.renderMatches();
                resolve(true);
                
            } catch (error) {
                console.error('❌ فشل تحميل البيانات المحلية:', error);
                reject(error);
            }
        });
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('bein_matches', JSON.stringify(this.matches));
            console.log('💾 تم حفظ المباريات في التخزين المحلي');
        } catch (error) {
            console.error('❌ خطأ في حفظ البيانات محلياً:', error);
        }
    }

    showLoading() {
        const container = document.getElementById('matchesContainer');
        if (container) {
            container.innerHTML = `
                <div class="loading">
                    <div class="spinner-border text-primary mb-3" role="status">
                        <span class="visually-hidden">جاري التحميل...</span>
                    </div>
                    <p>جاري تحميل المباريات...</p>
                    <small>يرجى الانتظار</small>
                </div>
            `;
        }
    }

    renderMatches() {
        const container = document.getElementById('matchesContainer');
        
        if (!this.matches || this.matches.length === 0) {
            container.innerHTML = `
                <div class="loading">
                    <i class="uil uil-calendar-slash" style="font-size: 3rem; color: #6c757d;"></i>
                    <p class="mt-3">لا توجد مباريات اليوم</p>
                    <small>سيتم إضافة مباريات قريباً</small>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.matches.map(match => `
            <div class="match-box" data-match-id="${match.id}">
                <div class="match-info">
                    <div class="team">
                        <img src="${match.team1Logo || 'https://via.placeholder.com/60x60/2F2562/FFFFFF?text=T1'}" 
                             alt="${match.team1 || 'فريق 1'}" 
                             class="team-logo"
                             onerror="this.src='https://via.placeholder.com/60x60/2F2562/FFFFFF?text=T1'">
                        <div class="team-name">${match.team1 || 'فريق 1'}</div>
                    </div>
                    
                    <div class="match-time">${match.time || '00:00'}</div>
                    
                    <div class="team">
                        <img src="${match.team2Logo || 'https://via.placeholder.com/60x60/2F2562/FFFFFF?text=T2'}" 
                             alt="${match.team2 || 'فريق 2'}" 
                             class="team-logo"
                             onerror="this.src='https://via.placeholder.com/60x60/2F2562/FFFFFF?text=T2'">
                        <div class="team-name">${match.team2 || 'فريق 2'}</div>
                    </div>
                </div>
                
                <div class="match-details">
                    <div class="detail-item">
                        <div class="detail-label">القناة</div>
                        <div class="detail-value">${match.channel || 'قناة غير محددة'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">المعلق</div>
                        <div class="detail-value">${match.commentator || 'معلق غير محدد'}</div>
                    </div>
                </div>
                
                <div class="match-actions">
                    <button class="match-button watch" onclick="window.matchesApp.watchMatch('${match.xmtvLink || 'https://play.google.com/store/apps/details?id=com.xpola.player'}')">
                        <i class="uil uil-play-circle"></i>
                        مشاهدة المباراة
                    </button>
                    <button class="match-button download" onclick="window.open('https://play.google.com/store/apps/details?id=com.xpola.player', '_blank')">
                        <i class="uil uil-download-alt"></i>
                        تحميل المشغل
                    </button>
                </div>
            </div>
        `).join('');
        
        console.log('✅ تم عرض المباريات بنجاح');
    }

    watchMatch(link) {
        if (!link) {
            this.showAlert('رابط المباراة غير متاح حالياً', 'warning');
            return;
        }
        
        console.log('🔗 فتح رابط المباراة:', link);
        
        // إذا كان الرابط لتطبيق xmtv
        if (link.includes('xmtv') || link.includes('xpola')) {
            // محاولة فتح التطبيق
            window.location.href = link;
            
            // إذا فشل فتح التطبيق، افتح متجر التطبيقات
            setTimeout(() => {
                window.open('https://play.google.com/store/apps/details?id=com.xpola.player', '_blank');
            }, 1000);
        } else {
            // فتح الرابط في نافذة جديدة
            window.open(link, '_blank');
        }
    }

    showError(message) {
        const container = document.getElementById('matchesContainer');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <i class="uil uil-exclamation-triangle" style="font-size: 3rem; color: #ff6b6b;"></i>
                    <h4 class="mt-3" style="color: #ff6b6b;">حدث خطأ</h4>
                    <p>${message}</p>
                    <div class="mt-4">
                        <button onclick="window.location.reload()" class="btn btn-primary me-2">
                            <i class="uil uil-redo"></i> إعادة تحميل الصفحة
                        </button>
                        <button onclick="window.matchesApp.loadData()" class="btn btn-warning">
                            <i class="uil uil-refresh"></i> إعادة تحميل البيانات
                        </button>
                    </div>
                </div>
            `;
        }
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
        
        // إزالة الرسالة بعد 5 ثواني
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
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
}

// بدء التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏀 صفحة المباريات جاهزة للتشغيل');
    window.matchesApp = new MatchesApp();
});

// جعل الدوال متاحة عالمياً
window.reloadMatchesData = function() {
    if (window.matchesApp) {
        window.matchesApp.loadData();
    }
};
