async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

let storedHash = localStorage.getItem('teacherPasswordHash');
if (!storedHash) {
    hashPassword('admin123').then(hash => {
        localStorage.setItem('teacherPasswordHash', hash);
        storedHash = hash;
    });
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('themeToggle').textContent = '☀️';
    }
}

function toggleTheme() {
    const body = document.body;
    const btn = document.getElementById('themeToggle');
    
    if (body.classList.contains('dark-mode')) {
        body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
        btn.textContent = '🌙';
    } else {
        body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
        btn.textContent = '☀️';
    }
}

let apps = JSON.parse(localStorage.getItem('educationalApps')) || [
    { 
        name: "StudyBuddy", 
        link: "https://josewhite72-beep.github.io/StudyBuddy-/", 
        description: "Herramienta de estudio interactiva",
        category: "english",
        usageCount: 0,
        studentVisible: true
    },
    { 
        name: "Activities", 
        link: "https://activities-by-skills.netlify.app/", 
        description: "Ejercicios por habilidades",
        category: "general",
        usageCount: 0,
        studentVisible: true
    },
    { 
        name: "Adventure", 
        link: "https://barrigon-adventure.vercel.app/", 
        description: "Juego educativo de aventura",
        category: "games",
        usageCount: 0,
        studentVisible: true
    }
];

let currentFilter = 'all';
let searchTerm = '';

function saveApps() {
    localStorage.setItem('educationalApps', JSON.stringify(apps));
}

function showHome() {
    document.getElementById('homeScreen').classList.remove('hidden');
    document.getElementById('studentZone').classList.add('hidden');
    document.getElementById('adminPanel').classList.add('hidden');
}

function showStudentZone() {
    document.getElementById('homeScreen').classList.add('hidden');
    document.getElementById('studentZone').classList.remove('hidden');
    document.getElementById('adminPanel').classList.add('hidden');
    
    const spinner = document.getElementById('loadingSpinner');
    spinner.classList.add('visible');
    
    setTimeout(() => {
        spinner.classList.remove('visible');
        renderApps();
    }, 500);
}

function renderApps() {
    const container = document.getElementById('appsContainer');
    container.innerHTML = '';
    
    let filteredApps = apps.filter(app => {
        const isVisible = app.studentVisible !== false;
        const matchesCategory = currentFilter === 'all' || app.category === currentFilter;
        const matchesSearch = !searchTerm || 
            app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (app.description && app.description.toLowerCase().includes(searchTerm.toLowerCase()));
        return isVisible && matchesCategory && matchesSearch;
    });
    
    if (filteredApps.length === 0) {
        container.innerHTML = '<p style="color: #666; padding: 2rem;">No se encontraron apps. Intenta con otra búsqueda.</p>';
        return;
    }
    
    filteredApps.forEach((app, index) => {
        const card = document.createElement('div');
        card.className = 'app-card';
        card.innerHTML = `
            <span class="app-category">${getCategoryLabel(app.category)}</span>
            <strong>${escapeHtml(app.name)}</strong>
            <small>${escapeHtml(app.description || 'Sin descripción')}</small>
            <a href="${escapeHtml(app.link)}" target="_blank" rel="noopener noreferrer" onclick="trackUsage(${index})">Abrir app →</a>
        `;
        container.appendChild(card);
    });
}

function getCategoryLabel(category) {
    const labels = {
        'math': 'Matemáticas',
        'english': 'Inglés',
        'science': 'Ciencias',
        'games': 'Juegos',
        'tools': 'Herramientas',
        'general': 'General'
    };
    return labels[category] || 'General';
}

function trackUsage(index) {
    apps[index].usageCount = (apps[index].usageCount || 0) + 1;
    saveApps();
}

function showAdminPanel() {
    document.getElementById('homeScreen').classList.add('hidden');
    document.getElementById('studentZone').classList.add('hidden');
    document.getElementById('adminPanel').classList.remove('hidden');
    renderAdminAppsList();
    updateStats();
}

function updateStats() {
    document.getElementById('totalApps').textContent = apps.length;
    const categories = new Set(apps.map(app => app.category || 'general'));
    document.getElementById('totalCategories').textContent = categories.size;
}

function renderAdminAppsList() {
    const container = document.getElementById('adminAppsList');
    container.innerHTML = '';
    
    if (apps.length === 0) {
        container.innerHTML = '<p style="color: #666; text-align: center; padding: 1rem;">No hay apps aún. Agrega la primera.</p>';
        return;
    }
    
    const sortedApps = [...apps].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
    
    sortedApps.forEach((app, idx) => {
        const originalIndex = apps.indexOf(app);
        const div = document.createElement('div');
        div.className = 'admin-app-item';
        div.innerHTML = `
            <div class="admin-app-info">
                <strong>${escapeHtml(app.name)}</strong>
                <small>${escapeHtml(app.description || 'Sin descripción')} | ${getCategoryLabel(app.category)} | Usos: ${app.usageCount || 0}</small>
                <div style="font-size: 0.8rem; color: #999; margin-top: 0.3rem;">
                    <a href="${escapeHtml(app.link)}" target="_blank" style="color: #ff6f61;">${escapeHtml(app.link)}</a>
                </div>
            </div>
            <div class="admin-app-actions">
                <button class="toggle-btn" data-index="${originalIndex}" style="background:${app.studentVisible !== false ? '#2ecc71' : '#95a5a6'}">
                    ${app.studentVisible !== false ? '👁️ Visible' : '🙈 Oculta'}
                </button>
                <button class="edit-btn" data-index="${originalIndex}">✏️ Editar</button>
                <button class="delete-btn" data-index="${originalIndex}">🗑️ Eliminar</button>
            </div>
        `;
        container.appendChild(div);
    });

    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.getAttribute('data-index'));
            apps[idx].studentVisible = apps[idx].studentVisible === false ? true : false;
            saveApps();
            renderAdminAppsList();
        });
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(btn.getAttribute('data-index'));
            editApp(idx);
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(btn.getAttribute('data-index'));
            deleteApp(idx);
        });
    });
}

function addApp(name, link, description, category) {
    if (!name || !link) {
        alert('El nombre y la URL son obligatorios.');
        return false;
    }
    
    if (!link.startsWith('http://') && !link.startsWith('https://')) {
        alert('La URL debe comenzar con http:// o https://');
        return false;
    }
    
    apps.push({ 
        name: name.trim(), 
        link: link.trim(), 
        description: description?.trim() || '',
        category: category || 'general',
        usageCount: 0,
        studentVisible: true
    });
    
    saveApps();
    renderAdminAppsList();
    updateStats();
    return true;
}

function editApp(index) {
    const app = apps[index];
    const newName = prompt('Editar nombre:', app.name);
    if (newName === null) return;
    
    const newLink = prompt('Editar URL:', app.link);
    if (newLink === null) return;
    
    const newDesc = prompt('Editar descripción:', app.description || '');
    if (newDesc === null) return;
    
    const categories = ['general', 'math', 'english', 'science', 'games', 'tools'];
    const newCategory = prompt(`Editar categoría (${categories.join(', ')}):`, app.category || 'general');
    if (newCategory === null) return;
    
    apps[index] = { 
        ...app,
        name: newName.trim(), 
        link: newLink.trim(), 
        description: newDesc.trim(),
        category: categories.includes(newCategory) ? newCategory : 'general'
    };
    
    saveApps();
    renderAdminAppsList();
}

function deleteApp(index) {
    if (confirm(`¿Eliminar la app "${apps[index].name}"?`)) {
        apps.splice(index, 1);
        saveApps();
        renderAdminAppsList();
        updateStats();
    }
}

async function authenticateTeacher() {
    const pwd = prompt('🔐 Introduce la contraseña de profesor:');
    if (!pwd) return false;
    
    const inputHash = await hashPassword(pwd);
    if (inputHash === storedHash) {
        showAdminPanel();
        return true;
    } else {
        alert('❌ Contraseña incorrecta');
        return false;
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('studentZoneBtn').addEventListener('click', showStudentZone);
    document.getElementById('teacherZoneBtn').addEventListener('click', authenticateTeacher);
    document.getElementById('backHomeBtn').addEventListener('click', showHome);
    document.getElementById('closeAdminBtn').addEventListener('click', showHome);
    
    document.getElementById('searchApps').addEventListener('input', (e) => {
        searchTerm = e.target.value;
        renderApps();
    });
    
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-category');
            renderApps();
        });
    });
    
    document.getElementById('addAppBtn').addEventListener('click', () => {
        const name = document.getElementById('appName').value;
        const link = document.getElementById('appLink').value;
        const desc = document.getElementById('appDesc').value;
        const category = document.getElementById('appCategory').value;
        
        if (addApp(name, link, desc, category)) {
            document.getElementById('appName').value = '';
            document.getElementById('appLink').value = '';
            document.getElementById('appDesc').value = '';
            document.getElementById('appCategory').value = 'general';
            
            const btn = document.getElementById('addAppBtn');
            const originalText = btn.textContent;
            btn.textContent = '✅ ¡Agregado!';
            btn.style.background = '#2ecc71';
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '';
            }, 1500);
        }
    });
});
