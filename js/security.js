// نظام حماية متكامل
class SiteProtection {
    constructor() {
        this.allowedDomains = [
             wacelalorshe.github.io ,
             jedwal.netlify.app 
        ];
        
        this.init();
    }
    
    init() {
        if (!this.checkDomain()) {
            this.blockSite();
        }
    }
    
    checkDomain() {
        const domain = window.location.hostname;
        for (const allowed of this.allowedDomains) {
            if (domain.includes(allowed)) {
                return true;
            }
        }
        return false;
    }
    
    blockSite() {
        // منع تحميل Firebase
        window.firebase = null;
        
        // منع أي طلبات
        window.fetch = null;
        XMLHttpRequest.prototype.open = function() {};
        
        // عرض رسالة
        document.body.innerHTML = this.getBlockMessage();
        
        // منع أي أكواد أخرى
        throw new Error( Site Blocked );
    }
    
    getBlockMessage() {
        return `
            <div style="padding:50px;text-align:center;">
                <h1 style="color:red;">⛔ محتوى محمي</h1>
                <p>الرجاء استخدام الموقع الرسمي فقط</p>
                <a href="https://wacelalorshe.github.io/jedwal/">افتح الموقع الرسمي</a>
            </div>
        `;
    }
}

// تشغيل الحماية فوراً
new SiteProtection();
