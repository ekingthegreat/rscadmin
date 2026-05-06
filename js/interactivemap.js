const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DB_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// --- GLOBALS ---
let map;
let markers = [];
let reports = {};
let modalReportsCache = {}; // Cache data for filtering
let currentZoom = 1;
let currentRotation = 0;
let activeFilters = { status: 'all', type: 'all', date: 'all', customDate: null };

const emergencyColors = { 'landslide': '#8B4513', 'fire': '#FF0000', 'earthquake': '#FFA500', 'flood': '#0000FF', 'storm': '#008080', 'ems': '#008000' };
const typeNames = { 'landslide': 'Landslide', 'fire': 'Fire Incident', 'earthquake': 'Earthquake', 'flood': 'Flood', 'storm': 'Storm Surge', 'ems': 'Medical Emergency' };

// --- AUTH (UPDATED with localStorage) ---
function checkAuth() {
    if (sessionStorage.getItem('isAdminLoggedIn')) return true;
    if (localStorage.getItem('isAdminLoggedIn')) {
        sessionStorage.setItem('isAdminLoggedIn', 'true'); // Restore session
        return true;
    }
    window.location.href = "login.html";
    return false;
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', function () {
    if (!checkAuth()) return;

    document.getElementById("menu-toggle")?.addEventListener("click", () => document.getElementById("navbar").classList.toggle("active"));

    // Modal Closing
    document.getElementById('closeModal').onclick = () => document.getElementById('reportModal').style.display = 'none';
    document.getElementById('closeAllReportsModal').onclick = () => document.getElementById('allReportsModal').style.display = 'none';
    document.getElementById('fullscreenClose').onclick = () => { document.getElementById('fullscreenModal').style.display = 'none'; resetZoom(); };

    window.onclick = (e) => {
        if (e.target.id === 'reportModal') e.target.style.display = 'none';
        if (e.target.id === 'allReportsModal') e.target.style.display = 'none';
        if (e.target.id === 'fullscreenModal') { e.target.style.display = 'none'; resetZoom(); }
    };

    // Controls
    document.getElementById('statusFilter').onchange = applyFilters;
    document.getElementById('typeFilter').onchange = applyFilters;
    document.getElementById('dateFilter').onchange = function () {
        document.getElementById('customDateGroup').style.display = (this.value === 'custom') ? 'block' : 'none';
        if (this.value !== 'custom') applyFilters();
    };
    document.getElementById('customDate').onchange = applyFilters;
    document.getElementById('resetFilter').onclick = resetFilters;

    document.getElementById('viewAllReportsBtn').onclick = () => { loadAllReportsData(); document.getElementById('allReportsModal').style.display = 'flex'; };

    // Zoom
    document.getElementById('zoomInBtn').onclick = () => { currentZoom += 0.2; updateZoom(); };
    document.getElementById('zoomOutBtn').onclick = () => { if (currentZoom > 0.4) currentZoom -= 0.2; updateZoom(); };
    document.getElementById('rotateBtn').onclick = () => { currentRotation += 90; updateZoom(); };
    document.getElementById('downloadBtn').onclick = () => {
        const a = document.createElement('a'); a.href = document.getElementById('fullscreenMedia').src; a.download = 'evidence.jpg'; a.click();
    };

    loadGoogleMapsAPI();
});

// --- MAP ---
function loadGoogleMapsAPI() {
    if (window.google && window.google.maps) { initMap(); return; }
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&callback=initMap`;
    s.async = true; s.defer = true;
    document.head.appendChild(s);
}

window.initMap = function () {
    map = new google.maps.Map(document.getElementById('googleMap'), {
        zoom: 13, center: { lat: 7.7823, lng: 122.5868 },
        mapTypeControl: false, streetViewControl: false, fullscreenControl: false
    });

    document.getElementById('currentLocationBtn').onclick = () => {
        if (navigator.geolocation) navigator.geolocation.getCurrentPosition(p => {
            map.setCenter({ lat: p.coords.latitude, lng: p.coords.longitude }); map.setZoom(15);
        });
    };
    document.getElementById('layersBtn').onclick = () => map.setMapTypeId(map.getMapTypeId() === 'satellite' ? 'roadmap' : 'satellite');

    loadReports();
};

function getIcon(type) {
    const c = emergencyColors[type] || '#333';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40"><path fill="${c}" d="M15 0C6.7 0 0 6.7 0 15c0 11 15 25 15 25s15-14 15-25C30 6.7 23.3 0 15 0z"/><circle cx="15" cy="15" r="7" fill="white"/></svg>`;
    return { url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg), scaledSize: new google.maps.Size(30, 40) };
}

function loadReports() {
    database.ref('reports').on('value', snap => {
        markers.forEach(m => m.setMap(null)); markers = [];
        reports = snap.val() || {};
        Object.entries(reports).forEach(([id, r]) => {
            if (r.latitude && r.longitude && passesFilters(r)) {
                const m = new google.maps.Marker({ position: { lat: +r.latitude, lng: +r.longitude }, map: map, title: r.title, icon: getIcon(r.emergencyType) });
                m.addListener('click', () => showDetails(id));
                markers.push(m);
            }
        });
    });
}

function passesFilters(r) {
    if (activeFilters.status !== 'all' && r.status !== activeFilters.status) return false;
    if (activeFilters.type !== 'all' && r.emergencyType !== activeFilters.type) return false;
    if (activeFilters.date !== 'all' && r.date) {
        const d = new Date(r.date); const n = new Date();
        if (activeFilters.date === 'today' && d.toDateString() !== n.toDateString()) return false;
        if (activeFilters.date === 'custom' && activeFilters.customDate && d.toDateString() !== new Date(activeFilters.customDate).toDateString()) return false;
    }
    return true;
}

function applyFilters() {
    activeFilters.status = document.getElementById('statusFilter').value;
    activeFilters.type = document.getElementById('typeFilter').value;
    activeFilters.date = document.getElementById('dateFilter').value;
    activeFilters.customDate = document.getElementById('customDate').value;
    markers.forEach(m => m.setMap(null)); markers = [];
    Object.entries(reports).forEach(([id, r]) => {
        if (r.latitude && r.longitude && passesFilters(r)) {
            const m = new google.maps.Marker({ position: { lat: +r.latitude, lng: +r.longitude }, map: map, title: r.title, icon: getIcon(r.emergencyType) });
            m.addListener('click', () => showDetails(id));
            markers.push(m);
        }
    });
}

function resetFilters() {
    document.getElementById('statusFilter').value = 'all';
    document.getElementById('typeFilter').value = 'all';
    document.getElementById('dateFilter').value = 'all';
    document.getElementById('customDateGroup').style.display = 'none';
    activeFilters = { status: 'all', type: 'all', date: 'all', customDate: null };
    applyFilters();
}

// --- DETAILS ---
window.showDetails = function (id) {
    const r = reports[id]; if (!r) return;

    document.getElementById('modalTitle').textContent = r.title || 'Incident Report';
    document.getElementById('modalDateDisplay').textContent = r.date;
    document.getElementById('modalReporter').textContent = r.createdByName || 'Unknown';
    document.getElementById('modalType').textContent = typeNames[r.emergencyType] || r.emergencyType;
    document.getElementById('modalTime').textContent = r.formattedTime || r.time;
    document.getElementById('modalLat').textContent = parseFloat(r.latitude).toFixed(6);
    document.getElementById('modalLng').textContent = parseFloat(r.longitude).toFixed(6);

    let badgeClass = 'badge-pending';
    if (r.status === 'accepted') badgeClass = 'badge-accepted';
    if (r.status === 'responding') badgeClass = 'badge-responding';
    if (r.status === 'resolved' || r.status === 'mapped') badgeClass = 'badge-resolved';
    document.getElementById('modalStatus').innerHTML = `<span class="badge ${badgeClass}">${r.status}</span>`;

    const mc = document.getElementById('modalMediaContainer');
    if (r.mediaUrl) {
        mc.innerHTML = `<img src="${r.mediaUrl}" class="modal-media"><div class="media-overlay-hint"><i class="fas fa-search-plus"></i> Zoom</div>`;
        mc.style.display = 'flex';
        mc.onclick = () => {
            document.getElementById('fullscreenMedia').src = r.mediaUrl;
            document.getElementById('fullscreenModal').style.display = 'flex';
            resetZoom();
        };
    } else {
        mc.innerHTML = `<div style="color:#666"><i class="fas fa-image-slash fa-2x"></i><br>No visual evidence</div>`;
        mc.onclick = null;
    }

    loadFiles(id);
    document.getElementById('reportModal').style.display = 'flex';
    if (map) map.setCenter({ lat: +r.latitude, lng: +r.longitude });
};

function loadFiles(mid) {
    const tb = document.getElementById('incidentFilesBody');
    tb.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#999;padding:20px">Searching files...</td></tr>';

    database.ref('incident_files').orderByChild('missionId').equalTo(mid).once('value').then(snap => {
        tb.innerHTML = '';
        const data = snap.val();
        if (data) {
            Object.values(data).forEach(f => {
                let icon = '<i class="fas fa-file"></i>';
                if ((f.fileName || '').match(/pdf/i)) icon = '<i class="fas fa-file-pdf"></i>';
                else if ((f.fileName || '').match(/jpg|png/i)) icon = '<i class="fas fa-file-image"></i>';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><div class="file-row"><div class="file-icon-box">${icon}</div> <strong>${f.fileName || 'File'}</strong></div></td>
                    <td><div style="font-size:0.8rem">${f.userId || 'System'}</div></td>
                    <td><span class="badge" style="background:#f3f4f6;color:#374151;font-weight:500">${f.uploadType || 'File'}</span></td>
                    <td style="text-align:right"><a href="${f.fileUrl}" target="_blank" class="btn-download"><i class="fas fa-download"></i> Open</a></td>
                `;
                tb.appendChild(tr);
            });
        } else {
            tb.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#999;padding:20px">No files attached.</td></tr>';
        }
    });
}

// --- ALL REPORTS LOG & FILTERING ---
function loadAllReportsData() {
    const loader = document.getElementById('reportsLoading');
    const table = document.getElementById('reportsTable');
    loader.style.display = 'block'; table.style.display = 'none';

    database.ref('reports').once('value').then(snap => {
        const data = snap.val();
        modalReportsCache = data || {};
        let s = { total: 0, pending: 0, accepted: 0, mapped: 0 };

        if (data) {
            Object.values(data).forEach(r => {
                s.total++;
                if (r.status === 'pending') s.pending++;
                else if (r.status === 'accepted') s.accepted++;
                else if (r.status === 'resolved' || r.status === 'mapped') s.mapped++;
            });
        }

        document.getElementById('totalReports').innerText = s.total;
        document.getElementById('pendingReports').innerText = s.pending;
        document.getElementById('acceptedReports').innerText = s.accepted;
        document.getElementById('mappedReports').innerText = s.mapped;

        renderLogTable('all');
        loader.style.display = 'none'; table.style.display = 'table';
    });
}

// Render Function based on Filter
function renderLogTable(filterType) {
    const tbody = document.getElementById('reportsTableBody');
    tbody.innerHTML = '';

    Object.entries(modalReportsCache).forEach(([id, r]) => {
        if (filterType === 'pending' && r.status !== 'pending') return;
        if (filterType === 'resolved' && (r.status !== 'resolved' && r.status !== 'mapped')) return;

        let badgeClass = 'badge-pending';
        if (r.status === 'accepted') badgeClass = 'badge-accepted';
        if (r.status === 'responding') badgeClass = 'badge-responding';
        if (r.status === 'resolved' || r.status === 'mapped') badgeClass = 'badge-resolved';

        let team = 'Unassigned';
        if (r.rescueTeams) team = Object.values(r.rescueTeams)[0].userName || 'Team';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${typeNames[r.emergencyType] || r.emergencyType}</strong></td>
            <td><span class="badge ${badgeClass}">${r.status}</span></td>
            <td>${r.createdByName || '-'}</td>
            <td>${r.date}<br><small style="color:#999">${r.formattedTime || ''}</small></td>
            <td>${team}</td>
            <td><small style="font-family:monospace">${parseFloat(r.latitude).toFixed(4)}, ${parseFloat(r.longitude).toFixed(4)}</small></td>
            <td style="text-align:right"><button class="btn-view" onclick="showDetails('${id}')"><i class="fas fa-eye"></i> View</button></td>
          `;
        tbody.appendChild(tr);
    });
}

// UI Helper
window.filterModalTable = function (type, btn) {
    document.querySelectorAll('.modal-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderLogTable(type);
}

function updateZoom() { document.getElementById('fullscreenMedia').style.transform = `scale(${currentZoom}) rotate(${currentRotation}deg)`; }
function resetZoom() { currentZoom = 1; currentRotation = 0; updateZoom(); }