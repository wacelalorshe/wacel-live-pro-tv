// js/firebase-notifications.js
// نظام الإشعارات لتطبيق Bein Sport

class FirebaseNotifications {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.db = null;
        this.popupShown = [];
        this.realtimeListener = null;
        this.init();
    }

    async init() {
        console.log('🔔 بدء نظام الإشعارات لتطبيق Bein Sport...');
        
        // تحميل الإشعارات المحلية أولاً
        this.loadFallbackNotifications();
        
        // بدء الاستماع للإشعارات الجديدة فوراً
        this.startRealtimeListener();
        
        // ثم محاولة الاتصال بـ Firebase
        setTimeout(async () => {
            try {
                await this.initializeFirebase();
                await this.loadNotifications();
                this.renderNotifications();
                this.checkPopupNotifications();
                
                // إعادة تشغيل الـ Realtime Listener بعد الاتصال بـ Firebase
                if (this.db) {
                    this.startRealtimeListener();
                }
            } catch (error) {
                console.error('❌ فشل تحميل الإشعارات من Firebase:', error);
                // استمرار العمل بالإشعارات المحلية
            }
        }, 1500);
        
        // إغلاق القائمة عند النقر خارجها
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

    async initializeFirebase() {
        return new Promise((resolve, reject) => {
            try {
                if (typeof firebase === 'undefined') {
                    throw new Error('Firebase SDK غير محمل');
                }
                
                const firebaseConfig = {
                    apiKey: "AIzaSyAkgEiYYlmpMe0NLewulheovlTQMz5C980",
                    authDomain: "bein-42f9e.firebaseapp.com",
                    projectId: "bein-42f9e",
                    storageBucket: "bein-42f9e.firebasestorage.app",
                    messagingSenderId: "143741167050",
                    appId: "1:143741167050:web:922d3a0cddb40f67b21b33",
                    measurementId: "G-JH198SKCFS"
                };
                
                let app;
                if (!firebase.apps.length) {
                    app = firebase.initializeApp(firebaseConfig, 'notificationsApp');
                } else {
                    // استخدام التطبيق الحالي إذا كان موجوداً
                    app = firebase.apps[0];
                }
                
                this.db = firebase.firestore(app);
                this.db.settings({ 
                    ignoreUndefinedProperties: true,
                    merge: true
                });
                
                console.log('✅ Firebase للإشعارات مهيأ بنجاح');
                resolve(true);
            } catch (error) {
                console.error('❌ فشل تهيئة Firebase:', error);
                reject(error);
            }
        });
    }

    startRealtimeListener() {
        try {
            // إزالة أي مستمع سابق
            if (this.realtimeListener) {
                this.realtimeListener();
            }
            
            if (!this.db) {
                console.log('🔄 محاولة الاتصال بـ Firebase للإشعارات...');
                return;
            }
            
            console.log('👂 بدء الاستماع الفوري للإشعارات الجديدة...');
            
            // الاستماع للإشعارات الجديدة فقط
            this.realtimeListener = this.db.collection('notifications')
                .where('isActive', '==', true)
                .orderBy('createdAt', 'desc')
                .limit(1)
                .onSnapshot((snapshot) => {
                    console.log('📡 تم استقبال تحديث للإشعارات');
                    
                    snapshot.docChanges().forEach((change) => {
                        if (change.type === 'added') {
                            const data = change.doc.data();
                            const notification = {
                                id: change.doc.id,
                                title: data.title || 'إشعار جديد',
                                message: data.message || '',
                                createdAt: data.createdAt || new Date(),
                                isRead: data.isRead || false,
                                isActive: data.isActive || true,
                                actionUrl: data.actionUrl || null,
                                type: data.type || 'info',
                                url: data.url || null,
                                linkText: data.linkText || 'عرض التفاصيل'
                            };
                            
                            // التحقق إذا كان الإشعار موجوداً بالفعل
                            const existingIndex = this.notifications.findIndex(n => n.id === notification.id);
                            if (existingIndex === -1) {
                                console.log('🆕 إشعار جديد تم استقباله:', notification.title);
                                
                                // إضافة الإشعار في البداية
                                this.notifications.unshift(notification);
                                
                                // تحديث العداد
                                this.updateBadge();
                                
                                // عرض نافذة منبثقة للإشعار الجديد
                                if (!notification.isRead) {
                                    this.showFloatingNotification(notification);
                                    this.showSoundNotification();
                                    this.showDesktopNotification(notification);
                                }
                                
                                // حفظ في التخزين المحلي
                                this.saveToLocalStorage();
                                
                                // إعادة تحميل القائمة إذا كانت مفتوحة
                                if (document.getElementById('notificationsDropdown')?.classList.contains('show')) {
                                    this.renderNotifications();
                                }
                            }
                        }
                    });
                }, (error) => {
                    console.error('❌ خطأ في الاستماع للإشعارات:', error);
                    // إعادة المحاولة بعد 5 ثواني
                    setTimeout(() => {
                        this.startRealtimeListener();
                    }, 5000);
                });
                
        } catch (error) {
            console.error('❌ فشل بدء الاستماع للإشعارات:', error);
        }
    }

    async loadNotifications() {
        try {
            if (!this.db) throw new Error('Firestore غير مهيأ');
            
            console.log('📡 جاري جلب الإشعارات من Firebase...');
            
            const snapshot = await this.db.collection('notifications')
                .where('isActive', '==', true)
                .orderBy('createdAt', 'desc')
                .limit(20)
                .get();
            
            console.log(`📊 عدد الإشعارات النشطة: ${snapshot.size}`);
            
            if (snapshot.empty) {
                console.log('ℹ️ لا توجد إشعارات نشطة في قاعدة البيانات');
                return [];
            }
            
            this.notifications = [];
            snapshot.forEach(doc => {
                const data = doc.data();
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
            });
            
            console.log(`✅ تم تحميل ${this.notifications.length} إشعار`);
            this.saveToLocalStorage();
            return this.notifications;
        } catch (error) {
            console.error('❌ فشل تحميل الإشعارات:', error);
            throw error;
        }
    }

    checkPopupNotifications() {
        const unreadNotifications = this.notifications.filter(n => !n.isRead);
        
        if (unreadNotifications.length > 0) {
            setTimeout(() => {
                const lastPopupTime = localStorage.getItem('last_popup_time');
                const now = Date.now();
                
                // عرض نافذة منبثقة إذا مر أكثر من 5 دقائق
                if (!lastPopupTime || (now - parseInt(lastPopupTime)) > 5 * 60 * 1000) {
                    const notification = unreadNotifications.find(n => !this.popupShown.includes(n.id));
                    if (notification) {
                        this.showFloatingNotification(notification);
                        this.popupShown.push(notification.id);
                        localStorage.setItem('last_popup_time', now.toString());
                    }
                }
            }, 3000);
        }
    }

    loadFallbackNotifications() {
        try {
            const saved = localStorage.getItem('bein_notifications');
            if (saved) {
                this.notifications = JSON.parse(saved);
                console.log(`📱 تم تحميل ${this.notifications.length} إشعار من التخزين المحلي`);
            } else {
                this.notifications = [
                    {
                        id: 'default-1',
                        title: 'مرحباً بك في وسيل لايف برو',
                        message: 'تطبيق مشاهدة القنوات الفضائية والمباريات الحية',
                        createdAt: new Date(),
                        isRead: true,
                        isActive: true,
                        type: 'welcome',
                        url: '#',
                        linkText: 'استكشف التطبيق'
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
            localStorage.setItem('bein_notifications', JSON.stringify(this.notifications));
            console.log('💾 تم حفظ الإشعارات في التخزين المحلي');
        } catch (error) {
            console.error('❌ خطأ في حفظ الإشعارات محلياً:', error);
        }
    }

    renderNotifications() {
        const container = document.getElementById('notificationsList');
        if (!container) return;

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
                     onclick="window.firebaseNotifications.markAsRead('${notification.id}')">
                    <div class="notification-title">
                        <span><i class="${icon} me-2"></i> ${notification.title}</span>
                        <span class="notification-time">${timeAgo}</span>
                    </div>
                    <div class="notification-message">
                        ${notification.message}
                    </div>
                    ${notification.actionUrl || notification.url ? `
                        <div class="notification-actions">
                            <button onclick="event.stopPropagation(); window.open('${notification.actionUrl || notification.url}', '_blank')">
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
            
            // هزاز الأيقونة عندما يكون هناك إشعارات جديدة
            if (this.unreadCount > 0) {
                this.vibrateNotificationIcon();
                this.showNewNotificationIndicator();
            }
        }
    }

    vibrateNotificationIcon() {
        const btn = document.querySelector('.notifications-btn');
        if (btn) {
            // إضافة كلاس للهزاز
            btn.classList.add('vibrate');
            
            // إزالته بعد انتهاء الهزة
            setTimeout(() => {
                btn.classList.remove('vibrate');
            }, 1000);
        }
    }

    showSoundNotification() {
        try {
            // إنشاء صوت تنبيه بسيط
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 1);
            
        } catch (error) {
            console.log('⚠️ لا يمكن تشغيل الصوت');
        }
    }

    showDesktopNotification(notification) {
        // التحقق من إذن الإشعارات
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification(notification.title, {
                body: notification.message,
                icon: 'https://via.placeholder.com/64/2F2562/FFFFFF?text=BEIN',
                badge: 'https://via.placeholder.com/32/FF0005/FFFFFF?text=!',
                tag: 'bein-notification'
            });
        } else if (Notification.permission === "default") {
            // طلب الإذن
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    new Notification(notification.title, {
                        body: notification.message,
                        icon: 'https://via.placeholder.com/64/2F2562/FFFFFF?text=BEIN'
                    });
                }
            });
        }
    }

    showNewNotificationIndicator() {
        const oldIndicator = document.querySelector('.new-notification-indicator');
        if (oldIndicator) oldIndicator.remove();
        
        if (this.unreadCount > 0) {
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
            
            // إزالة المؤشر بعد 10 ثواني
            setTimeout(() => {
                if (indicator.parentNode) {
                    indicator.remove();
                }
            }, 10000);
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
                <button onclick="window.firebaseNotifications.markAsRead('${notification.id}'); this.parentElement.parentElement.remove()">
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
        
        // إضافة مؤثر الظهور
        setTimeout(() => {
            popup.classList.add('show');
        }, 100);
        
        // إزالته بعد 8 ثواني
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

    showToast(message, type = 'info') {
        const oldToasts = document.querySelectorAll('.notification-toast');
        oldToasts.forEach(toast => toast.remove());
        
        const icon = type === 'success' ? 'uil-check-circle' : 
                    type === 'error' ? 'uil-times-circle' : 
                    'uil-info-circle';
        
        const toast = document.createElement('div');
        toast.className = 'notification-toast';
        toast.innerHTML = `
            <div>
                <i class="uil ${icon} me-2"></i>
                <span>${message}</span>
            </div>
            <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 3000);
    }

    async markAsRead(notificationId) {
        try {
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification && !notification.isRead) {
                notification.isRead = true;
                
                if (this.db) {
                    await this.db.collection('notifications').doc(notificationId).update({
                        isRead: true,
                        readAt: new Date()
                    });
                }
                
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
                this.showToast('لا توجد إشعارات غير مقروءة', 'info');
                return;
            }
            
            unreadNotifications.forEach(n => n.isRead = true);
            
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
            
            this.saveToLocalStorage();
            this.updateBadge();
            this.renderNotifications();
            
            this.showToast(`تم تحديد ${unreadNotifications.length} إشعار كمقروء`, 'success');
            
        } catch (error) {
            console.error('❌ خطأ في تحديد جميع الإشعارات:', error);
            this.showToast('حدث خطأ أثناء تحديث الإشعارات', 'error');
        }
    }

    async reloadNotifications() {
        try {
            const container = document.getElementById('notificationsList');
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 20px;">
                        <div class="spinner-border text-primary mb-3" role="status">
                            <span class="visually-hidden">جاري التحميل...</span>
                        </div>
                        <p>جاري إعادة تحميل الإشعارات...</p>
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
            dropdown.classList.toggle('show');
            
            if (dropdown.classList.contains('show')) {
                this.reloadNotifications();
            }
        }
    }
}

// تهيئة النظام عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 الصفحة الرئيسية محملة، جاري تهيئة نظام الإشعارات...');
    window.firebaseNotifications = new FirebaseNotifications();
    
    // طلب إذن الإشعارات عند تحميل الصفحة
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }
});
