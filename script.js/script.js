// ==================== STATE & CONFIG ====================
let user = null;
let loc = null;
let stream = null;
let cameraActive = false;
let watchId = null;

// Koordinat Kantor (ganti dengan koordinat Anda)
const KANTOR_COORDINATES = { lat: -7.733037202562703, lng: 111.26253526915374 };
const RADIUS_METER = 50;

// ==================== UTILITY FUNCTIONS ====================
function showLoading(message = 'Memproses...') {
  const loading = document.getElementById('globalLoading');
  if (loading) {
    loading.style.display = 'flex';
    const p = loading.querySelector('p');
    if (p) p.textContent = message;
  }
}

function hideLoading() {
  const loading = document.getElementById('globalLoading');
  if (loading) loading.style.display = 'none';
}

function showToast(message, type = 'info') {
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true
  });
  
  Toast.fire({ icon: type, title: message });
}

// ==================== SESSION MANAGEMENT ====================
function saveSession(userData) {
  localStorage.setItem('sigap_user', JSON.stringify(userData));
  user = userData;
}

function loadSession() {
  const stored = localStorage.getItem('sigap_user');
  if (stored) {
    user = JSON.parse(stored);
    showMainApp();
    updateUserInfo();
    loadPage('dashboard');
    startLocationTracking();
  }
}

function clearSession() {
  localStorage.removeItem('sigap_user');
  user = null;
}

function showMainApp() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('mainApp').style.display = 'block';
  document.body.style.background = 'var(--ivory)';
}

function showLoginPage() {
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('mainApp').style.display = 'none';
  document.body.style.background = 'linear-gradient(135deg, var(--black) 0%, #2A2A2A 100%)';
  stopLocationTracking();
  stopCamera();
}

// ==================== LOGIN (SIMPLE) ====================
function doLogin() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  if (!username || !password) {
    Swal.fire({ icon: 'warning', title: 'Lengkapi Data', text: 'Username dan password harus diisi' });
    return;
  }
  
  showLoading();
  
  // SIMPLE LOGIN - hardcoded untuk demo
  setTimeout(() => {
    hideLoading();
    
    if (username === 'admin' && password === 'admin123') {
      user = {
        username: 'admin',
        nama: 'Administrator',
        jabatan: 'Super Admin',
        foto: 'https://ui-avatars.com/api/?name=Administrator&background=D4AF37&color=111111&size=256',
        role: 'admin'
      };
      
      saveSession(user);
      showMainApp();
      updateUserInfo();
      loadPage('dashboard');
      startLocationTracking();
      
      Swal.fire({ icon: 'success', title: 'Selamat Datang!', timer: 1500, showConfirmButton: false });
    } else {
      Swal.fire({ icon: 'error', title: 'Login Gagal', text: 'Username/password salah' });
    }
  }, 1000);
}

function logout() {
  stopCamera();
  stopLocationTracking();
  clearSession();
  showLoginPage();
}

function confirmLogout() {
  Swal.fire({
    title: 'Konfirmasi Keluar',
    text: 'Apakah Anda yakin ingin keluar?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#D4AF37',
    confirmButtonText: 'Ya, Keluar'
  }).then((result) => {
    if (result.isConfirmed) logout();
  });
}

function updateUserInfo() {
  if (!user) return;
  document.getElementById('userNama').innerText = user.nama;
  document.getElementById('userJabatan').innerText = user.jabatan;
  document.getElementById('userFoto').src = user.foto;
}

// ==================== LOCATION ====================
function startLocationTracking() {
  if (!navigator.geolocation) return;
  
  watchId = navigator.geolocation.watchPosition(
    pos => {
      loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      updateLocationInfo();
    },
    error => console.log("GPS Error:", error),
    { enableHighAccuracy: true, timeout: 15000 }
  );
}

function stopLocationTracking() {
  if (watchId) navigator.geolocation.clearWatch(watchId);
}

function calculateDistance(lat1, lat2, lon1, lon2) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI/180;
  const p2 = lat2 * Math.PI/180;
  const dp = (lat2-lat1) * Math.PI/180;
  const dl = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dp/2)*Math.sin(dp/2) + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)*Math.sin(dl/2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

function getCurrentDistance() {
  if (!loc) return null;
  return calculateDistance(loc.lat, KANTOR_COORDINATES.lat, loc.lng, KANTOR_COORDINATES.lng);
}

function updateLocationInfo() {
  const distance = getCurrentDistance();
  const jarakInfo = document.getElementById('jarakInfo');
  if (distance && jarakInfo) {
    const within = distance <= RADIUS_METER;
    jarakInfo.innerHTML = `<i class="fas ${within ? 'fa-check-circle' : 'fa-exclamation-triangle'} me-1"></i> ${distance}m dari kantor`;
    jarakInfo.style.color = within ? 'var(--success)' : 'var(--warning)';
  }
}

// ==================== CAMERA ====================
async function startCamera() {
  const video = document.getElementById('webcam');
  if (!video) return;
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    window.stream = stream;
    video.srcObject = stream;
    cameraActive = true;
    
    video.onloadedmetadata = () => {
      video.play();
      updateCameraStatus('active', 'Kamera Aktif');
      hideCameraPlaceholder();
    };
  } catch (err) {
    console.error('Camera error:', err);
    showCameraError(err.name);
  }
}

function stopCamera() {
  if (window.stream) {
    window.stream.getTracks().forEach(track => track.stop());
    window.stream = null;
  }
  cameraActive = false;
}

function updateCameraStatus(status, message) {
  const el = document.querySelector('.camera-status');
  if (!el) return;
  
  el.classList.remove('active', 'error');
  if (status === 'active') el.classList.add('active');
  if (status === 'error') el.classList.add('error');
  el.innerHTML = `<i class="fas ${status === 'active' ? 'fa-check-circle' : 'fa-exclamation-circle'} me-1"></i> ${message}`;
}

function hideCameraPlaceholder() {
  const placeholder = document.querySelector('.no-camera-placeholder');
  if (placeholder) placeholder.remove();
  const video = document.getElementById('webcam');
  if (video) video.style.display = 'block';
}

function showCameraError(errorType) {
  const container = document.querySelector('.camera-container');
  const video = document.getElementById('webcam');
  if (video) video.style.display = 'none';
  
  let message = 'Gagal mengakses kamera';
  if (errorType === 'NotAllowedError') message = 'Izin kamera ditolak';
  if (errorType === 'NotFoundError') message = 'Kamera tidak ditemukan';
  
  const placeholder = document.createElement('div');
  placeholder.className = 'no-camera-placeholder';
  placeholder.innerHTML = `
    <i class="fas fa-video-slash"></i>
    <h5 style="color: var(--gold);">Kamera Tidak Tersedia</h5>
    <p style="color: #999;">${message}</p>
    <button class="btn-camera mt-3" onclick="forceRetryCamera()">
      <i class="fas fa-sync-alt"></i> Coba Lagi
    </button>
  `;
  container.appendChild(placeholder);
  updateCameraStatus('error', message);
}

function forceRetryCamera() {
  stopCamera();
  setTimeout(() => startCamera(), 1000);
}

async function capturePhoto() {
  const video = document.getElementById('webcam');
  if (!video || !cameraActive) throw new Error('Kamera tidak aktif');
  
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  const ctx = canvas.getContext('2d');
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
}

// ==================== NAVIGATION ====================
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('show');
}

function loadPage(page) {
  // Update active nav
  document.querySelectorAll('.nav-link-custom').forEach(el => el.classList.remove('active'));
  if (event && event.target) {
    const nav = event.target.closest('.nav-link-custom');
    if (nav) nav.classList.add('active');
  }
  
  // Close sidebar on mobile
  if (window.innerWidth < 992) {
    document.getElementById('sidebar').classList.remove('show');
  }
  
  // Render page
  const content = document.getElementById('contentArea');
  
  switch(page) {
    case 'dashboard':
      renderDashboard(content);
      break;
    case 'presensi':
      renderPresensi(content);
      break;
    case 'about':
      renderAbout(content);
      break;
  }
}

// ==================== PAGE RENDERS ====================
function renderDashboard(content) {
  const distance = getCurrentDistance();
  const within = distance ? distance <= RADIUS_METER : false;
  
  content.innerHTML = `
    <div class="content-load">
      <h4 class="mb-4"><i class="fas fa-home me-2" style="color: var(--gold);"></i>Dashboard</h4>
      
      ${distance ? `
        <div class="location-card mb-4">
          <div class="location-info">
            <div><i class="fas fa-map-marker-alt me-2" style="color: var(--gold);"></i>Jarak dari Kantor</div>
            <div><span class="distance-indicator">${distance}</span><span class="distance-unit">m</span></div>
          </div>
          <div class="radius-progress">
            <div class="radius-fill" style="width: ${Math.min(100, (distance/RADIUS_METER)*100)}%; 
                 background: ${within ? 'var(--success)' : 'var(--danger)'};"></div>
          </div>
          <span class="location-status ${within ? 'status-within' : 'status-outside'}">
            <i class="fas ${within ? 'fa-check-circle' : 'fa-exclamation-triangle'} me-1"></i>
            ${within ? 'Dalam Radius' : 'Luar Radius'}
          </span>
        </div>
      ` : '<p class="text-muted">Mengambil lokasi...</p>'}
      
      <div class="card-lux p-4 text-center">
        <i class="fas fa-user-check fa-4x mb-3" style="color: var(--gold);"></i>
        <h5>Selamat Datang, ${user.nama}</h5>
        <p class="text-muted">${user.jabatan}</p>
        <button class="btn-lux mt-3" onclick="loadPage('presensi')">
          <i class="fas fa-camera me-2"></i>Presensi Sekarang
        </button>
      </div>
    </div>
  `;
}

function renderPresensi(content) {
  content.innerHTML = `
    <div class="content-load">
      <h4 class="mb-4"><i class="fas fa-camera me-2" style="color: var(--gold);"></i>Presensi</h4>
      
      <div class="card-lux p-4">
        <div class="row">
          <div class="col-md-6 mb-4">
            <div class="camera-container">
              <video id="webcam" autoplay playsinline muted style="display:none;"></video>
              <div class="camera-status"><i class="fas fa-spinner fa-spin me-1"></i> Memeriksa kamera...</div>
              <div class="camera-overlay"><div class="face-guide"></div></div>
              <div class="camera-controls">
                <button class="btn-camera" onclick="forceRetryCamera()"><i class="fas fa-sync-alt"></i></button>
              </div>
            </div>
          </div>
          
          <div class="col-md-6">
            <div id="locInfo" class="mb-4"></div>
            
            <div class="mb-4">
              <label class="form-label fw-bold">Status Kehadiran</label>
              <select id="statusPresensi" class="form-select">
                <option value="Hadir">Hadir (dengan foto)</option>
                <option value="Izin">Izin (tanpa foto)</option>
                <option value="Sakit">Sakit (tanpa foto)</option>
              </select>
            </div>
            
            <button class="btn-lux w-100" onclick="submitPresensi()">
              <i class="fas fa-paper-plane me-2"></i>KIRIM PRESENSI
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Start camera after render
  setTimeout(() => {
    updateLocationInfo();
    startCamera();
  }, 500);
}

function renderAbout(content) {
  content.innerHTML = `
    <div class="content-load">
      <h4 class="mb-4"><i class="fas fa-info-circle me-2" style="color: var(--gold);"></i>Tentang</h4>
      
      <div class="card-lux p-5 text-center">
        <div class="logo-container mb-4" style="width:80px; height:80px; margin:0 auto;">
          <img src="https://res.cloudinary.com/maswardi/image/upload/v1769768658/afiks_gwju4y.png" 
               style="width:100%; height:100%; object-fit:contain;">
        </div>
        <h3 class="fw-bold" style="color:var(--gold);">SIGAP</h3>
        <p class="text-muted">Sistem Geolokasi Absensi</p>
        <p class="mt-4">Versi 1.0 - Simple Version</p>
        <p class="text-muted small mt-4">© 2024</p>
      </div>
    </div>
  `;
}

// ==================== PRESENSI ====================
async function submitPresensi() {
  const status = document.getElementById('statusPresensi').value;
  
  if (status === 'Hadir' && !cameraActive) {
    Swal.fire({ icon: 'warning', title: 'Kamera Tidak Aktif', text: 'Aktifkan kamera untuk presensi Hadir' });
    return;
  }
  
  if (status === 'Hadir' && (!loc || getCurrentDistance() > RADIUS_METER)) {
    Swal.fire({ icon: 'error', title: 'Luar Radius', text: 'Anda harus berada dalam radius kantor' });
    return;
  }
  
  const confirm = await Swal.fire({
    title: 'Konfirmasi Presensi',
    html: `Status: <strong>${status}</strong>`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#D4AF37',
    confirmButtonText: 'Ya, Kirim!'
  });
  
  if (!confirm.isConfirmed) return;
  
  showLoading('Mengirim presensi...');
  
  try {
    let photo = null;
    if (status === 'Hadir') {
      photo = await capturePhoto();
    }
    
    // Simulasi sukses
    setTimeout(() => {
      hideLoading();
      stopCamera();
      
      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Presensi telah dicatat',
        confirmButtonColor: '#D4AF37'
      }).then(() => loadPage('dashboard'));
    }, 1500);
    
  } catch (err) {
    hideLoading();
    Swal.fire({ icon: 'error', title: 'Error', text: err.message });
  }
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  loadSession();
});