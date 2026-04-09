// ── SMART CITY MANAGEMENT SYSTEM – CORE JS ──

// ─── AUTH ───────────────────────────────────────────────────────────
const Auth = {
  getUsers() { return JSON.parse(localStorage.getItem('sc_users') || '[]'); },
  saveUsers(u) { localStorage.setItem('sc_users', JSON.stringify(u)); },
  getCurrent() { return JSON.parse(localStorage.getItem('sc_current') || 'null'); },
  setCurrent(u) { localStorage.setItem('sc_current', JSON.stringify(u)); },
  logout() { localStorage.removeItem('sc_current'); window.location.href = getRootPath() + 'login.html'; },
  isAdmin(u) { return u && u.role === 'admin'; },
  register(name, email, phone, password) {
    const users = this.getUsers();
    if (users.find(u => u.email === email)) return { ok: false, msg: 'Email already registered.' };
    const user = { id: 'U' + Date.now(), name, email, phone, password, role: 'user', joined: new Date().toISOString() };
    users.push(user);
    this.saveUsers(users);
    return { ok: true, user };
  },
  login(email, password) {
    // built-in admin
    if (email === 'admin@smartcity.gov' && password === 'admin123') {
      const admin = { id: 'admin', name: 'Admin', email, role: 'admin' };
      this.setCurrent(admin);
      return { ok: true, user: admin };
    }
    const users = this.getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return { ok: false, msg: 'Invalid email or password.' };
    this.setCurrent(user);
    return { ok: true, user };
  }
};

// ─── COMPLAINTS ──────────────────────────────────────────────────────
const Complaints = {
  getAll() { return JSON.parse(localStorage.getItem('sc_complaints') || '[]'); },
  save(list) { localStorage.setItem('sc_complaints', JSON.stringify(list)); },
  add(data) {
    const list = this.getAll();
    const id = 'CMP-' + new Date().getFullYear() + '-' + String(list.length + 1).padStart(4, '0');
    const complaint = {
      id, ...data,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      adminNote: ''
    };
    list.unshift(complaint);
    this.save(list);
    return complaint;
  },
  getById(id) { return this.getAll().find(c => c.id === id); },
  updateStatus(id, status, note = '') {
    const list = this.getAll();
    const i = list.findIndex(c => c.id === id);
    if (i === -1) return false;
    list[i].status = status;
    list[i].adminNote = note;
    list[i].updatedAt = new Date().toISOString();
    this.save(list);
    return true;
  },
  getByUser(userId) { return this.getAll().filter(c => c.userId === userId); },
  seedDemo() {
    if (this.getAll().length > 0) return;
    const demos = [
      { userId:'demo1', userName:'Ramesh Patel', userPhone:'9876543210', service:'Electricity', title:'Power cut since morning', description:'No electricity in our area since 8am. Transformer issue near main road.', location:'Sector 7, Ward 4', lat:22.3039, lng:70.8022, status:'Solved', adminNote:'Transformer replaced.', createdAt: new Date(Date.now()-86400000*3).toISOString(), updatedAt: new Date(Date.now()-86400000).toISOString() },
      { userId:'demo2', userName:'Priya Shah', userPhone:'9988776655', service:'Water', title:'No water supply for 2 days', description:'Water supply has been cut off. Please resolve urgently.', location:'Ghogha Rd, Ward 2', lat:22.3100, lng:70.7950, status:'In Progress', adminNote:'Team dispatched.', createdAt: new Date(Date.now()-86400000*2).toISOString(), updatedAt: new Date(Date.now()-3600000).toISOString() },
      { userId:'demo3', userName:'Amit Joshi', userPhone:'9123456789', service:'Road', title:'Large pothole near school', description:'Dangerous pothole near primary school causing accidents.', location:'Station Rd, Ward 1', lat:22.2950, lng:70.8100, status:'Pending', adminNote:'', createdAt: new Date(Date.now()-3600000*5).toISOString(), updatedAt: new Date(Date.now()-3600000*5).toISOString() },
    ];
    const list = demos.map((d, i) => ({ id: 'CMP-2026-' + String(i+1).padStart(4,'0'), ...d }));
    this.save(list);
  }
};

// ─── LOCATION ────────────────────────────────────────────────────────
const Location = {
  current: null,
  async detect(onSuccess, onError) {
    if (!navigator.geolocation) { onError('Geolocation not supported.'); return; }
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        this.current = { lat, lng };
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
          const data = await res.json();
          const addr = data.address;
          const label = [addr.road, addr.suburb, addr.city || addr.town || addr.village, addr.postcode].filter(Boolean).join(', ');
          this.current.label = label;
          onSuccess({ lat, lng, label });
        } catch {
          this.current.label = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          onSuccess(this.current);
        }
      },
      err => onError(err.message || 'Location access denied.')
    );
  }
};

// ─── UTILITIES ───────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.className = 'toast ' + type;
  t.innerHTML = (type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️') + ' ' + msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function statusBadge(s) {
  const map = { Pending: 'badge-pending', 'In Progress': 'badge-progress', Solved: 'badge-solved', Rejected: 'badge-rejected' };
  return `<span class="badge ${map[s] || 'badge-pending'}">${s}</span>`;
}

function getRootPath() {
  const path = window.location.pathname;
  return path.includes('/Services/') ? '../' : '';
}

function requireLogin(adminOnly = false) {
  const user = Auth.getCurrent();
  const root = getRootPath();
  if (!user) { window.location.href = root + 'login.html'; return null; }
  if (adminOnly && !Auth.isAdmin(user)) { window.location.href = root + 'index.html'; return null; }
  return user;
}

function renderNavUser() {
  const user = Auth.getCurrent();
  const el = document.getElementById('nav-user');
  if (!el) return;
  if (user) {
    el.innerHTML = `<div class="nav-user" onclick="window.location.href='${getRootPath()}${Auth.isAdmin(user) ? 'admin.html' : 'mycomplaints.html'}'">
      <div class="nav-avatar">${user.name[0].toUpperCase()}</div>
      <span>${user.name.split(' ')[0]}</span>
    </div>
    <div class="nav-user" onclick="Auth.logout()" style="margin-left:4px;padding:6px 10px;font-size:12px">Logout</div>`;
  } else {
    el.innerHTML = `<a href="${getRootPath()}login.html" class="btn btn-sm" style="margin-left:12px">Login</a>`;
  }
}

function initHamburger() {
  const btn = document.getElementById('hamburger');
  const nav = document.querySelector('nav');
  if (btn && nav) btn.onclick = () => nav.classList.toggle('open');
}

function initMap(containerId, lat, lng, label) {
  const c = document.getElementById(containerId);
  if (!c) return;
  c.style.height = '220px';
  c.innerHTML = `<iframe width="100%" height="220" frameborder="0" scrolling="no" marginheight="0" marginwidth="0"
    src="https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.01},${lat-0.01},${lng+0.01},${lat+0.01}&layer=mapnik&marker=${lat},${lng}"
    style="border:0;display:block"></iframe>`;
}

// ─── ON LOAD ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Complaints.seedDemo();
  renderNavUser();
  initHamburger();
});
