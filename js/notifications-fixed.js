// js/notifications-fixed.js
// نظام الإشعارات المعدل والمبسط

class FirebaseNotifications {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.db = null;
        this.firebaseApp = null;
        this.realtimeListener = null;
        this.init();
    }

    async init() {
        console.log('🔔 بدء نظام الإشعارات...');
        
        // تحميل الإشعارات المحلية أولاً
        this.loadFromLocalStorage();
        
        try {
            // محاولة الاتصال بـ Firebase
            await this.initializeFirebase();
            
            // تحميل الإشعارات من Firebase
            await this.loadNotifications();
            
            // بدء الـ Realtime Listener
            this.setupRealtimeListener();
            
            console.log('✅ نظام الإشعارات جاهز');
        } catch (error) {
            console.error('❌ فشل تهيئة الإشعارات:', error);
            console.log('⚠️ سيتم استخدام الإشعارات المحلية فقط');
        }
        
        // إعداد النقر خارج القائمة
        this.setupClickOutside();
    }

    async initializeFirebase() {
        return new Promise((resolve, reject) => {
            try {
                console.log('🔥 محاولة تهيئة Firebase...');
                
                if (typeof firebase === 'undefined') {
                    throw new Error('Firebase SDK غير محمل');
                }
                
                // استخدام نفس التكوين من main.js
                const firebaseConfig = {
                    apiKey: "AIzaSyAkgEiYYlmpMe0NLewulheovlTQMz5C980",
                    authDomain: "bein-42f9e.firebaseapp.com",
                    projectId: "bein-42f9e",
                    storageBucket: "bein-42f9e.firebasestorage.app",
                    messagingSenderId: "143741167050",
                    appId: "1:143741167050:web:922d3a0cddb40f67b21b33",
                    measurementId: "G-JH198SKCFS"
                };
                
                // التحقق من وجود تطبيقات Firebase
                console.log('عدد تطبيقات Firebase:', firebase.apps.length);
                
                let app;
                if (firebase.apps.length === 0) {
                    console.log('🚀 إنشاء تطبيق Firebase جديد...');
                    app = firebase.initializeApp(firebaseConfig, 'BeinNotifications');
                } else {
                    console.log('✅ استخدام تطبيق Firebase موجود');
                    // استخدام التطبيق الأول
                    app = firebase.apps[0];
                    
                    // أو إنشاء تطبيق جديد باسم مختلف
                    try {
                        app = firebase.initializeApp(firebaseConfig, 'BeinNotifications_' + Date.now());
                    } catch (e) {
                        // إذا فشل، استخدم التطبيق الأول
                        app = firebase.apps[0];
                    }
                }
                
                this.firebaseApp = app;
                this.db = firebase.firestore(app);
                
                // إعدادات Firestore
                if (this.db.settings) {
                    this.db.settings({
                        cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
                    });
                }
                
                console.log('✅ Firebase مهيأ بنجاح');
                resolve(true);
                
            } catch (error) {
                console.error('❌ فشل تهيئة Firebase:', error);
                reject(error);
            }
        });
    }

    async loadNotifications() {
        try {
            console.log('📡 جاري جلب الإشعارات...');
            
            if (!this.db) {
                throw new Error('Firestore غير متاح');
            }
            
            // جلب الإشعارات مع محاولة ترتيبها
            let snapshot;
            try {
                snapshot = await this.db.collection('notifications')
                    .where('isActive', '==', true)
                    .orderBy('createdAt', 'desc')
                    .limit(20)
                    .get();
            } catch (orderError) {
                console.warn('⚠️ فشل الترتيب، جاري جلب بدون ترتيب:', orderError);
                snapshot = await this.db.collection('notifications')
                    .where('isActive', '==', true)
                    .limit(20)
                    .get();
            }
            
            if (!snapshot || snapshot.empty) {
                console.log('ℹ️ لا توجد إشعارات في قاعدة البيانات');
                return [];
            }
            
            const notifications = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                console.log(`📝 إشعار ${doc.id}:`, data.title || 'بدون عنوان');
                
                notifications.push({
                    id: doc.id,
                    title: data.title || 'إشعار',
                    message: data.message || '',
                    createdAt: data.createdAt || new Date(),
                    isRead: data.isRead || false,
                    isActive: data.isActive !== false,
                    type: data.type || 'info',
                    url: data.url || null,
                    actionUrl: data.actionUrl || null,
                    linkText: data.linkText || 'عرض التفاصيل'
                });
            });
            
            // تحديث القائمة
            this.notifications = notifications;
            console.log(`✅ تم تحميل ${this.notifications.length} إشعار`);
            
            // حفظ محلياً
            this.saveToLocalStorage();
            
            // تحديث العرض
            this.renderNotifications();
            
            return this.notifications;
            
        } catch (error) {
            console.error('❌ فشل تحميل الإشعارات:', error);
            
            // استخدام البيانات المحلية كبديل
            this.loadFromLocalStorage();
            throw error;
        }
    }

    setupRealtimeListener() {
        try {
            if (!this.db) {
                console.log('⚠️ Firestore غير متاح للـ Realtime Listener');
                return;
            }
            
            console.log('👂 بدء الاستماع للإشعارات الجديدة...');
            
            // إلغاء أي listener سابق
            if (this.realtimeListener) {
                this.realtimeListener();
            }
            
            this.realtimeListener = this.db.collection('notifications')
                .where('isActive', '==', true)
                .onSnapshot((snapshot) => {
                    console.log('📡 حدث تغيير في الإشعارات');
                    
                    snapshot.docChanges().forEach((change) => {
                        const data = change.doc.data();
                        const notification = {
                            id: change.doc.id,
                            title: data.title || 'إشعار جديد',
                            message: data.message || '',
                            createdAt: data.createdAt || new Date(),
                            isRead: data.isRead || false,
                            isActive: data.isActive !== false,
                            type: data.type || 'info',
                            url: data.url || null,
                            actionUrl: data.actionUrl || null,
                            linkText: data.linkText || 'عرض التفاصيل'
                        };
                        
                        if (change.type === 'added') {
                            console.log('🆕 إشعار جديد تمت إضافته:', notification.title);
                            this.handleNewNotification(notification);
                        } else if (change.type === 'modified') {
                            console.log('✏️ إشعار معدل:', notification.title);
                            this.handleUpdatedNotification(notification);
                        }
                    });
                }, (error) => {
                    console.error('❌ خطأ في الـ Realtime Listener:', error);
                    console.log('🔄 إعادة المحاولة بعد 5 ثواني...');
                    
                    // إعادة المحاولة بعد تأخير
                    setTimeout(() => {
                        this.setupRealtimeListener();
                    }, 5000);
                });
                
            console.log('✅ الـ Realtime Listener يعمل الآن');
            
        } catch (error) {
            console.error('❌ فشل إعداد الـ Realtime Listener:', error);
        }
    }

    handleNewNotification(notification) {
        // التحقق من عدم وجود الإشعار مسبقاً
        const existingIndex = this.notifications.findIndex(n => n.id === notification.id);
        
        if (existingIndex === -1) {
            // إضافة الإشعار في البداية
            this.notifications.unshift(notification);
            
            // حفظ محلياً
            this.saveToLocalStorage();
            
            // تحديث العرض
            this.updateBadge();
            
            // إعادة تحميل القائمة إذا كانت مفتوحة
            if (this.isDropdownOpen()) {
                this.renderNotifications();
            }
            
            // عرض تنبيهات للمستخدم
            if (!notification.isRead) {
                this.alertUser(notification);
            }
            
            console.log(`✅ تمت إضافة إشعار جديد: ${notification.title}`);
        }
    }

    handleUpdatedNotification(notification) {
        // تحديث الإشعار الموجود
        const index = this.notifications.findIndex(n => n.id === notification.id);
        if (index !== -1) {
            this.notifications[index] = notification;
            this.saveToLocalStorage();
            
            if (this.isDropdownOpen()) {
                this.renderNotifications();
            }
            
            this.updateBadge();
        }
    }

    alertUser(notification) {
        console.log('🔔 تنبيه المستخدم بإشعار جديد:', notification.title);
        
        // 1. تحديث العداد
        this.updateBadge();
        
        // 2. عرض نافذة منبثقة
        this.showFloatingNotification(notification);
        
        // 3. صوت تنبيه
        this.playNotificationSound();
        
        // 4. هزاز الأيقونة
        this.vibrateIcon();
        
        // 5. مؤشر الإشعارات الجديدة
        this.showNewNotificationIndicator();
        
        // 6. إشعارات سطح المكتب (إذا كان مسموحاً)
        this.showDesktopNotification(notification);
    }

    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('bein_notifications');
            if (saved) {
                this.notifications = JSON.parse(saved);
                console.log(`📱 تم تحميل ${this.notifications.length} إشعار من التخزين المحلي`);
                
                // تحديث العرض
                this.renderNotifications();
                return true;
            }
        } catch (error) {
            console.error('❌ خطأ في تحميل الإشعارات المحلية:', error);
        }
        
        // إذا لم توجد بيانات محلية
        this.notifications = [];
        return false;
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('bein_notifications', JSON.stringify(this.notifications));
            console.log('💾 تم حفظ الإشعارات في التخزين المحلي');
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
                    <small>سيتم إشعارك بأي تحديثات جديدة</small>
                </div>
            `;
            this.updateBadge();
            return;
        }

        container.innerHTML = this.notifications.map(notification => {
            const isUnread = !notification.isRead;
            const timeAgo = this.formatTime(notification.createdAt);
            const icon = this.getNotificationIcon(notification.type);
            
            return `
                <div class="notification-item ${isUnread ? 'unread' : ''}" 
                     onclick="window.notifications.markAsRead('${notification.id}')">
                    <div class="notification-title">
                        <span><i class="${icon} me-2"></i> ${notification.title}</span>
                        <span class="notification-time">${timeAgo}</span>
                    </div>
                    <div class="notification-message">
                        ${notification.message}
                    </div>
                    ${notification.url || notification.actionUrl ? `
                        <div class="notification-actions">
                            <button onclick="event.stopPropagation(); window.open('${notification.url || notification.actionUrl}', '_blank')">
                                <i class="uil uil-external-link-alt"></i> ${notification.linkText || 'عرض التفاصيل'}
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
        
        this.updateBadge();
    }

    getNotificationIcon(type) {
        switch(type) {
            case 'welcome': return 'uil uil-smile';
            case 'info': return 'uil uil-info-circle';
            case 'warning': return 'uil uil-exclamation-triangle';
            case 'success': return 'uil uil-check-circle';
            case 'error': return 'uil uil-times-circle';
            case 'match': return 'uil uil-football';
            case 'channel': return 'uil uil-play-circle';
            default: return 'uil uil-bell';
        }
    }

    formatTime(timestamp) {
        if (!timestamp) return 'قبل فترة';
        
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);
            
            if (diffMins < 1) return 'الآن';
            if (diffMins < 60) return `قبل ${diffMins} دقيقة`;
            if (diffHours < 24) return `قبل ${diffHours} ساعة`;
            if (diffDays < 7) return `قبل ${diffDays} يوم`;
            
            return date.toLocaleDateString('ar-SA');
        } catch (error) {
            return 'قبل فترة';
        }
    }

    updateBadge() {
        this.unreadCount = this.notifications.filter(n => !n.isRead).length;
        const badge = document.getElementById('unreadBadge');
        
        if (badge) {
            badge.textContent = this.unreadCount;
            badge.style.display = this.unreadCount > 0 ? 'flex' : 'none';
            
            // إضافة تأثير للعداد
            if (this.unreadCount > 0) {
                badge.classList.add('pulse');
                setTimeout(() => badge.classList.remove('pulse'), 1000);
            }
        }
    }

    playNotificationSound() {
        try {
            // إنشاء صوت تنبيه بسيط باستخدام Web Audio API
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
            
        } catch (error) {
            console.log('⚠️ لا يمكن تشغيل الصوت');
        }
    }

    vibrateIcon() {
        const btn = document.querySelector('.notifications-btn');
        if (btn) {
            btn.classList.add('vibrate');
            setTimeout(() => btn.classList.remove('vibrate'), 1000);
        }
    }

    showFloatingNotification(notification) {
        // إزالة أي نوافذ سابقة
        const oldPopups = document.querySelectorAll('.floating-notification');
        oldPopups.forEach(popup => popup.remove());
        
        const popup = document.createElement('div');
        popup.className = 'floating-notification';
        
        const icon = this.getNotificationIcon(notification.type);
        const timeAgo = this.formatTime(notification.createdAt);
        
        popup.innerHTML = `
            <div class="floating-notification-header">
                <div class="floating-notification-title">
                    <i class="${icon}"></i>
                    <span>${notification.title}</span>
                </div>
                <button class="floating-notification-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="uil uil-times"></i>
                </button>
            </div>
            <div class="floating-notification-body">
                ${notification.message}
            </div>
            <div class="floating-notification-time">
                <i class="uil uil-clock"></i> ${timeAgo}
            </div>
            <div class="floating-notification-actions">
                <button onclick="window.notifications.markAsRead('${notification.id}'); this.parentElement.parentElement.remove()">
                    <i class="uil uil-check"></i> موافق
                </button>
                ${notification.url ? `
                    <button onclick="window.open('${notification.url}', '_blank')">
                        <i class="uil uil-external-link-alt"></i> التفاصيل
                    </button>
                ` : ''}
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // إظهار النافذة
        setTimeout(() => popup.classList.add('show'), 100);
        
        // إخفاؤها بعد 8 ثواني
        setTimeout(() => {
            if (popup.parentNode) {
                popup.classList.remove('show');
                setTimeout(() => {
                    if (popup.parentNode) {
                        popup.remove();
                    }
                }, 500);
            }
        }, 8000);
    }

    showNewNotificationIndicator() {
        const oldIndicator = document.querySelector('.new-notification-indicator');
        if (oldIndicator) oldIndicator.remove();
        
        const indicator = document.createElement('div');
        indicator.className = 'new-notification-indicator';
        indicator.innerHTML = `
            <i class="uil uil-bell-ring"></i>
            <span>${this.unreadCount} إشعار جديد</span>
            <i class="uil uil-angle-left"></i>
        `;
        indicator.onclick = () => {
            this.toggleDropdown();
            indicator.remove();
        };
        
        document.body.appendChild(indicator);
        
        // إزالته بعد 10 ثواني
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.remove();
            }
        }, 10000);
    }

    showDesktopNotification(notification) {
        if (!("Notification" in window)) return;
        
        if (Notification.permission === "granted") {
            new Notification(notification.title, {
                body: notification.message,
                icon: '/favicon.ico',
                badge: '/favicon.ico'
            });
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    new Notification(notification.title, {
                        body: notification.message,
                        icon: '/favicon.ico'
                    });
                }
            });
        }
    }

    markAsRead(notificationId) {
        try {
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification && !notification.isRead) {
                notification.isRead = true;
                
                // تحديث في Firebase
                if (this.db) {
                    this.db.collection('notifications').doc(notificationId).update({
                        isRead: true,
                        readAt: new Date()
                    }).catch(error => {
                        console.warn('⚠️ فشل تحديث Firebase:', error);
                    });
                }
                
                // حفظ محلياً
                this.saveToLocalStorage();
                
                // تحديث العرض
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
                this.showMessage('لا توجد إشعارات غير مقروءة', 'info');
                return;
            }
            
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
                
                try {
                    await batch.commit();
                } catch (error) {
                    console.warn('⚠️ فشل تحديث Firebase:', error);
                }
            }
            
            // حفظ محلياً
            this.saveToLocalStorage();
            
            // تحديث العرض
            this.updateBadge();
            this.renderNotifications();
            
            this.showMessage(`تم تحديد ${unreadNotifications.length} إشعار كمقروء`, 'success');
            
        } catch (error) {
            console.error('❌ خطأ في تحديد جميع الإشعارات:', error);
            this.showMessage('حدث خطأ أثناء تحديث الإشعارات', 'error');
        }
    }

    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `notification-message alert alert-${type}`;
        messageDiv.style.cssText = `
            position: fixed;
            top: 120px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10000;
            padding: 10px 20px;
            border-radius: 5px;
            animation: slideDown 0.3s ease;
        `;
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 3000);
    }

    isDropdownOpen() {
        const dropdown = document.getElementById('notificationsDropdown');
        return dropdown && dropdown.classList.contains('show');
    }

    toggleDropdown() {
        const dropdown = document.getElementById('notificationsDropdown');
        if (dropdown) {
            const isOpen = dropdown.classList.contains('show');
            dropdown.classList.toggle('show');
            
            if (!isOpen) {
                // إذا تم فتح القائمة، قم بتحديث البيانات
                this.renderNotifications();
            }
        }
    }

    setupClickOutside() {
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('notificationsDropdown');
            const btn = document.querySelector('.notifications-btn');
            
            if (dropdown && btn && 
                !dropdown.contains(e.target) && 
                !btn.contains(e.target) &&
                dropdown.classList.contains('show')) {
                dropdown.classList.remove('show');
            }
        });
    }
}

// تهيئة النظام عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 تهيئة نظام الإشعارات...');
    window.notifications = new FirebaseNotifications();
});