// js/matches.js
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date();
    document.getElementById('greg-date').textContent = today.toLocaleDateString('ar-AR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // تهيئة Firebase للمباريات
    initializeMatchesFirebase();
    loadMatches();
});

function loadMatches() {
    const container = document.getElementById('matches-container');
    if (!matchesDb) {
        container.innerHTML = '<div class="error">❌ خطأ في تحميل البيانات.</div>';
        return;
    }

    matchesDb.ref('matches').on('value', snapshot => {
        displayMatches(snapshot);
    }, error => {
        console.error(error);
        container.innerHTML = '<div class="error">❌ حدث خطأ في تحميل المباريات</div>';
    });
}

function openXpolaApp(link) { 
    if (link && link !== '#') {
        window.location.href = link;
    } else {
        window.open('https://play.google.com/store/apps/details?id=com.xpola.player', '_blank');
    }
}

function displayMatches(snapshot) {
    const container = document.getElementById('matches-container');
    container.innerHTML = '';
    
    if (!snapshot.exists()) { 
        container.innerHTML = '<div class="loading">لا توجد مباريات اليوم</div>'; 
        return; 
    }

    const matches = snapshot.val();
    let hasMatches = false;
    
    for (const key in matches) {
        const match = matches[key];
        hasMatches = true;
        
        const matchDiv = document.createElement('div');
        matchDiv.className = 'match-box fade-in';
        matchDiv.innerHTML = `
            <div class="match-info">
                <div>
                    <img src="${match.team1Logo || 'https://via.placeholder.com/50x50/2F2562/FFFFFF?text=T1'}" 
                         alt="${match.team1 || 'فريق 1'}"
                         onerror="this.src='https://via.placeholder.com/50x50/2F2562/FFFFFF?text=T1'">
                    <p>${match.team1 || 'فريق 1'}</p>
                </div>
                <div><span class="match-time">${match.time || '00:00'}</span></div>
                <div>
                    <img src="${match.team2Logo || 'https://via.placeholder.com/50x50/2F2562/FFFFFF?text=T2'}" 
                         alt="${match.team2 || 'فريق 2'}"
                         onerror="this.src='https://via.placeholder.com/50x50/2F2562/FFFFFF?text=T2'">
                    <p>${match.team2 || 'فريق 2'}</p>
                </div>
            </div>
            <div class="match-details">
                <div>${match.channel || 'قناة غير محددة'}</div>
                <div>${match.commentator || 'معلق غير محدد'}</div>
            </div>
            <div class="match-actions">
                <button class="btn btn-success" onclick="openXpolaApp('${match.xmtvLink || '#'}')">
                    📱 مشاهدة المباراة
                </button>
                <button class="btn btn-info" onclick="window.open('https://play.google.com/store/apps/details?id=com.xpola.player','_blank')">
                    ⬇️ تحميل مشغل القناة
                </button>
            </div>
        `;
        container.appendChild(matchDiv);
    }
    
    if (!hasMatches) {
        container.innerHTML = '<div class="loading">لا توجد مباريات اليوم</div>';
    }
}
