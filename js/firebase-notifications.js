// js/firebase-notifications.js
// نظام الإشعارات المتوافق مع صفحة index.html

class FirebaseNotifications {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.db = null;
        this.init();
    }

    async init() {
        console.log('🔔 بدء نظام الإشعارات...');
        
        // تهيئة السنة في badge
        this.updateBadge();
        
        // تأخير بسيط لضمان تحميل Firebase SDK
        setTimeout(async () => {
            try {
                await this.initializeFirebase();
                await this.loadNotifications();
                this.renderNotifications();
                
                // التحقق من الإشعارات الجديدة للنظام المنبثق
                this.checkPopupNotifications();
                
            } catch (error) {
                console.error('❌ فشل تحميل الإشعارات:', error);
                this.loadFallbackNotifications();
                this.checkPopupNotifications();
            }
        }, 1000);
    }

    async initializeFirebase() {
        return new Promise((resolve, reject) => {
            try {
                console.log('🔥 محاولة تهيئة Firebase للإشعارات...');
                
                // التحقق من وجود Firebase SDK
                if (typeof firebase === 'undefined') {
                    throw new Error('Firebase SDK غير محمل');
                }
                
                // تكوين Firebase - تأكد من أن هذا التكوين صحيح
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
                let app;
                if (!firebase.apps.length) {
                    console.log('🚀 جاري تهيئة Firebase...');
                    app = firebase.initializeApp(firebaseConfig);
                } else {
                    console.log('✅ Firebase مهيأ بالفعل');
                    app = firebase.apps[0];
                }
                
                // تهيئة Firestore
                this.db = firebase.firestore();
                
                // تعيين إعدادات للتوافق
                this.db.settings({
                    ignoreUndefinedProperties: true
                });
                
                console.log('✅ Firebase للإشعارات مهيأ بنجاح');
                resolve(true);
                
            } catch (error) {
                console.error('❌ فشل تهيئة Firebase للإشعارات:', error);
                reject(error);
            }
        });
    }

    async loadNotifications() {
        try {
            console.log('📡 جاري جلب الإشعارات من Firebase...');
            
            if (!this.db) {
                throw new Error('Firestore غير مهيأ');
            }
            
            // استخدام استعلام مباشر بدون where أولاً للاختبار
            const snapshot = await this.db.collection('notifications').get();
            console.log(`📊 العدد الكلي للإشعارات: ${snapshot.size}`);
            
            if (snapshot.empty) {
                console.log('ℹ️ لا توجد إشعارات في قاعدة البيانات');
                this.notifications = []; // تأكد من إفراغ المصفوفة إذا كانت فارغة
                return [];
            }
            
            // تحويل البيانات
            this.notifications = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                console.log(`📝 إشعار: ${doc.id} - ${data.title || 'بدون عنوان'}`);
                
                // فقط الإشعارات النشطة
                if (data.isActive !== false) {
                    this.notifications.push({
                        id: doc.id,
                        title: data.title || 'إشعار',
                        message: data.message || '',
                        createdAt: data.createdAt || new Date(),
                        isRead: data.isRead || false,
                        isActive: data.isActive || true,
                        actionUrl: data.actionUrl || null,
                        type: data.type || 'info',
                        url: data.url || null,
                        linkText: data.linkText || 'عرض التفاصيل'
                    });
                }
            });
            
            // ترتيب حسب التاريخ (الأحدث أولاً)
            this.notifications.sort((a, b) => {
                const dateA = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                const dateB = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                return dateB - dateA;
            });
            
            console.log(`✅ تم تحميل ${this.notifications.length} إشعار نشط`);
            
            // حفظ نسخة محلية
            this.saveToLocalStorage();
            
            return this.notifications;
            
        } catch (error) {
            console.error('❌ فشل تحميل الإشعارات:', error);
            throw error;
        }
    }

    checkPopupNotifications() {
        // التحقق من وجود إشعارات جديدة لعرضها في النافذة المنبثقة
        if (window.notificationPopup && this.notifications.length > 0) {
            const unreadNotifications = this.notifications.filter(n => !n.isRead);
            
            if (unreadNotifications.length > 0) {
                // تأخير العرض لضمان تحميل الصفحة بالكامل
                setTimeout(() => {
                    const preferences = window.notificationPopup.userPreferences;
                    
                    // التحقق من تفضيلات المستخدم
                    if (!preferences.showPopup) {
                        console.log('ℹ️ عرض الإشعارات المنبثقة معطل حسب تفضيلات المستخدم');
                        return;
                    }
                    
                    // التحقق من التردد (المنطق الأصلي)
                    const lastPopupTime = localStorage.getItem('last_popup_time');
                    if (lastPopupTime) {
                        const now = Date.now();
                        const diff = now - parseInt(lastPopupTime);
                        
                        switch (preferences.showFrequency) {
                            case 'once_per_day':
                                if (diff < 24 * 60 * 60 * 1000) return;
                                break;
                            case 'once_per_hour':
                                if (diff < 60 * 60 * 1000) return;
                                break;
                        }
                    }
                    
                    // عرض أول إشعار غير مقروء
                    const notification = unreadNotifications[0];
                    if (!window.notificationPopup.hasNotificationBeenShown(notification.id)) {
                        window.notificationPopup.showPopup(notification);
                    }
                }, 2500);
            }
        }
    }

    loadFallbackNotifications() {
        console.log('💾 جاري تحميل الإشعارات من التخزين المحلي...');
        
        try {
            const saved = localStorage.getItem('bein_notifications_fixed');
            if (saved) {
                this.notifications = JSON.parse(saved);
                // تحويل تواريخ التخزين المحلي إلى كائنات Date
                this.notifications.forEach(n => {
                    if (typeof n.createdAt === 'string') {
                        n.createdAt = new Date(n.createdAt);
                    }
                });
                console.log(`📱 تم تحميل ${this.notifications.length} إشعار من التخزين المحلي`);
            } else {
                // إشعارات افتراضية
                this.notifications = [
                    {
                        id: 'default-1',
                        title: 'مرحباً بك في وسيل لايف برو',
                        message: 'تطبيق مشاهدة القنوات الفضائية',
                        createdAt: new Date(),
                        isRead: false,
                        isActive: true,
                        type: 'welcome'
                    }
                ];
            }
            
            this.renderNotifications();
            
        } catch (error) {
            console.error('❌ خطأ في تحميل الإشعارات المحلية:', error);
        }
    }

    saveToLocalStorage() {
        try {
            // قم بتحويل حقول التاريخ إلى سلسلة نصية للحفظ المحلي
            const serializableNotifications = this.notifications.map(n => ({
                ...n,
                createdAt: n.createdAt.toISOString ? n.createdAt.toISOString() : n.createdAt
            }));
            localStorage.setItem('bein_notifications_fixed', JSON.stringify(serializableNotifications));
        } catch (error) {
            console.error('❌ خطأ في حفظ الإشعارات محلياً:', error);
        }
    }

    renderNotifications() {
        const container = document.getElementById('notificationsList');
        if (!container) {
            console.error('❌ حاوية الإشعارات غير موجودة');
            return;
        }

        if (this.notifications.length === 0) {
            container.innerHTML = `
                <div class="notifications-empty">
                    <i class="uil uil-bell-slash"></i>
                    <p>لا توجد إشعارات حالياً</p>
                    <small>انقر لإعادة التحميل</small>
                </div>
            `;
            
            // إضافة إمكانية إعادة التحميل
            container.onclick = () => this.reloadNotifications();
            return;
        }
        
        // إزالة مستمع الحدث onclick من الحاوية إذا كان موجودًا
        container.onclick = null; 

        container.innerHTML = this.notifications.map(notification => {
            const isUnread = !notification.isRead;
            const timeAgo = this.formatTime(notification.createdAt);
            
            // استخدام actionUrl أو url
            const targetUrl = notification.actionUrl || notification.url;

            return `
                <div class="notification-item ${isUnread ? 'unread' : ''}" 
                     onclick="window.firebaseNotifications.markAsRead('${notification.id}')">
                    <div class="notification-title">
                        <span>${notification.title}</span>
                        <span class="notification-time">${timeAgo}</span>
                    </div>
                    <div class="notification-message">
                        ${notification.message}
                    </div>
                    ${targetUrl ? `
                        <div class="notification-actions">
                            <button onclick="event.stopPropagation(); window.open('${targetUrl}', '_blank')">
                                <i class="uil uil-external-link-alt"></i> ${notification.linkText || 'زيارة الرابط'}
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
        
        this.updateBadge();
    }

    formatTime(timestamp) {
        if (!timestamp) return 'قبل فترة';
        
        try {
            // التعامل مع كائنات Timestamp من Firestore
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);
            
            if (diffMins < 1) return 'الآن';
            if (diffMins < 60) return `قبل ${diffMins} دقيقة`;
            if (diffHours < 24) return `قبل ${diffHours} ساعة`;
            if (diffDays === 1) return 'أمس';
            if (diffDays < 7) return `قبل ${diffDays} يوم`;
            
            return date.toLocaleDateString('ar-SA');
        } catch (error) {
            return 'قبل فترة';
        }
    }

    updateBadge() {
        this.unreadCount = this.notifications.filter(n => !n.isRead).length;
        const badge = document.getElementById('unreadCount');
        if (badge) {
            badge.textContent = this.unreadCount;
            badge.style.display = this.unreadCount > 0 ? 'flex' : 'none';
            
            // عرض مؤشر الإشعارات الجديدة للنظام المنبثق
            if (window.notificationPopup && this.unreadCount > 0) {
                window.notificationPopup.showNewNotificationIndicator(this.unreadCount);
            }
        }
    }

    async markAsRead(notificationId) {
        try {
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification && !notification.isRead) {
                notification.isRead = true;
                
                // تحديث في Firebase إذا كان متصلاً
                if (this.db) {
                    await this.db.collection('notifications').doc(notificationId).update({
                        isRead: true,
                        readAt: new Date()
                    });
                }
                
                // تحديث محلياً
                this.saveToLocalStorage();
                this.updateBadge();
                this.renderNotifications();
                
                console.log(`✅ تم تحديد الإشعار كمقروء: ${notificationId}`);
            }
        } catch (error) {
            console.error('❌ خطأ في تحديد الإشعار كمقروء:', error);
        }
    }

    async markAllAsRead() {
        try {
            const unreadNotifications = this.notifications.filter(n => !n.isRead);
            
            if (unreadNotifications.length === 0) {
                alert('لا توجد إشعارات غير مقروءة');
                return;
            }
            
            if (confirm(`هل تريد تحديد ${unreadNotifications.length} إشعار كمقروء؟`)) {
                // تحديث محلياً
                unreadNotifications.forEach(n => n.isRead = true);
                
                // تحديث في Firebase
                if (this.db && unreadNotifications.length > 0) {
                    const batch = this.db.batch();
                    
                    unreadNotifications.forEach(notification => {
                        const ref = this.db.collection('notifications').doc(notification.id);
                        batch.update(ref, {
                            isRead: true,
                            readAt: new Date()
                        });
                    });
                    
                    await batch.commit();
                }
                
                // حفظ وتحديث
                this.saveToLocalStorage();
                this.updateBadge();
                this.renderNotifications();
                
                alert('تم تحديد جميع الإشعارات كمقروءة');
            }
        } catch (error) {
            console.error('❌ خطأ في تحديد جميع الإشعارات كمقروءة:', error);
            alert('حدث خطأ أثناء تحديث الإشعارات');
        }
    }

    async reloadNotifications() {
        try {
            const container = document.getElementById('notificationsList');
            if (container) {
                container.innerHTML = `
                    <div class="text-center py-3" style="text-align: center; padding: 20px;">
                        <div class="spinner-border text-primary" role="status">
                            <i class="uil uil-redo" style="font-size: 20px; color: #3f51b5;"></i>
                        </div>
                        <p class="mt-2" style="margin-top: 5px;">جاري إعادة تحميل الإشعارات...</p>
                    </div>
                `;
            }
            
            await this.loadNotifications();
            this.renderNotifications();
            this.checkPopupNotifications();
            
        } catch (error) {
            console.error('❌ فشل إعادة تحميل الإشعارات:', error);
            this.loadFallbackNotifications();
        }
    }

    toggleDropdown() {
        const dropdown = document.getElementById('notificationsDropdown');
        if (dropdown) {
            const isShowing = dropdown.classList.contains('show');
            dropdown.classList.toggle('show');
            
            // إذا كانت القائمة تظهر للمرة الأولى، أو كانت فارغة، قم بتحميل الإشعارات
            if (!isShowing && dropdown.classList.contains('show')) {
                // نادراً ما نحتاج إلى إعادة التحميل في كل مرة، لكن هذا يضمن تحديثها
                this.reloadNotifications();
            }
        }
    }
    
    // دالة جديدة لدعم النظام المنبثق
    showNotificationPopup(notification) {
        if (window.notificationPopup) {
            window.notificationPopup.showPopup(notification);
        } else {
            // بديل بسيط
            this.showSimplePopup(notification);
        }
    }
    
    showSimplePopup(notification) {
        // بديل بسيط للنافذة المنبثقة إذا لم يكن النظام المنبثق متاحاً
        const popup = document.createElement('div');
        popup.className = 'simple-notification-popup';
        popup.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: #333; color: white; padding: 15px; border-radius: 8px; z-index: 9999; box-shadow: 0 4px 8px rgba(0,0,0,0.4); direction: rtl;';
        popup.innerHTML = `
            <div class="simple-popup-content">
                <h5 style="margin: 0 0 5px 0; font-size: 16px;">${notification.title}</h5>
                <p style="margin: 0; font-size: 14px;">${notification.message}</p>
                <button onclick="this.parentElement.parentElement.remove()" style="background: #007bff; color: white; border: none; padding: 5px 10px; margin-top: 10px; cursor: pointer; border-radius: 4px;">موافق</button>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        setTimeout(() => {
            if (popup.parentElement) {
                popup.remove();
            }
        }, 5000);
    }
}

// تهيئة النظام عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 الصفحة الرئيسية محملة، جاري تهيئة الإشعارات...');
    window.firebaseNotifications = new FirebaseNotifications();
});
