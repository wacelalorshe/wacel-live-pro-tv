// نظام إدارة متكامل مع Firebase مع دعم التعديل والإشعارات
class AdminManager {
    constructor() {
        this.isAuthenticated = false;
        this.firebaseAvailable = false;
        this.firestoreAvailable = false;
        this.sections = [];
        this.channels = [];
        this.notifications = [];
        this.editingSection = null;
        this.editingChannel = null;
        this.editingNotification = null;
        this.filteredChannels = null;
        this.filteredNotifications = null;
        this.currentSectionFilter = ''; // فلترة القسم الحالية
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
            if (typeof firebase === 'undefined') {
                this.showFirebaseStatus('Firebase غير متاح', 'error');
                return;
            }

            await firebaseUtils.initializeFirebase();
            const db = firebaseUtils.getDB();
            
            const testDoc = db.collection('test_connection').doc('test');
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
                this.showFirebaseStatus('لا يمكن الاتصال بقاعدة البيانات', 'warning');
            } else {
                this.showFirebaseStatus('خطأ في الاتصال بقاعدة البيانات: ' + error.message, 'error');
            }
            
            this.firebaseAvailable = false;
            this.firestoreAvailable = false;
        }
    }

    showFirebaseStatus(message, type) {
        const statusElement = document.getElementById('firebaseStatus');
        const statusText = document.getElementById('firebaseStatusText');
        
        if (statusElement && statusText) {
            statusElement.style.display = 'block';
            statusText.textContent = message;
            
            statusElement.className = 'firebase-status';
            
            if (type === 'success') {
                statusElement.classList.add('firebase-success');
            } else if (type === 'error') {
                statusElement.classList.add('firebase-error');
            } else if (type === 'warning') {
                statusElement.classList.add('firebase-warning');
            }
        }
    }

    showAdminPanel() {
        document.getElementById('adminPanel').style.display = 'block';
        document.getElementById('loginRequired').style.display = 'none';
        
        this.loadAdminInterface();
    }

    showLoginRequired() {
        document.getElementById('adminPanel').style.display = 'none';
        document.getElementById('loginRequired').style.display = 'block';
    }

    loadAdminInterface() {
        const adminPanel = document.getElementById('adminPanel');
        
        adminPanel.innerHTML = `
            <!-- Firebase Connection Info -->
            <div class="row mb-4">
                <div class="col-12">
                    <div class="card" style="background: rgba(0,0,0,0.7); border: 1px solid #42318F;">
                        <div class="card-body text-center">
                            <h5><i class="uil uil-database"></i> حالة قاعدة البيانات</h5>
                            <p id="dbStatusText" class="mb-0">
                                ${this.firestoreAvailable ? 
                                    '<span class="text-success">✅ متصل بقاعدة البيانات</span>' : 
                                    '<span class="text-warning">⚠️ قاعدة البيانات غير متاحة</span>'
                                }
                            </p>
                            ${!this.firestoreAvailable ? `
                                <div class="mt-3">
                                    <button class="btn btn-sm btn-warning me-2" onclick="adminManager.retryFirebaseConnection()">
                                        <i class="uil uil-refresh"></i> إعادة المحاولة
                                    </button>
                                    <button class="btn btn-sm btn-info" onclick="adminManager.showFirebaseHelp()">
                                        <i class="uil uil-question-circle"></i> مساعدة في الإعداد
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Stats Overview -->
            <div class="row mb-4">
                <div class="col-md-3">
                    <div class="stats-card">
                        <div class="stats-number" id="totalSections">0</div>
                        <div class="stats-label">عدد الأقسام</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stats-card">
                        <div class="stats-number" id="totalChannels">0</div>
                        <div class="stats-label">عدد القنوات</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stats-card">
                        <div class="stats-number" id="activeSections">0</div>
                        <div class="stats-label">الأقسام النشطة</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stats-card">
                        <div class="stats-number" id="activeNotifications">0</div>
                        <div class="stats-label">الإشعارات النشطة</div>
                    </div>
                </div>
            </div>

            <!-- Navigation Tabs -->
            <ul class="nav nav-tabs nav-tabs-custom mb-4" id="adminTabs">
                <li class="nav-item">
                    <a class="nav-link active" data-bs-toggle="tab" href="#sectionsTab">
                        <i class="uil uil-folder"></i> إدارة الأقسام
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" data-bs-toggle="tab" href="#channelsTab">
                        <i class="uil uil-tv"></i> إدارة القنوات
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" data-bs-toggle="tab" href="#notificationsTab">
                        <i class="uil uil-bell"></i> الإشعارات
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" data-bs-toggle="tab" href="#firebaseTab">
                        <i class="uil uil-database"></i> إعدادات Firebase
                    </a>
                </li>
            </ul>

            <!-- Tab Content -->
            <div class="tab-content">
                <!-- Sections Management -->
                <div class="tab-pane fade show active" id="sectionsTab">
                    ${this.loadSectionsTab()}
                </div>

                <!-- Channels Management -->
                <div class="tab-pane fade" id="channelsTab">
                    ${this.loadChannelsTab()}
                </div>

                <!-- Notifications Management -->
                <div class="tab-pane fade" id="notificationsTab">
                    ${this.loadNotificationsTab()}
                </div>

                <!-- Firebase Settings -->
                <div class="tab-pane fade" id="firebaseTab">
                    ${this.loadFirebaseTab()}
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="mt-5 text-center">
                <a href="index.html" class="btn btn-primary me-3">
                    <i class="uil uil-home"></i> العودة للرئيسية
                </a>
                <button onclick="adminManager.logout()" class="btn btn-danger">
                    <i class="uil uil-signout"></i> تسجيل الخروج
                </button>
            </div>
        `;

        this.loadData();
    }

    loadSectionsTab() {
        return `
            <!-- Add/Edit Section Form -->
            <div class="card mb-5" style="background: rgba(0,0,0,0.7); border: 1px solid #42318F;">
                <div class="card-header card-header-custom">
                    <h4 class="mb-0 text-white">
                        <i class="uil uil-plus-circle"></i> 
                        <span id="sectionFormTitle">إضافة قسم جديد</span>
                    </h4>
                </div>
                <div class="card-body">
                    <form id="sectionForm" onsubmit="adminManager.saveSection(event)">
                        <input type="hidden" id="sectionId">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="form-group mb-3">
                                    <label class="form-label">اسم القسم *</label>
                                    <input type="text" id="sectionName" class="form-control" required placeholder="أدخل اسم القسم">
                                </div>
                                <div class="form-group mb-3">
                                    <label class="form-label">ترتيب العرض *</label>
                                    <input type="number" id="sectionOrder" class="form-control" value="1" min="1" required>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-group mb-3">
                                    <label class="form-label">حالة القسم</label>
                                    <select id="sectionStatus" class="form-control">
                                        <option value="active">نشط</option>
                                        <option value="inactive">غير نشط</option>
                                    </select>
                                </div>
                                <div class="form-group mb-3">
                                    <label class="form-label">وصف القسم (اختياري)</label>
                                    <textarea id="sectionDescription" class="form-control" rows="3" placeholder="أدخل وصفاً للقسم"></textarea>
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-12">
                                <div class="form-group mb-3">
                                    <label class="form-label">صورة القسم (اختياري)</label>
                                    <input type="text" id="sectionImage" class="form-control" placeholder="رابط الصورة (URL)" oninput="adminManager.updateImagePreview(this.value, 'sectionImagePreview')">
                                    <small class="text-muted">أدخل رابط الصورة التي تريد عرضها للقسم</small>
                                    <img id="sectionImagePreview" class="section-image-preview" alt="معاينة الصورة">
                                </div>
                            </div>
                        </div>
                        <div class="d-flex gap-2">
                            <button type="submit" class="btn btn-success flex-fill py-3">
                                <i class="uil uil-save"></i> 
                                <span id="sectionSaveButton">حفظ القسم</span>
                            </button>
                            <button type="button" class="btn btn-secondary" onclick="adminManager.cancelEditSection()" id="cancelSectionEdit" style="display: none;">
                                <i class="uil uil-times"></i> إلغاء
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            
            <!-- Sections List -->
            <div class="card" style="background: rgba(0,0,0,0.7); border: 1px solid #42318F;">
                <div class="card-header card-header-custom">
                    <h4 class="mb-0 text-white">
                        <i class="uil uil-folder"></i> الأقسام المضافة
                        <span id="sectionsCount" class="badge bg-primary ms-2">0</span>
                    </h4>
                </div>
                <div class="card-body">
                    <div id="sectionsList">
                        <div class="text-center py-5">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">جاري التحميل...</span>
                            </div>
                            <p class="mt-3 text-muted">جاري تحميل الأقسام...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    loadChannelsTab() {
        return `
            <!-- Add/Edit Channel Form -->
            <div class="card mb-5" style="background: rgba(0,0,0,0.7); border: 1px solid #42318F;">
                <div class="card-header card-header-custom">
                    <h4 class="mb-0 text-white">
                        <i class="uil uil-plus-circle"></i> 
                        <span id="channelFormTitle">إضافة قناة جديدة</span>
                    </h4>
                </div>
                <div class="card-body">
                    <form id="channelForm" onsubmit="adminManager.saveChannel(event)">
                        <input type="hidden" id="channelId">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="form-group mb-3">
                                    <label class="form-label">اسم القناة *</label>
                                    <input type="text" id="channelName" class="form-control" required placeholder="أدخل اسم القناة">
                                </div>
                                <div class="form-group mb-3">
                                    <label class="form-label">القسم *</label>
                                    <select id="channelSection" class="form-control" required>
                                        <option value="">اختر القسم</option>
                                    </select>
                                </div>
                                <div class="form-group mb-3">
                                    <label class="form-label">رابط الصورة</label>
                                    <input type="text" id="channelImage" class="form-control" placeholder="https://example.com/image.jpg" oninput="adminManager.updateImagePreview(this.value, 'channelImagePreview')">
                                    <img id="channelImagePreview" class="section-image-preview" alt="معاينة الصورة">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-group mb-3">
                                    <label class="form-label">رابط البث *</label>
                                    <textarea id="channelUrl" class="form-control" rows="3" required placeholder="أدخل رابط البث"></textarea>
                                </div>
                                <div class="form-group mb-3">
                                    <label class="form-label">ترتيب العرض <small>(للإضافة: تلقائي، للتعديل: يدوي)</small></label>
                                    <input type="number" id="channelOrder" class="form-control" value="1" min="1" disabled>
                                    <small class="text-muted" id="orderHelpText">سيتم تعيين الترتيب تلقائياً عند الحفظ</small>
                                </div>
                                <div class="form-group mb-3">
                                    <label class="form-label">رابط التطبيق</label>
                                    <input type="text" id="channelAppUrl" class="form-control" value="https://play.google.com/store/apps/details?id=com.xpola.player">
                                </div>
                            </div>
                        </div>
                        <div class="d-flex gap-2">
                            <button type="submit" class="btn btn-success flex-fill py-3">
                                <i class="uil uil-save"></i> 
                                <span id="channelSaveButton">حفظ القناة</span>
                            </button>
                            <button type="button" class="btn btn-secondary" onclick="adminManager.cancelEditChannel()" id="cancelChannelEdit" style="display: none;">
                                <i class="uil uil-times"></i> إلغاء
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            
            <!-- Channels List -->
            <div class="card" style="background: rgba(0,0,0,0.7); border: 1px solid #42318F;">
                <div class="card-header card-header-custom d-flex justify-content-between align-items-center">
                    <h4 class="mb-0 text-white">
                        <i class="uil uil-list-ui-alt"></i> القنوات المضافة
                        <span id="channelsCount" class="badge bg-primary ms-2">0</span>
                    </h4>
                    <div>
                        <button class="btn btn-info me-2" onclick="adminManager.reorderAllChannels()">
                            <i class="uil uil-sort-amount-down"></i> إعادة ترتيب جميع القنوات
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <!-- Search and Filter Section -->
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <input type="text" id="channelSearch" class="form-control" placeholder="🔍 بحث في القنوات..." oninput="adminManager.filterChannels()">
                        </div>
                        <div class="col-md-6">
                            <select id="channelSectionFilter" class="form-control" onchange="adminManager.filterChannelsBySection()">
                                <option value="">جميع الأقسام</option>
                            </select>
                        </div>
                    </div>
                    
                    <!-- Filter Info -->
                    <div id="filterInfo" style="display: none;" class="mb-3">
                        <div class="alert alert-info d-flex justify-content-between align-items-center">
                            <div>
                                <i class="uil uil-filter"></i>
                                <span id="filterInfoText">جاري عرض قنوات قسم معين</span>
                            </div>
                            <button class="btn btn-sm btn-light" onclick="adminManager.clearSectionFilter()">
                                <i class="uil uil-times"></i> إزالة الفلترة
                            </button>
                        </div>
                    </div>
                    
                    <div id="channelsList">
                        <div class="text-center py-5">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">جاري التحميل...</span>
                            </div>
                            <p class="mt-3 text-muted">جاري تحميل القنوات...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    loadNotificationsTab() {
        return `
            <!-- Add/Edit Notification Form -->
            <div class="card mb-5" style="background: rgba(0,0,0,0.7); border: 1px solid #42318F;">
                <div class="card-header card-header-custom">
                    <h4 class="mb-0 text-white">
                        <i class="uil uil-bell"></i> 
                        <span id="notificationFormTitle">إرسال إشعار جديد</span>
                    </h4>
                </div>
                <div class="card-body">
                    <form id="notificationForm" onsubmit="adminManager.saveNotification(event)">
                        <input type="hidden" id="notificationId">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="form-group mb-3">
                                    <label class="form-label">عنوان الإشعار *</label>
                                    <input type="text" id="notificationTitle" class="form-control" required 
                                           placeholder="أدخل عنوان الإشعار" maxlength="100">
                                </div>
                                <div class="form-group mb-3">
                                    <label class="form-label">نوع الإشعار</label>
                                    <select id="notificationType" class="form-control">
                                        <option value="info">معلومات</option>
                                        <option value="success">نجاح</option>
                                        <option value="warning">تحذير</option>
                                        <option value="error">خطأ</option>
                                        <option value="update">تحديث</option>
                                    </select>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-group mb-3">
                                    <label class="form-label">حالة الإشعار</label>
                                    <select id="notificationStatus" class="form-control">
                                        <option value="active">نشط</option>
                                        <option value="inactive">غير نشط</option>
                                    </select>
                                </div>
                                <div class="form-group mb-3">
                                    <label class="form-label">تاريخ الانتهاء</label>
                                    <input type="date" id="notificationExpiry" class="form-control">
                                    <small class="text-muted">اتركه فارغاً إذا كان الإشعار دائماً</small>
                                </div>
                            </div>
                        </div>
                        <div class="form-group mb-3">
                            <label class="form-label">نص الإشعار *</label>
                            <textarea id="notificationMessage" class="form-control" rows="4" required 
                                      placeholder="أدخل نص الإشعار هنا..." maxlength="500"></textarea>
                            <small class="text-muted">يمكن أن يحتوي على روابط HTML: &lt;a href="#"&gt;رابط&lt;/a&gt;</small>
                        </div>
                        <div class="form-group mb-3">
                            <label class="form-label">رابط إضافي (اختياري)</label>
                            <input type="text" id="notificationLink" class="form-control" 
                                   placeholder="https://example.com">
                            <small class="text-muted">سيظهر كزر في الإشعار</small>
                        </div>
                        <div class="form-group mb-3">
                            <label class="form-label">نص الرابط (اختياري)</label>
                            <input type="text" id="notificationLinkText" class="form-control" 
                                   placeholder="عرض المزيد">
                        </div>
                        <div class="d-flex gap-2">
                            <button type="submit" class="btn btn-success flex-fill py-3">
                                <i class="uil uil-megaphone"></i> 
                                <span id="notificationSaveButton">إرسال الإشعار</span>
                            </button>
                            <button type="button" class="btn btn-secondary" onclick="adminManager.cancelEditNotification()" 
                                    id="cancelNotificationEdit" style="display: none;">
                                <i class="uil uil-times"></i> إلغاء
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            
            <!-- Notifications List -->
            <div class="card" style="background: rgba(0,0,0,0.7); border: 1px solid #42318F;">
                <div class="card-header card-header-custom">
                    <h4 class="mb-0 text-white">
                        <i class="uil uil-list-ui-alt"></i> الإشعارات المرسلة
                        <span id="notificationsCount" class="badge bg-primary ms-2">0</span>
                    </h4>
                </div>
                <div class="card-body">
                    <div class="mb-3">
                        <div class="row">
                            <div class="col-md-6">
                                <input type="text" id="notificationSearch" class="form-control" 
                                       placeholder="🔍 بحث في الإشعارات..." oninput="adminManager.filterNotifications()">
                            </div>
                            <div class="col-md-3">
                                <select id="notificationTypeFilter" class="form-control" onchange="adminManager.filterNotifications()">
                                    <option value="">جميع الأنواع</option>
                                    <option value="info">معلومات</option>
                                    <option value="success">نجاح</option>
                                    <option value="warning">تحذير</option>
                                    <option value="error">خطأ</option>
                                    <option value="update">تحديث</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <select id="notificationStatusFilter" class="form-control" onchange="adminManager.filterNotifications()">
                                    <option value="">جميع الحالات</option>
                                    <option value="active">نشط</option>
                                    <option value="inactive">غير نشط</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div id="notificationsList">
                        <div class="text-center py-5">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">جاري التحميل...</span>
                            </div>
                            <p class="mt-3 text-muted">جاري تحميل الإشعارات...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    loadFirebaseTab() {
        return `
            <div class="card" style="background: rgba(0,0,0,0.7); border: 1px solid #42318F;">
                <div class="card-header card-header-custom">
                    <h4 class="mb-0 text-white">
                        <i class="uil uil-database"></i> إعدادات Firebase
                    </h4>
                </div>
                <div class="card-body">
                    <h5>حل مشكلة الصلاحيات</h5>
                    <p>لحل مشكلة "ليس لديك صلاحية للوصول إلى قاعدة البيانات":</p>
                    
                    <ol class="text-start">
                        <li>اذهب إلى <a href="https://console.firebase.google.com/" target="_blank">Firebase Console</a></li>
                        <li>اختر مشروعك "bein-42f9e"</li>
                        <li>من القائمة اليسرى، اختر <strong>Firestore Database</strong></li>
                        <li>انقر على <strong>Rules</strong></li>
                        <li>استبدل القواعد الحالية بـ:</li>
                    </ol>
                    
                    <pre style="background: #1a1a1a; padding: 15px; border-radius: 5px; direction: ltr; text-align: left;">
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}</pre>
                    
                    <ol class="text-start" start="6">
                        <li>انقر على <strong>Publish</strong></li>
                        <li>انتظر بضع دقائق ثم أعد تحميل هذه الصفحة</li>
                    </ol>
                    
                    <div class="mt-4">
                        <button class="btn btn-primary" onclick="adminManager.retryFirebaseConnection()">
                            <i class="uil uil-refresh"></i> إعادة فحص الاتصال
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async loadData() {
        if (this.firestoreAvailable) {
            await this.loadDataFromFirestore();
        } else {
            this.loadDataFromLocalStorage();
        }
    }

    async loadDataFromFirestore() {
        try {
            const db = firebaseUtils.getDB();
            
            // تحميل الأقسام
            const sectionsSnapshot = await db.collection('sections').orderBy('order').get();
            this.sections = sectionsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // تحميل القنوات
            const channelsSnapshot = await db.collection('channels').orderBy('order').get();
            this.channels = channelsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // تحميل الإشعارات
            const notificationsSnapshot = await db.collection('notifications')
                .orderBy('createdAt', 'desc')
                .get();
            this.notifications = notificationsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            this.renderData();
            
        } catch (error) {
            console.error('Error loading data from Firestore:', error);
            this.showAlert('خطأ في تحميل البيانات من قاعدة البيانات', 'error');
            this.loadDataFromLocalStorage();
        }
    }

    loadDataFromLocalStorage() {
        const storedSections = firebaseUtils.loadFromLocalStorage('bein_sections');
        const storedChannels = firebaseUtils.loadFromLocalStorage('bein_channels');
        const storedNotifications = firebaseUtils.loadFromLocalStorage('bein_notifications');
        
        if (storedSections) {
            this.sections = storedSections;
        }
        
        if (storedChannels) {
            this.channels = storedChannels;
        }
        
        if (storedNotifications) {
            this.notifications = storedNotifications;
        }
        
        this.renderData();
        this.showAlert('جاري استخدام التخزين المحلي كبديل', 'warning');
    }

    renderData() {
        this.renderSectionsList();
        this.renderChannelsList();
        this.renderNotificationsList();
        this.updateStats();
        this.populateSectionDropdown();
        this.populateSectionFilter();
    }

    renderSectionsList() {
        const container = document.getElementById('sectionsList');
        const countElement = document.getElementById('sectionsCount');
        
        if (!container) return;
        
        if (this.sections.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="uil uil-folder" style="font-size: 80px; color: #6c757d;"></i>
                    <h5 class="mt-3 text-muted">لا توجد أقسام مضافة</h5>
                </div>
            `;
            if (countElement) countElement.textContent = '0';
            return;
        }
        
        container.innerHTML = this.sections.map(section => `
            <div class="section-item">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center">
                        ${section.image ? `
                            <img src="${section.image}" alt="${section.name}" 
                                 class="rounded me-3"
                                 style="width: 60px; height: 60px; object-fit: cover;"
                                 onerror="this.src='https://via.placeholder.com/60x60/2F2562/FFFFFF?text=IMG'">
                        ` : `
                            <div class="rounded me-3 d-flex align-items-center justify-content-center"
                                 style="width: 60px; height: 60px; background: #42318F; color: white;">
                                <i class="uil uil-folder"></i>
                            </div>
                        `}
                        <div>
                            <h5 class="text-white mb-1">${section.name}</h5>
                            <div class="text-muted">
                                <small>الترتيب: ${section.order || 1}</small>
                                <span class="mx-2">•</span>
                                <small class="${section.isActive !== false ? 'text-success' : 'text-danger'}">
                                    ${section.isActive !== false ? 'نشط' : 'غير نشط'}
                                </small>
                                ${section.description ? `<span class="mx-2">•</span><small>${section.description}</small>` : ''}
                                <span class="mx-2">•</span>
                                <small class="badge bg-primary">
                                    ${this.getSectionChannelsCount(section.id)} قنوات
                                </small>
                            </div>
                        </div>
                    </div>
                    <div class="action-buttons">
                        <button class="btn btn-info btn-sm me-1" onclick="adminManager.viewSectionChannels('${section.id}')" title="عرض قنوات القسم">
                            <i class="uil uil-eye"></i> عرض القنوات
                        </button>
                        <button class="btn btn-warning btn-sm me-1" onclick="adminManager.editSection('${section.id}')" title="تعديل القسم">
                            <i class="uil uil-edit"></i> تعديل
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="adminManager.deleteSection('${section.id}')" title="حذف القسم">
                            <i class="uil uil-trash-alt"></i> حذف
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        if (countElement) countElement.textContent = this.sections.length;
    }

    renderChannelsList() {
        const container = document.getElementById('channelsList');
        const countElement = document.getElementById('channelsCount');
        
        if (!container) return;
        
        if (this.channels.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="uil uil-tv-retro" style="font-size: 80px; color: #6c757d;"></i>
                    <h5 class="mt-3 text-muted">لا توجد قنوات مضافة</h5>
                </div>
            `;
            if (countElement) countElement.textContent = '0';
            return;
        }
        
        // تحديد القنوات المراد عرضها بناءً على الفلترة
        let channelsToDisplay = this.channels;
        
        if (this.filteredChannels) {
            channelsToDisplay = this.filteredChannels;
        }
        
        // إذا كان هناك فلترة حسب القسم
        if (this.currentSectionFilter) {
            channelsToDisplay = channelsToDisplay.filter(channel => channel.sectionId === this.currentSectionFilter);
        }
        
        // فرز القنوات حسب الترتيب
        const sortedChannels = [...channelsToDisplay].sort((a, b) => (a.order || 999) - (b.order || 999));
        
        container.innerHTML = sortedChannels.map(channel => {
            const section = this.sections.find(s => s.id === channel.sectionId);
            
            // تحديد إذا كانت القناة في الأعلى أو الأسفل
            const sectionChannels = this.channels.filter(c => c.sectionId === channel.sectionId);
            const sortedSectionChannels = [...sectionChannels].sort((a, b) => (a.order || 999) - (b.order || 999));
            const currentIndex = sortedSectionChannels.findIndex(c => c.id === channel.id);
            const isFirst = currentIndex === 0;
            const isLast = currentIndex === sortedSectionChannels.length - 1;
            
            return `
            <div class="channel-item" data-channel-id="${channel.id}" data-order="${channel.order}">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center">
                        <div class="channel-order-badge me-2" title="الترتيب الحالي">
                            <span class="badge bg-primary">${channel.order || 1}</span>
                        </div>
                        <img src="${channel.image || 'https://via.placeholder.com/60x40/2F2562/FFFFFF?text=TV'}" 
                             alt="${channel.name}" 
                             class="rounded me-3 channel-thumbnail"
                             onerror="this.src='https://via.placeholder.com/60x40/2F2562/FFFFFF?text=TV'">
                        <div>
                            <h6 class="text-white mb-1">${channel.name}</h6>
                            <div class="text-muted">
                                <small>الترتيب: ${channel.order || 1}</small>
                                ${section ? `
                                    <span class="mx-2">•</span>
                                    <small class="section-badge" onclick="adminManager.filterBySection('${section.id}')" style="cursor: pointer;" title="عرض قنوات هذا القسم فقط">
                                        ${section.name}
                                    </small>
                                ` : ''}
                                <span class="mx-2">•</span>
                                <small class="${channel.url ? 'text-success' : 'text-danger'}">
                                    ${channel.url ? '🔗 رابط متاح' : '❌ بدون رابط'}
                                </small>
                            </div>
                        </div>
                    </div>
                    <div class="action-buttons">
                        <button class="btn btn-info btn-sm move-up-btn ${isFirst ? 'disabled' : ''}" 
                                onclick="${isFirst ? '' : `adminManager.moveChannelUp('${channel.id}')`}" 
                                title="${isFirst ? 'القناة في الأعلى' : 'تحريك للأعلى'}" ${isFirst ? 'disabled' : ''}>
                            <i class="uil uil-arrow-up"></i>
                        </button>
                        <button class="btn btn-info btn-sm move-down-btn ${isLast ? 'disabled' : ''}" 
                                onclick="${isLast ? '' : `adminManager.moveChannelDown('${channel.id}')`}" 
                                title="${isLast ? 'القناة في الأسفل' : 'تحريك للأسفل'}" ${isLast ? 'disabled' : ''}>
                            <i class="uil uil-arrow-down"></i>
                        </button>
                        <button class="btn btn-warning btn-sm" onclick="adminManager.editChannel('${channel.id}')" title="تعديل القناة">
                            <i class="uil uil-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="adminManager.deleteChannel('${channel.id}')" title="حذف القناة">
                            <i class="uil uil-trash-alt"></i>
                        </button>
                    </div>
                </div>
                <div class="mt-2 text-muted small">
                    <span class="badge bg-secondary">#${channel.id.substring(0, 8)}</span>
                    ${channel.createdAt ? `<span class="mx-2">•</span><small>تم الإنشاء: ${new Date(channel.createdAt).toLocaleDateString('ar-SA')}</small>` : ''}
                </div>
            </div>
        `}).join('');
        
        if (countElement) countElement.textContent = sortedChannels.length;
        
        // تحديث معلومات الفلترة
        this.updateFilterInfo();
    }

    renderNotificationsList() {
        const container = document.getElementById('notificationsList');
        const countElement = document.getElementById('notificationsCount');
        
        if (!container) return;
        
        const filteredNotifications = this.filteredNotifications || this.notifications;
        const now = new Date();
        const activeNotifications = filteredNotifications.filter(n => 
            n.status === 'active' && 
            (!n.expiryDate || new Date(n.expiryDate) > now)
        );
        
        if (filteredNotifications.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="uil uil-bell-slash" style="font-size: 80px; color: #6c757d;"></i>
                    <h5 class="mt-3 text-muted">لا توجد إشعارات</h5>
                    <p class="text-muted">لم يتم إرسال أي إشعارات بعد</p>
                </div>
            `;
            if (countElement) {
                countElement.textContent = '0';
                countElement.className = 'badge bg-primary ms-2';
            }
            return;
        }
        
        container.innerHTML = filteredNotifications.map(notification => {
            const isExpired = notification.expiryDate && new Date(notification.expiryDate) <= now;
            const statusClass = notification.status === 'active' && !isExpired ? 'success' : 'danger';
            const typeClass = this.getNotificationTypeClass(notification.type);
            const createdDate = notification.createdAt ? new Date(notification.createdAt).toLocaleDateString('ar-SA') : 'غير محدد';
            const expiryDate = notification.expiryDate ? new Date(notification.expiryDate).toLocaleDateString('ar-SA') : 'غير محدد';
            
            return `
            <div class="notification-item mb-3 p-3 rounded ${typeClass}">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center mb-2">
                            <span class="badge bg-${this.getNotificationTypeClass(notification.type, true)} me-2">
                                ${this.getNotificationTypeText(notification.type)}
                            </span>
                            <span class="badge bg-${statusClass}">
                                ${notification.status === 'active' && !isExpired ? 'نشط' : 'غير نشط'}
                            </span>
                            ${isExpired ? '<span class="badge bg-warning ms-2">منتهي</span>' : ''}
                        </div>
                        <h5 class="text-white mb-2">${notification.title}</h5>
                        <p class="text-light mb-2">${notification.message}</p>
                        ${notification.link ? `
                            <a href="${notification.link}" target="_blank" class="btn btn-sm btn-outline-light">
                                ${notification.linkText || 'عرض المزيد'}
                            </a>
                        ` : ''}
                        <div class="mt-2 text-muted small">
                            <i class="uil uil-calendar-alt"></i> ${createdDate}
                            ${notification.expiryDate ? ` | <i class="uil uil-clock"></i> ينتهي: ${expiryDate}` : ''}
                        </div>
                    </div>
                    <div class="action-buttons ms-3">
                        <button class="btn btn-warning btn-sm mb-1" onclick="adminManager.editNotification('${notification.id}')">
                            <i class="uil uil-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="adminManager.deleteNotification('${notification.id}')">
                            <i class="uil uil-trash-alt"></i>
                        </button>
                    </div>
                </div>
            </div>
            `;
        }).join('');
        
        if (countElement) {
            countElement.textContent = filteredNotifications.length;
            countElement.className = `badge ${activeNotifications.length > 0 ? 'bg-success' : 'bg-primary'} ms-2`;
            countElement.title = `${activeNotifications.length} إشعار نشط`;
        }
    }

    getNotificationTypeClass(type, isBadge = false) {
        const prefix = isBadge ? '' : '';
        switch(type) {
            case 'info': return isBadge ? 'info' : 'info-bg';
            case 'success': return isBadge ? 'success' : 'success-bg';
            case 'warning': return isBadge ? 'warning' : 'warning-bg';
            case 'error': return isBadge ? 'danger' : 'error-bg';
            case 'update': return isBadge ? 'primary' : 'update-bg';
            default: return isBadge ? 'info' : 'info-bg';
        }
    }

    getNotificationTypeText(type) {
        switch(type) {
            case 'info': return 'معلومات';
            case 'success': return 'نجاح';
            case 'warning': return 'تحذير';
            case 'error': return 'خطأ';
            case 'update': return 'تحديث';
            default: return 'معلومات';
        }
    }

    populateSectionDropdown() {
        const dropdown = document.getElementById('channelSection');
        if (!dropdown) return;
        
        dropdown.innerHTML = '<option value="">اختر القسم</option>' +
            this.sections.map(section => 
                `<option value="${section.id}">${section.name} (${this.getSectionChannelsCount(section.id)} قنوات)</option>`
            ).join('');
    }

    // دالة جديدة لتعبئة فلتر القسم
    populateSectionFilter() {
        const filter = document.getElementById('channelSectionFilter');
        if (!filter) return;
        
        filter.innerHTML = '<option value="">جميع الأقسام</option>' +
            this.sections.map(section => 
                `<option value="${section.id}" ${this.currentSectionFilter === section.id ? 'selected' : ''}>${section.name} (${this.getSectionChannelsCount(section.id)} قنوات)</option>`
            ).join('');
    }

    // دالة جديدة للحصول على عدد القنوات في قسم معين
    getSectionChannelsCount(sectionId) {
        return this.channels.filter(channel => channel.sectionId === sectionId).length;
    }

    updateStats() {
        document.getElementById('totalSections').textContent = this.sections.length;
        document.getElementById('totalChannels').textContent = this.channels.length;
        document.getElementById('activeSections').textContent = this.sections.filter(s => s.isActive !== false).length;
        
        // حساب الإشعارات النشطة
        const now = new Date();
        const activeNotifications = this.notifications.filter(n => 
            n.status === 'active' && 
            (!n.expiryDate || new Date(n.expiryDate) > now)
        );
        document.getElementById('activeNotifications').textContent = activeNotifications.length;
    }

    // وظائف إدارة الأقسام
    async saveSection(event) {
        event.preventDefault();
        
        const sectionData = {
            name: document.getElementById('sectionName').value,
            order: parseInt(document.getElementById('sectionOrder').value),
            isActive: document.getElementById('sectionStatus').value === 'active',
            description: document.getElementById('sectionDescription').value,
            image: document.getElementById('sectionImage').value,
            updatedAt: new Date()
        };
        
        if (!sectionData.name.trim()) {
            this.showAlert('يرجى إدخال اسم القسم', 'error');
            return;
        }
        
        const sectionId = document.getElementById('sectionId').value;
        
        try {
            if (sectionId) {
                // تحديث قسم موجود
                if (this.firestoreAvailable) {
                    const db = firebaseUtils.getDB();
                    await db.collection('sections').doc(sectionId).update(sectionData);
                }
                
                const index = this.sections.findIndex(s => s.id === sectionId);
                if (index !== -1) {
                    this.sections[index] = { ...this.sections[index], ...sectionData };
                }
                
                this.showAlert('تم تحديث القسم بنجاح', 'success');
            } else {
                // إضافة قسم جديد
                sectionData.createdAt = new Date();
                let newSectionId;
                
                if (this.firestoreAvailable) {
                    const db = firebaseUtils.getDB();
                    const docRef = await db.collection('sections').add(sectionData);
                    newSectionId = docRef.id;
                } else {
                    newSectionId = 'local_' + Date.now();
                    sectionData.id = newSectionId;
                }
                
                this.sections.push({
                    id: newSectionId,
                    ...sectionData
                });
                
                this.showAlert('تم إضافة القسم بنجاح', 'success');
            }
            
            this.saveDataToLocalStorage();
            this.renderData();
            this.resetSectionForm();
            
        } catch (error) {
            console.error('❌ خطأ في حفظ القسم:', error);
            this.showAlert('خطأ في حفظ القسم: ' + error.message, 'error');
        }
    }

    editSection(sectionId) {
        const section = this.sections.find(s => s.id === sectionId);
        if (!section) return;
        
        this.editingSection = section;
        
        document.getElementById('sectionId').value = section.id;
        document.getElementById('sectionName').value = section.name;
        document.getElementById('sectionOrder').value = section.order || 1;
        document.getElementById('sectionStatus').value = section.isActive !== false ? 'active' : 'inactive';
        document.getElementById('sectionDescription').value = section.description || '';
        document.getElementById('sectionImage').value = section.image || '';
        
        document.getElementById('sectionFormTitle').textContent = 'تعديل القسم';
        document.getElementById('sectionSaveButton').textContent = 'تحديث القسم';
        document.getElementById('cancelSectionEdit').style.display = 'block';
        
        this.updateImagePreview(section.image, 'sectionImagePreview');
        
        // التمرير إلى الأعلى
        document.getElementById('sectionForm').scrollIntoView({ behavior: 'smooth' });
    }

    cancelEditSection() {
        this.editingSection = null;
        this.resetSectionForm();
    }

    resetSectionForm() {
        document.getElementById('sectionForm').reset();
        document.getElementById('sectionId').value = '';
        document.getElementById('sectionFormTitle').textContent = 'إضافة قسم جديد';
        document.getElementById('sectionSaveButton').textContent = 'حفظ القسم';
        document.getElementById('cancelSectionEdit').style.display = 'none';
        document.getElementById('sectionImagePreview').style.display = 'none';
    }

    // وظائف إدارة القنوات
    async saveChannel(event) {
        event.preventDefault();
        
        const channelData = {
            name: document.getElementById('channelName').value,
            image: document.getElementById('channelImage').value,
            url: document.getElementById('channelUrl').value,
            sectionId: document.getElementById('channelSection').value,
            appUrl: document.getElementById('channelAppUrl').value || 'https://play.google.com/store/apps/details?id=com.xpola.player',
            downloadUrl: 'https://play.google.com/store/apps/details?id=com.xpola.player',
            updatedAt: new Date()
        };
        
        if (!channelData.name.trim() || !channelData.url.trim() || !channelData.sectionId) {
            this.showAlert('يرجى ملء جميع الحقول المطلوبة', 'error');
            return;
        }
        
        const channelId = document.getElementById('channelId').value;
        
        try {
            if (channelId) {
                // تحديث قناة موجودة - نأخذ الترتيب من الحقل
                channelData.order = parseInt(document.getElementById('channelOrder').value) || 1;
                
                if (this.firestoreAvailable) {
                    const db = firebaseUtils.getDB();
                    await db.collection('channels').doc(channelId).update(channelData);
                }
                
                const index = this.channels.findIndex(c => c.id === channelId);
                if (index !== -1) {
                    this.channels[index] = { ...this.channels[index], ...channelData };
                }
                
                // إعادة ترتيب القنوات في نفس القسم
                await this.reorderSectionChannels(channelData.sectionId);
                
                this.showAlert('تم تحديث القناة وإعادة ترتيب القنوات بنجاح', 'success');
            } else {
                // إضافة قناة جديدة - نعطيها ترتيب تلقائي
                const sectionChannels = this.channels.filter(c => c.sectionId === channelData.sectionId);
                let maxOrder = 0;
                
                if (sectionChannels.length > 0) {
                    maxOrder = Math.max(...sectionChannels.map(c => c.order || 0));
                }
                
                channelData.order = maxOrder + 1;
                channelData.createdAt = new Date();
                
                let newChannelId;
                
                if (this.firestoreAvailable) {
                    const db = firebaseUtils.getDB();
                    const docRef = await db.collection('channels').add(channelData);
                    newChannelId = docRef.id;
                } else {
                    newChannelId = 'local_' + Date.now();
                    channelData.id = newChannelId;
                }
                
                this.channels.push({
                    id: newChannelId,
                    ...channelData
                });
                
                this.showAlert(`تم إضافة القناة بنجاح في المركز ${channelData.order}`, 'success');
            }
            
            this.saveDataToLocalStorage();
            this.renderData();
            this.resetChannelForm();
            
        } catch (error) {
            console.error('❌ خطأ في حفظ القناة:', error);
            this.showAlert('خطأ في حفظ القناة: ' + error.message, 'error');
        }
    }

    editChannel(channelId) {
        const channel = this.channels.find(c => c.id === channelId);
        if (!channel) return;
        
        this.editingChannel = channel;
        
        document.getElementById('channelId').value = channel.id;
        document.getElementById('channelName').value = channel.name;
        document.getElementById('channelImage').value = channel.image || '';
        document.getElementById('channelUrl').value = channel.url;
        
        // عرض الترتيب الحالي وتمكين التعديل
        document.getElementById('channelOrder').value = channel.order || 1;
        document.getElementById('channelOrder').disabled = false;
        document.getElementById('channelOrder').readOnly = false;
        
        document.getElementById('channelSection').value = channel.sectionId;
        document.getElementById('channelAppUrl').value = channel.appUrl || 'https://play.google.com/store/apps/details?id=com.xpola.player';
        
        document.getElementById('channelFormTitle').textContent = 'تعديل القناة';
        document.getElementById('channelSaveButton').textContent = 'تحديث القناة';
        document.getElementById('cancelChannelEdit').style.display = 'block';
        
        // تحديث نص المساعدة
        const orderHelp = document.getElementById('orderHelpText');
        if (orderHelp) {
            const sectionChannels = this.channels.filter(c => c.sectionId === channel.sectionId);
            const sortedSectionChannels = [...sectionChannels].sort((a, b) => (a.order || 999) - (b.order || 999));
            const currentIndex = sortedSectionChannels.findIndex(c => c.id === channelId);
            orderHelp.textContent = `الترتيب الحالي: ${channel.order || 1} (المركز ${currentIndex + 1} من ${sortedSectionChannels.length})`;
        }
        
        this.updateImagePreview(channel.image, 'channelImagePreview');
        
        // التمرير إلى الأعلى
        document.getElementById('channelForm').scrollIntoView({ behavior: 'smooth' });
    }

    cancelEditChannel() {
        this.editingChannel = null;
        this.resetChannelForm();
    }

    resetChannelForm() {
        document.getElementById('channelForm').reset();
        document.getElementById('channelId').value = '';
        document.getElementById('channelFormTitle').textContent = 'إضافة قناة جديدة';
        document.getElementById('channelSaveButton').textContent = 'حفظ القناة';
        document.getElementById('cancelChannelEdit').style.display = 'none';
        document.getElementById('channelImagePreview').style.display = 'none';
        document.getElementById('channelAppUrl').value = 'https://play.google.com/store/apps/details?id=com.xpola.player';
        document.getElementById('channelOrder').value = '1';
        document.getElementById('channelOrder').disabled = true;
        document.getElementById('channelOrder').readOnly = true;
        document.getElementById('orderHelpText').textContent = 'سيتم تعيين الترتيب تلقائياً عند الحفظ';
    }

    // وظائف تحريك الترتيب
    async moveChannelUp(channelId) {
        const channel = this.channels.find(c => c.id === channelId);
        if (!channel) return;
        
        // الحصول على جميع القنوات في نفس القسم مرتبة
        const sectionChannels = this.channels
            .filter(c => c.sectionId === channel.sectionId)
            .sort((a, b) => (a.order || 999) - (b.order || 999));
        
        const currentIndex = sectionChannels.findIndex(c => c.id === channelId);
        
        if (currentIndex > 0) {
            // العثور على القناة السابقة
            const previousChannel = sectionChannels[currentIndex - 1];
            
            // تبادل الترتيب مع القناة السابقة
            const tempOrder = channel.order;
            channel.order = previousChannel.order;
            previousChannel.order = tempOrder;
            
            // تحديث في Firebase إذا كان متاحاً
            if (this.firestoreAvailable) {
                const db = firebaseUtils.getDB();
                await Promise.all([
                    db.collection('channels').doc(channel.id).update({ order: channel.order }),
                    db.collection('channels').doc(previousChannel.id).update({ order: previousChannel.order })
                ]);
            }
            
            this.saveDataToLocalStorage();
            this.renderData();
            this.showAlert('تم نقل القناة للأعلى', 'success');
        } else {
            this.showAlert('لا يمكن نقل القناة للأعلى، هي بالفعل في الأعلى', 'warning');
        }
    }

    async moveChannelDown(channelId) {
        const channel = this.channels.find(c => c.id === channelId);
        if (!channel) return;
        
        // الحصول على جميع القنوات في نفس القسم مرتبة
        const sectionChannels = this.channels
            .filter(c => c.sectionId === channel.sectionId)
            .sort((a, b) => (a.order || 999) - (b.order || 999));
        
        const currentIndex = sectionChannels.findIndex(c => c.id === channelId);
        
        if (currentIndex < sectionChannels.length - 1) {
            // العثور على القناة التالية
            const nextChannel = sectionChannels[currentIndex + 1];
            
            // تبادل الترتيب مع القناة التالية
            const tempOrder = channel.order;
            channel.order = nextChannel.order;
            nextChannel.order = tempOrder;
            
            // تحديث في Firebase إذا كان متاحاً
            if (this.firestoreAvailable) {
                const db = firebaseUtils.getDB();
                await Promise.all([
                    db.collection('channels').doc(channel.id).update({ order: channel.order }),
                    db.collection('channels').doc(nextChannel.id).update({ order: nextChannel.order })
                ]);
            }
            
            this.saveDataToLocalStorage();
            this.renderData();
            this.showAlert('تم نقل القناة للأسفل', 'success');
        } else {
            this.showAlert('لا يمكن نقل القناة للأسفل، هي بالفعل في الأسفل', 'warning');
        }
    }

    // وظيفة إعادة ترتيب جميع القنوات
    async reorderAllChannels() {
        if (!confirm('هل أنت متأكد من إعادة ترتيب جميع القنوات؟ سيتم إعادة ترتيب القنوات في جميع الأقسام.')) {
            return;
        }
        
        try {
            this.showAlert('جاري إعادة ترتيب جميع القنوات...', 'info');
            
            // الحصول على جميع الأقسام الفريدة
            const uniqueSectionIds = [...new Set(this.channels.map(c => c.sectionId))];
            
            // إعادة ترتيب القنوات في كل قسم
            for (const sectionId of uniqueSectionIds) {
                await this.reorderSectionChannels(sectionId);
            }
            
            this.saveDataToLocalStorage();
            this.renderData();
            this.showAlert('تم إعادة ترتيب جميع القنوات في جميع الأقسام تلقائياً', 'success');
            
        } catch (error) {
            console.error('❌ خطأ في إعادة الترتيب:', error);
            this.showAlert('خطأ في إعادة الترتيب: ' + error.message, 'error');
        }
    }

    // وظيفة مساعدة لإعادة ترتيب القنوات في قسم معين
    async reorderSectionChannels(sectionId) {
        // الحصول على جميع القنوات في القسم
        const sectionChannels = this.channels
            .filter(c => c.sectionId === sectionId);
        
        // إذا لم توجد قنوات، نخرج
        if (sectionChannels.length === 0) return;
        
        // فرز القنوات حسب الترتيب الحالي
        sectionChannels.sort((a, b) => (a.order || 999) - (b.order || 999));
        
        console.log(`🔧 إعادة ترتيب ${sectionChannels.length} قناة في القسم ${sectionId}`);
        
        // تحديث الترتيب بالتسلسل (1، 2، 3، ...)
        for (let i = 0; i < sectionChannels.length; i++) {
            const channel = sectionChannels[i];
            const newOrder = i + 1;
            
            // تحديث الترتيب فقط إذا تغير
            if (channel.order !== newOrder) {
                channel.order = newOrder;
                console.log(`📝 تحديث الترتيب: ${channel.name} → ${newOrder}`);
                
                // تحديث في Firebase إذا كان متاحاً
                if (this.firestoreAvailable) {
                    const db = firebaseUtils.getDB();
                    await db.collection('channels').doc(channel.id).update({ order: newOrder });
                }
            }
        }
        
        console.log(`✅ تم إعادة ترتيب القنوات في القسم ${sectionId}`);
    }

    // وظائف الفلترة حسب القسم
    filterChannelsBySection() {
        const sectionFilter = document.getElementById('channelSectionFilter');
        if (!sectionFilter) return;
        
        this.currentSectionFilter = sectionFilter.value;
        this.renderChannelsList();
    }

    // فلترة حسب قسم معين
    filterBySection(sectionId) {
        this.currentSectionFilter = sectionId;
        document.getElementById('channelSectionFilter').value = sectionId;
        this.renderChannelsList();
    }

    // عرض قنوات قسم معين (من قائمة الأقسام)
    viewSectionChannels(sectionId) {
        // التبديل إلى تبويب القنوات
        const channelsTab = document.querySelector('[href="#channelsTab"]');
        if (channelsTab) {
            channelsTab.click();
        }
        
        // تطبيق الفلترة
        setTimeout(() => {
            this.filterBySection(sectionId);
        }, 300);
    }

    // إزالة الفلترة
    clearSectionFilter() {
        this.currentSectionFilter = '';
        document.getElementById('channelSectionFilter').value = '';
        this.renderChannelsList();
    }

    // تحديث معلومات الفلترة
    updateFilterInfo() {
        const filterInfo = document.getElementById('filterInfo');
        const filterInfoText = document.getElementById('filterInfoText');
        
        if (this.currentSectionFilter && filterInfo && filterInfoText) {
            const section = this.sections.find(s => s.id === this.currentSectionFilter);
            if (section) {
                const channelCount = this.getSectionChannelsCount(section.id);
                filterInfoText.textContent = `جاري عرض ${channelCount} قناة في قسم "${section.name}" فقط`;
                filterInfo.style.display = 'block';
            }
        } else if (filterInfo) {
            filterInfo.style.display = 'none';
        }
    }

    // وظائف إدارة الإشعارات
    async saveNotification(event) {
        event.preventDefault();
        
        const notificationData = {
            title: document.getElementById('notificationTitle').value,
            message: document.getElementById('notificationMessage').value,
            type: document.getElementById('notificationType').value,
            status: document.getElementById('notificationStatus').value,
            link: document.getElementById('notificationLink').value || '',
            linkText: document.getElementById('notificationLinkText').value || '',
            expiryDate: document.getElementById('notificationExpiry').value ? 
                new Date(document.getElementById('notificationExpiry').value) : null,
            updatedAt: new Date()
        };
        
        if (!notificationData.title.trim() || !notificationData.message.trim()) {
            this.showAlert('يرجى إدخال عنوان ونص الإشعار', 'error');
            return;
        }
        
        const notificationId = document.getElementById('notificationId').value;
        
        try {
            if (notificationId) {
                // تحديث إشعار موجود
                if (this.firestoreAvailable) {
                    const db = firebaseUtils.getDB();
                    await db.collection('notifications').doc(notificationId).update(notificationData);
                }
                
                const index = this.notifications.findIndex(n => n.id === notificationId);
                if (index !== -1) {
                    this.notifications[index] = { ...this.notifications[index], ...notificationData };
                }
                
                this.showAlert('تم تحديث الإشعار بنجاح', 'success');
            } else {
                // إضافة إشعار جديد
                notificationData.createdAt = new Date();
                let newNotificationId;
                
                if (this.firestoreAvailable) {
                    const db = firebaseUtils.getDB();
                    const docRef = await db.collection('notifications').add(notificationData);
                    newNotificationId = docRef.id;
                } else {
                    newNotificationId = 'local_' + Date.now();
                    notificationData.id = newNotificationId;
                }
                
                this.notifications.push({
                    id: newNotificationId,
                    ...notificationData
                });
                
                this.showAlert('تم إرسال الإشعار بنجاح', 'success');
            }
            
            this.saveDataToLocalStorage();
            this.renderData();
            this.resetNotificationForm();
            
        } catch (error) {
            console.error('❌ خطأ في حفظ الإشعار:', error);
            this.showAlert('خطأ في حفظ الإشعار: ' + error.message, 'error');
        }
    }

    editNotification(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (!notification) return;
        
        this.editingNotification = notification;
        
        document.getElementById('notificationId').value = notification.id;
        document.getElementById('notificationTitle').value = notification.title;
        document.getElementById('notificationMessage').value = notification.message;
        document.getElementById('notificationType').value = notification.type || 'info';
        document.getElementById('notificationStatus').value = notification.status || 'active';
        document.getElementById('notificationLink').value = notification.link || '';
        document.getElementById('notificationLinkText').value = notification.linkText || '';
        
        if (notification.expiryDate) {
            const expiryDate = new Date(notification.expiryDate);
            document.getElementById('notificationExpiry').value = expiryDate.toISOString().split('T')[0];
        } else {
            document.getElementById('notificationExpiry').value = '';
        }
        
        document.getElementById('notificationFormTitle').textContent = 'تعديل الإشعار';
        document.getElementById('notificationSaveButton').textContent = 'تحديث الإشعار';
        document.getElementById('cancelNotificationEdit').style.display = 'block';
        
        // التمرير إلى الأعلى
        document.getElementById('notificationForm').scrollIntoView({ behavior: 'smooth' });
    }

    cancelEditNotification() {
        this.editingNotification = null;
        this.resetNotificationForm();
    }

    resetNotificationForm() {
        document.getElementById('notificationForm').reset();
        document.getElementById('notificationId').value = '';
        document.getElementById('notificationFormTitle').textContent = 'إرسال إشعار جديد';
        document.getElementById('notificationSaveButton').textContent = 'إرسال الإشعار';
        document.getElementById('cancelNotificationEdit').style.display = 'none';
        document.getElementById('notificationType').value = 'info';
        document.getElementById('notificationStatus').value = 'active';
    }

    async deleteNotification(notificationId) {
        if (!confirm('هل أنت متأكد من حذف هذا الإشعار؟')) return;
        
        try {
            if (this.firestoreAvailable) {
                const db = firebaseUtils.getDB();
                await db.collection('notifications').doc(notificationId).delete();
            }
            
            this.notifications = this.notifications.filter(n => n.id !== notificationId);
            
            this.saveDataToLocalStorage();
            this.renderData();
            
            this.showAlert('تم حذف الإشعار بنجاح', 'success');
            
        } catch (error) {
            console.error('❌ خطأ في حذف الإشعار:', error);
            this.showAlert('خطأ في حذف الإشعار: ' + error.message, 'error');
        }
    }

    async deleteSection(sectionId) {
        if (!confirm('هل أنت متأكد من حذف هذا القسم؟ سيتم حذف جميع القنوات المرتبطة به.')) return;
        
        try {
            if (this.firestoreAvailable) {
                const db = firebaseUtils.getDB();
                await db.collection('sections').doc(sectionId).delete();
                
                const channelsToDelete = this.channels.filter(c => c.sectionId === sectionId);
                for (const channel of channelsToDelete) {
                    await db.collection('channels').doc(channel.id).delete();
                }
            }
            
            this.sections = this.sections.filter(s => s.id !== sectionId);
            this.channels = this.channels.filter(c => c.sectionId !== sectionId);
            
            // إذا كان القسم المحذوف هو القسم المفلتر حالياً، أزل الفلترة
            if (this.currentSectionFilter === sectionId) {
                this.clearSectionFilter();
            }
            
            this.saveDataToLocalStorage();
            this.renderData();
            
            this.showAlert('تم حذف القسم وجميع قنواته بنجاح', 'success');
            
        } catch (error) {
            console.error('❌ خطأ في حذف القسم:', error);
            this.showAlert('خطأ في حذف القسم: ' + error.message, 'error');
        }
    }

    async deleteChannel(channelId) {
        if (!confirm('هل أنت متأكد من حذف هذه القناة؟')) return;
        
        try {
            const channelToDelete = this.channels.find(c => c.id === channelId);
            if (!channelToDelete) return;
            
            const sectionId = channelToDelete.sectionId;
            
            if (this.firestoreAvailable) {
                const db = firebaseUtils.getDB();
                await db.collection('channels').doc(channelId).delete();
            }
            
            // حذف القناة من المصفوفة
            this.channels = this.channels.filter(c => c.id !== channelId);
            
            // إعادة ترتيب القنوات المتبقية في نفس القسم
            await this.reorderSectionChannels(sectionId);
            
            this.saveDataToLocalStorage();
            this.renderData();
            
            this.showAlert('تم حذف القناة وإعادة ترتيب القنوات المتبقية', 'success');
            
        } catch (error) {
            console.error('❌ خطأ في حذف القناة:', error);
            this.showAlert('خطأ في حذف القناة: ' + error.message, 'error');
        }
    }

    filterChannels() {
        const searchTerm = document.getElementById('channelSearch').value.toLowerCase();
        
        if (!searchTerm) {
            this.filteredChannels = null;
        } else {
            this.filteredChannels = this.channels.filter(channel => 
                channel.name.toLowerCase().includes(searchTerm)
            );
        }
        
        this.renderChannelsList();
    }

    filterNotifications() {
        const searchTerm = document.getElementById('notificationSearch').value.toLowerCase();
        const typeFilter = document.getElementById('notificationTypeFilter').value;
        const statusFilter = document.getElementById('notificationStatusFilter').value;
        
        this.filteredNotifications = this.notifications.filter(notification => {
            const matchesSearch = searchTerm === '' || 
                notification.title.toLowerCase().includes(searchTerm) ||
                notification.message.toLowerCase().includes(searchTerm);
            
            const matchesType = typeFilter === '' || notification.type === typeFilter;
            const matchesStatus = statusFilter === '' || notification.status === statusFilter;
            
            return matchesSearch && matchesType && matchesStatus;
        });
        
        this.renderNotificationsList();
    }

    updateImagePreview(imageUrl, previewId) {
        const preview = document.getElementById(previewId);
        if (preview && imageUrl && imageUrl.trim() !== '') {
            preview.src = imageUrl;
            preview.style.display = 'block';
        } else {
            preview.style.display = 'none';
        }
    }

    saveDataToLocalStorage() {
        try {
            firebaseUtils.saveToLocalStorage('bein_sections', this.sections);
            firebaseUtils.saveToLocalStorage('bein_channels', this.channels);
            firebaseUtils.saveToLocalStorage('bein_notifications', this.notifications);
            console.log('💾 تم حفظ البيانات في التخزين المحلي');
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    async retryFirebaseConnection() {
        this.showFirebaseStatus('جاري إعادة الاتصال بقاعدة البيانات...', 'warning');
        await this.checkFirebase();
        
        if (this.firestoreAvailable) {
            await this.loadDataFromFirestore();
        }
    }

    showFirebaseHelp() {
        const firebaseTab = document.querySelector('[href="#firebaseTab"]');
        if (firebaseTab) {
            firebaseTab.click();
        }
    }

    async exportData() {
        try {
            const data = {
                sections: this.sections,
                channels: this.channels,
                notifications: this.notifications,
                exportedAt: new Date(),
                version: '3.0'
            };

            const dataStr = JSON.stringify(data, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            
            const url = URL.createObjectURL(dataBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bein-sport-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showAlert('تم تصدير البيانات بنجاح', 'success');
        } catch (error) {
            console.error('❌ فشل تصدير البيانات:', error);
            this.showAlert('فشل تصدير البيانات: ' + error.message, 'error');
        }
    }

    async importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                
                if (!data.sections || !data.channels) {
                    throw new Error('ملف البيانات غير صالح');
                }

                if (confirm('هل أنت متأكد من استيراد البيانات؟ سيتم استبدال جميع البيانات الحالية.')) {
                    this.showAlert('جاري استيراد البيانات...', 'info');
                    
                    if (this.firestoreAvailable) {
                        // حذف البيانات الحالية من Firebase
                        await this.clearFirebaseData();
                        
                        // استيراد الأقسام
                        const sectionPromises = data.sections.map(section => {
                            const { id, ...sectionData } = section;
                            const db = firebaseUtils.getDB();
                            return db.collection('sections').doc(id).set(sectionData);
                        });

                        // استيراد القنوات
                        const channelPromises = data.channels.map(channel => {
                            const { id, ...channelData } = channel;
                            const db = firebaseUtils.getDB();
                            return db.collection('channels').doc(id).set(channelData);
                        });

                        // استيراد الإشعارات
                        const notificationPromises = data.notifications ? 
                            data.notifications.map(notification => {
                                const { id, ...notificationData } = notification;
                                const db = firebaseUtils.getDB();
                                return db.collection('notifications').doc(id).set(notificationData);
                            }) : [];

                        await Promise.all([...sectionPromises, ...channelPromises, ...notificationPromises]);
                    }
                    
                    // تحديث البيانات المحلية
                    this.sections = data.sections;
                    this.channels = data.channels;
                    this.notifications = data.notifications || [];
                    this.saveDataToLocalStorage();
                    this.renderData();
                    
                    this.showAlert('تم استيراد البيانات بنجاح', 'success');
                }
            } catch (error) {
                console.error('❌ فشل استيراد البيانات:', error);
                this.showAlert('فشل استيراد البيانات: ' + error.message, 'error');
            }
        };
        
        input.click();
    }

    async clearFirebaseData() {
        if (!this.firestoreAvailable) return;

        try {
            const db = firebaseUtils.getDB();
            
            // حذف جميع القنوات
            const channelsSnapshot = await db.collection('channels').get();
            const channelDeletes = channelsSnapshot.docs.map(doc => doc.ref.delete());

            // حذف جميع الأقسام
            const sectionsSnapshot = await db.collection('sections').get();
            const sectionDeletes = sectionsSnapshot.docs.map(doc => doc.ref.delete());

            // حذف جميع الإشعارات
            const notificationsSnapshot = await db.collection('notifications').get();
            const notificationDeletes = notificationsSnapshot.docs.map(doc => doc.ref.delete());

            await Promise.all([...channelDeletes, ...sectionDeletes, ...notificationDeletes]);
            console.log('✅ تم مسح جميع البيانات من Firebase');

        } catch (error) {
            console.error('❌ فشل مسح البيانات:', error);
            throw error;
        }
    }

    refreshData() {
        this.showAlert('جاري تحديث البيانات...', 'info');
        this.loadData();
    }

    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show mt-3`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const adminPanel = document.getElementById('adminPanel');
        if (adminPanel) {
            adminPanel.insertBefore(alertDiv, adminPanel.firstChild);
        }
        
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    logout() {
        localStorage.removeItem('adminAuth');
        localStorage.removeItem('adminEmail');
        window.location.href = 'index.html';
    }

    setupUI() {
        // إضافة CSS إضافي
        const style = document.createElement('style');
        style.textContent = `
            .channel-order-badge {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 30px;
                height: 30px;
                background: linear-gradient(135deg, #42318F, #654FD4);
                border-radius: 50%;
                font-weight: bold;
                font-size: 14px;
                color: white;
                box-shadow: 0 3px 6px rgba(0,0,0,0.3);
            }
            
            .channel-item {
                background: rgba(255, 255, 255, 0.05);
                padding: 15px;
                margin-bottom: 10px;
                border-radius: 10px;
                border: 1px solid rgba(66, 49, 143, 0.3);
                transition: all 0.3s ease;
                position: relative;
            }
            
            .channel-item:hover {
                background: rgba(66, 49, 143, 0.2);
                border-color: #654FD4;
                transform: translateY(-3px);
                box-shadow: 0 8px 20px rgba(0,0,0,0.3);
            }
            
            .channel-thumbnail {
                width: 60px;
                height: 40px;
                object-fit: cover;
                border-radius: 6px;
                border: 2px solid rgba(255,255,255,0.1);
            }
            
            .action-buttons {
                display: flex;
                gap: 5px;
            }
            
            .action-buttons .btn-sm {
                padding: 6px 10px;
                font-size: 13px;
                transition: all 0.2s ease;
            }
            
            .action-buttons .btn-sm:hover:not(.disabled) {
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            }
            
            .action-buttons .btn-info {
                background: linear-gradient(135deg, #17a2b8, #138496);
                border: none;
            }
            
            .action-buttons .btn-warning {
                background: linear-gradient(135deg, #ffc107, #e0a800);
                border: none;
            }
            
            .action-buttons .btn-danger {
                background: linear-gradient(135deg, #dc3545, #c82333);
                border: none;
            }
            
            .action-buttons .disabled {
                cursor: not-allowed;
                opacity: 0.5;
            }
            
            .move-up-btn:not(.disabled):hover {
                background: linear-gradient(135deg, #138496, #117a8b) !important;
            }
            
            .move-down-btn:not(.disabled):hover {
                background: linear-gradient(135deg, #138496, #117a8b) !important;
            }
            
            .btn-info {
                background: linear-gradient(135deg, #17a2b8, #138496);
                border: none;
                color: white;
                padding: 8px 16px;
                border-radius: 6px;
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: bold;
            }
            
            .btn-info:hover {
                background: linear-gradient(135deg, #138496, #117a8b);
                transform: translateY(-2px);
                box-shadow: 0 6px 12px rgba(0,0,0,0.3);
            }
            
            .section-badge {
                background: rgba(101, 79, 212, 0.2);
                padding: 2px 8px;
                border-radius: 4px;
                border: 1px solid #654FD4;
                transition: all 0.3s ease;
            }
            
            .section-badge:hover {
                background: rgba(101, 79, 212, 0.4);
                cursor: pointer;
            }
            
            .filter-info {
                animation: slideIn 0.3s ease;
            }
            
            @keyframes slideIn {
                from { transform: translateY(-10px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
}

// تهيئة النظام
document.addEventListener('DOMContentLoaded', () => {
    window.adminManager = new AdminManager();
});
