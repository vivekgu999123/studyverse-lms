// ===================== ADMIN PANEL JS =====================
const API = '/api';
let AdminState = { user: null, currentView: 'overview', confirmCallback: null };

// ── UTILS ───────────────────────────────────────────────
const $ = id => document.getElementById(id);
const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function getToken() { return localStorage.getItem('sv_admin_token'); }

async function api(method, endpoint, body = null, isFormData = false) {
  const headers = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const opts = { method, headers };
  if (body) opts.body = isFormData ? body : JSON.stringify(body);
  const res = await fetch(API + endpoint, opts);
  if (endpoint.includes('/export/')) return res; // raw for CSV
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Request failed');
  return data;
}

function showErr(id, msg) { const e=$(id); if(!e)return; e.textContent=msg; e.classList.add('show'); }
function clearErr(id) { const e=$(id); if(!e)return; e.textContent=''; e.classList.remove('show'); }

function toast(msg, type='info') {
  const icons = {success:'✅',error:'❌',info:'ℹ️',warning:'⚠️'};
  const c = $('toastContainer');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = '<span>' + (icons[type]||'ℹ️') + '</span><span>' + esc(msg) + '</span>';
  c.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 250); }, 3500);
}

function openModal(id) { $(id).classList.add('open'); document.body.style.overflow='hidden'; }
function closeModal(id) { $(id).classList.remove('open'); document.body.style.overflow=''; }

document.addEventListener('keydown', e => {
  if (e.key==='Escape') document.querySelectorAll('.overlay.open').forEach(o => { o.classList.remove('open'); document.body.style.overflow=''; });
});

function confirm(title, msg, icon, okLabel, okClass, cb) {
  $('confirm-title').textContent = title;
  $('confirm-msg').textContent = msg;
  $('confirm-icon').textContent = icon || '⚠️';
  const btn = $('confirm-ok-btn');
  btn.textContent = okLabel || 'Confirm';
  btn.className = 'btn ' + (okClass || 'btn-danger');
  btn.style.flex = '1';
  AdminState.confirmCallback = cb;
  btn.onclick = () => { closeModal('modal-confirm'); cb(); };
  openModal('modal-confirm');
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}

// ── THEME ───────────────────────────────────────────────
function toggleTheme() {
  const dark = document.documentElement.getAttribute('data-theme') !== 'dark';
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  localStorage.setItem('sv_admin_theme', dark ? 'dark' : 'light');
  const t = $('theme-toggle'); if(t) t.checked = dark;
}
function initTheme() {
  const dark = localStorage.getItem('sv_admin_theme') === 'dark';
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  const t = $('theme-toggle'); if(t) t.checked = dark;
}

// ── AUTH ─────────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page,.app-wrap').forEach(p => { p.classList.remove('active'); p.style.display=''; });
  const el = $(id);
  if (!el) return;
  if (id === 'page-app') { el.classList.add('active'); el.style.display='flex'; }
  else { el.classList.add('active'); el.style.display='block'; }
}

async function doLogin() {
  clearErr('li-err');
  const email = $('li-email').value.trim();
  const pass  = $('li-pass').value;
  if (!email || !pass) return showErr('li-err', 'Email and password required.');
  const btn = $('li-btn'); btn.textContent = 'Signing in...'; btn.disabled = true;
  try {
    const data = await api('POST', '/auth/login', { email, password: pass });
    if (!['admin','team_member'].includes(data.user.role))
      throw new Error('Access denied. Admin or Team accounts only.');
    localStorage.setItem('sv_admin_token', data.token);
    localStorage.setItem('sv_admin_user', JSON.stringify(data.user));
    AdminState.user = data.user;
    initApp();
  } catch(err) { showErr('li-err', err.message); }
  finally { btn.textContent = 'Sign In to Admin Panel'; btn.disabled = false; }
}

function doLogout() {
  localStorage.removeItem('sv_admin_token');
  localStorage.removeItem('sv_admin_user');
  AdminState.user = null;
  showPage('page-login');
  toast('Signed out.', 'info');
}

// ── INIT ─────────────────────────────────────────────────
function initApp() {
  const u = AdminState.user;
  $('sb-name').textContent = u.name || u.email;
  $('sb-role').textContent = u.role === 'admin' ? '🔑 Admin' : '👥 Team Member';
  showPage('page-app');
  goTo('overview');
}

// ── NAV ──────────────────────────────────────────────────
const VIEWS = ['overview','analytics','users','subjects','resources','tasks','import','audit','create-admin'];
const TITLES = {
  overview:'Overview', analytics:'Analytics', users:'Manage Users',
  subjects:'Subjects', resources:'Resource Moderation', tasks:'Tasks Monitor',
  import:'CSV Import', audit:'Audit Logs', 'create-admin':'Create Admin / Team Member'
};

function goTo(view) {
  VIEWS.forEach(v => { const el=$('view-'+v); if(el) el.style.display='none'; });
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const target = $('view-'+view);
  if (target) target.style.display = 'block';
  const navEl = $('nav-'+view);
  if (navEl) navEl.classList.add('active');
  $('topbar-title').textContent = TITLES[view] || view;
  $('topbar-actions').innerHTML = '';
  AdminState.currentView = view;
  const loaders = {
    overview: loadOverview, analytics: loadAnalytics, users: loadUsers,
    subjects: loadSubjects, resources: loadResources, tasks: loadTasks,
    import: loadImportView, audit: loadAudit, 'create-admin': loadCreateAdmin
  };
  if (loaders[view]) loaders[view]();
}

// ── OVERVIEW ─────────────────────────────────────────────
async function loadOverview() {
  const el = $('view-overview');
  el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:200px;color:var(--muted)">Loading...</div>';
  try {
    const data = await api('GET', '/admin/overview');
    const s = data.stats;
    el.innerHTML = `
      <div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
        ${[
          {icon:'👥',bg:'var(--accent-bg)',val:s.totalStudents,lbl:'Total Students'},
          {icon:'📖',bg:'#7c3aed22',val:s.totalSubjects,lbl:'Subjects'},
          {icon:'📎',bg:'var(--success-bg)',val:s.totalResources,lbl:'Resources'},
          {icon:'✅',bg:'var(--warning-bg)',val:s.totalTasks,lbl:'Total Tasks'},
          {icon:'🟢',bg:'var(--success-bg)',val:s.completedTasks,lbl:'Completed Tasks'},
          {icon:'⏳',bg:'var(--warning-bg)',val:s.pendingTasks,lbl:'Pending Tasks'},
          {icon:'🔥',bg:'var(--danger-bg)',val:s.activeUsers,lbl:'Active (7 days)'},
          {icon:'📊',bg:'var(--bg3)',val:s.totalTasks>0?Math.round(s.completedTasks/s.totalTasks*100)+'%':'0%',lbl:'Completion Rate'},
        ].map(c=>`
          <div class="stat-card">
            <div class="stat-icon" style="background:${c.bg}">${c.icon}</div>
            <div class="stat-val">${c.val}</div>
            <div class="stat-lbl">${c.lbl}</div>
          </div>`).join('')}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px">
        <div class="card">
          <div class="card-header"><span class="card-title">👤 Recent Students</span><button class="btn btn-ghost btn-sm" onclick="goTo('users')">View All</button></div>
          <div style="overflow-x:auto"><table>
            <thead><tr><th>Name</th><th>Email</th><th>Joined</th></tr></thead>
            <tbody>${(data.recentStudents||[]).map(u=>`
              <tr>
                <td>${esc(u.name||'—')}</td>
                <td style="color:var(--muted);font-size:.8rem">${esc(u.email)}</td>
                <td style="font-size:.78rem;color:var(--muted)">${fmtDate(u.createdAt)}</td>
              </tr>`).join('') || '<tr><td colspan="3" style="text-align:center;color:var(--muted);padding:20px">No students yet</td></tr>'}
            </tbody>
          </table></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">📎 Recent Resources</span></div>
          <div style="overflow-x:auto"><table>
            <thead><tr><th>Title</th><th>Type</th><th>Added</th></tr></thead>
            <tbody>${(data.recentResources||[]).map(r=>`
              <tr>
                <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.title)}</td>
                <td><span class="badge badge-${r.type}">${r.type}</span></td>
                <td style="font-size:.78rem;color:var(--muted)">${fmtDate(r.createdAt)}</td>
              </tr>`).join('') || '<tr><td colspan="3" style="text-align:center;color:var(--muted);padding:20px">No resources yet</td></tr>'}
            </tbody>
          </table></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">📋 Recent Audit</span><button class="btn btn-ghost btn-sm" onclick="goTo('audit')">View All</button></div>
          <div style="padding:0 4px">
            ${(data.recentLogs||[]).slice(0,6).map(l=>`
              <div style="padding:9px 12px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px">
                <div style="width:8px;height:8px;border-radius:50%;background:var(--accent);flex-shrink:0"></div>
                <div style="flex:1;min-width:0">
                  <div class="text-sm" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(l.actionType.replace(/_/g,' '))}</div>
                  <div class="text-xs text-muted">${esc(l.performedByName||'—')} · ${fmtDate(l.createdAt)}</div>
                </div>
              </div>`).join('') || '<div style="padding:20px;text-align:center;color:var(--muted)">No activity yet</div>'}
          </div>
        </div>
      </div>`;
  } catch(err) { el.innerHTML = '<div style="color:var(--danger);padding:20px">Failed: '+esc(err.message)+'</div>'; }
}

// ── ANALYTICS ────────────────────────────────────────────
async function loadAnalytics() {
  const el = $('view-analytics');
  el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:200px;color:var(--muted)">Loading analytics...</div>';
  try {
    const data = await api('GET', '/admin/analytics');
    const { taskActivity=[], resourcesBySubject=[], loginActivity=[] } = data;

    // Build simple bar chart via CSS
    function barChart(items, keyFn, valFn, color) {
      const max = Math.max(...items.map(valFn), 1);
      return items.map(i => `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <div style="font-size:.75rem;color:var(--muted);width:180px;flex-shrink:0;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(keyFn(i))}</div>
          <div style="flex:1;background:var(--bg3);border-radius:99px;height:20px;overflow:hidden">
            <div style="height:100%;background:${color};border-radius:99px;width:${Math.round(valFn(i)/max*100)}%;display:flex;align-items:center;padding-left:8px;font-size:.72rem;color:#fff;font-weight:700;transition:width .6s ease">
              ${valFn(i)>0 ? valFn(i) : ''}
            </div>
          </div>
        </div>`).join('');
    }

    el.innerHTML = `
      <div class="section-header mb-4"><div class="section-title">📊 Analytics Dashboard</div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px">
        <div class="card">
          <div class="card-header"><span class="card-title">✅ Task Activity (Last 7 Days)</span></div>
          <div class="card-body">
            ${taskActivity.length ? barChart(taskActivity, i=>i._id.slice(5), i=>i.count, 'var(--accent)') : '<div class="empty"><div class="empty-icon">📋</div><div class="empty-title">No task data</div></div>'}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">🔑 Login Activity (Last 7 Days)</span></div>
          <div class="card-body">
            ${loginActivity.length ? barChart(loginActivity, i=>i._id.slice(5), i=>i.count, 'var(--success)') : '<div class="empty"><div class="empty-icon">🔑</div><div class="empty-title">No login data</div></div>'}
          </div>
        </div>
        <div class="card" style="grid-column:1/-1">
          <div class="card-header"><span class="card-title">📚 Resources by Subject (Top 10)</span></div>
          <div class="card-body">
            ${resourcesBySubject.length ? barChart(resourcesBySubject, i=>i.name||'Unknown', i=>i.count, 'var(--warning)') : '<div class="empty"><div class="empty-icon">📎</div><div class="empty-title">No resource data</div></div>'}
          </div>
        </div>
      </div>`;
  } catch(err) { el.innerHTML = '<div style="color:var(--danger);padding:20px">Failed: '+esc(err.message)+'</div>'; }
}

// ── USERS ────────────────────────────────────────────────
let userPage = 1, userSearch = '', userRole = 'student', userSem = '';

async function loadUsers() {
  const el = $('view-users');
  $('topbar-actions').innerHTML = '<button class="btn btn-accent btn-sm" onclick="exportCSV()">⬇️ Export CSV</button>';
  el.innerHTML = `
    <div class="section-header mb-4">
      <div class="section-title">Manage Users</div>
    </div>
    <div class="filter-bar mb-4">
      <input type="text" class="form-input" id="user-search" placeholder="Search name, email, USN..." value="${esc(userSearch)}" oninput="userSearch=this.value" onkeydown="if(event.key==='Enter'){userPage=1;fetchUsers()}"/>
      <select class="form-select" id="user-role-filter" onchange="userRole=this.value;userPage=1;fetchUsers()">
        <option value="student" ${userRole==='student'?'selected':''}>Students</option>
        <option value="team_member" ${userRole==='team_member'?'selected':''}>Team Members</option>
        <option value="admin" ${userRole==='admin'?'selected':''}>Admins</option>
        <option value="" ${userRole===''?'selected':''}>All Roles</option>
      </select>
      <select class="form-select" onchange="userSem=this.value;userPage=1;fetchUsers()">
        <option value="">All Semesters</option>
        ${[3,4].map(s=>'<option value="'+s+'" '+(userSem==s?'selected':'')+'>Sem '+s+'</option>').join('')}
      </select>
      <button class="btn btn-ghost btn-sm" onclick="userPage=1;fetchUsers()">🔍 Search</button>
    </div>
    <div class="card">
      <div id="users-table-wrap"><div style="padding:40px;text-align:center;color:var(--muted)">Loading...</div></div>
    </div>`;
  fetchUsers();
}

async function fetchUsers() {
  const wrap = $('users-table-wrap'); if(!wrap) return;
  wrap.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted)">Loading...</div>';
  const search = $('user-search')?.value.trim() || '';
  const params = new URLSearchParams({ page: userPage, limit: 15 });
  if (search) params.set('search', search);
  if (userRole) params.set('role', userRole);
  if (userSem) params.set('semester', userSem);
  try {
    const data = await api('GET', '/users?' + params);
    const users = data.users || [];
    const isAdmin = AdminState.user?.role === 'admin';
    wrap.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Name / USN</th><th>Email</th><th>Role</th>
            <th>Semester</th><th>Status</th><th>Last Login</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${users.length === 0 ? '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--muted)">No users found</td></tr>' :
              users.map(u => `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:9px">
                      <div class="avatar" style="width:30px;height:30px;font-size:.8rem">${(u.name||u.email||'?').charAt(0).toUpperCase()}</div>
                      <div><div>${esc(u.name||'—')}</div><div class="text-xs text-muted">${esc(u.usn||'—')}</div></div>
                    </div>
                  </td>
                  <td style="font-size:.82rem;color:var(--muted)">${esc(u.email)}</td>
                  <td><span class="badge badge-${u.role}">${esc(u.role)}</span></td>
                  <td>${u.semester ? 'Sem '+u.semester : '—'}</td>
                  <td><span class="badge badge-${u.status}">${esc(u.status)}</span></td>
                  <td style="font-size:.78rem;color:var(--muted)">${fmtDate(u.lastLogin)}</td>
                  <td>
                    <div class="td-actions">
                      <button class="btn btn-icon" title="View Details" onclick="viewUser('${u._id}')">👁️</button>
                      ${isAdmin ? `
                        <button class="btn btn-icon" title="Toggle Status" onclick="toggleStatus('${u._id}','${u.status}')">${u.status==='active'?'🚫':'✅'}</button>
                        <button class="btn btn-icon" title="Reset Password" onclick="openResetPw('${u._id}')">🔑</button>
                        ${u.role !== 'admin' ? '<button class="btn btn-icon" title="Delete" onclick="deleteUser(\''+u._id+'\',\''+esc(u.name||u.email)+'\')">🗑️</button>' : ''}
                      ` : ''}
                    </div>
                  </td>
                </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="pagination">
        <span class="pagination-info">Page ${data.page} of ${data.pages} · ${data.total} total</span>
        <div class="pagination-btns">
          <button class="page-btn" onclick="userPage=${Math.max(1,userPage-1)};fetchUsers()" ${userPage<=1?'disabled':''}>← Prev</button>
          <button class="page-btn" onclick="userPage=${Math.min(data.pages,userPage+1)};fetchUsers()" ${userPage>=data.pages?'disabled':''}>Next →</button>
        </div>
      </div>`;
  } catch(err) { wrap.innerHTML = '<div style="color:var(--danger);padding:20px">'+esc(err.message)+'</div>'; }
}

async function viewUser(id) {
  const body = $('user-detail-body');
  body.innerHTML = '<div style="padding:30px;text-align:center;color:var(--muted)">Loading...</div>';
  openModal('modal-user');
  try {
    const data = await api('GET', '/users/'+id);
    const u = data.user, st = data.stats;
    body.innerHTML = `
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid var(--border)">
        <div class="avatar" style="width:52px;height:52px;font-size:1.3rem">${(u.name||'?').charAt(0).toUpperCase()}</div>
        <div>
          <div style="font-weight:700;font-size:1rem">${esc(u.name||'—')}</div>
          <div class="text-sm text-muted">${esc(u.email)}</div>
          <div style="display:flex;gap:6px;margin-top:5px">
            <span class="badge badge-${u.role}">${u.role}</span>
            <span class="badge badge-${u.status}">${u.status}</span>
          </div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
        ${[
          ['USN', u.usn||'—'], ['Department', u.department||'—'],
          ['Semester', u.semester ? 'Semester '+u.semester : '—'],
          ['Registered', fmtDate(u.createdAt)],
          ['Last Login', fmtDate(u.lastLogin)],
          ['First Login', u.firstLogin ? '⚠️ Yes (pending password setup)' : '✅ Completed'],
        ].map(([k,v])=>`
          <div style="padding:10px;background:var(--bg3);border-radius:8px">
            <div class="text-xs text-muted" style="text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">${k}</div>
            <div class="text-sm font-semibold">${esc(v)}</div>
          </div>`).join('')}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:16px">
        ${[
          ['📋','Tasks',st.taskCount],
          ['✅','Completed',st.completedTasks],
          ['⏳','Pending',st.pendingTasks],
          ['📎','Resources',st.resourceCount]
        ].map(([icon,label,val])=>`
          <div style="padding:12px;background:var(--bg3);border-radius:8px;text-align:center">
            <div style="font-size:1.4rem">${icon}</div>
            <div style="font-family:'Syne',sans-serif;font-size:1.3rem;font-weight:800">${val}</div>
            <div class="text-xs text-muted">${label}</div>
          </div>`).join('')}
      </div>
      ${AdminState.user?.role==='admin' ? `
        <div class="sep"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-warning btn-sm" onclick="closeModal('modal-user');openResetPw('${u._id}')">🔑 Reset Password</button>
          <button class="btn ${u.status==='active'?'btn-danger-soft':'btn-success'} btn-sm" onclick="toggleStatus('${u._id}','${u.status}');closeModal('modal-user')">
            ${u.status==='active' ? '🚫 Suspend' : '✅ Activate'}
          </button>
          ${u.role!=='admin' ? '<button class="btn btn-danger btn-sm" onclick="closeModal(\'modal-user\');deleteUser(\''+u._id+'\',\''+esc(u.name||u.email)+'\')">🗑️ Delete User</button>' : ''}
        </div>` : ''}`;
  } catch(err) { body.innerHTML = '<div style="color:var(--danger)">'+esc(err.message)+'</div>'; }
}

async function toggleStatus(id, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
  const label = newStatus === 'suspended' ? 'suspend' : 'activate';
  confirm('Confirm Action', `Are you sure you want to ${label} this user?`, newStatus==='suspended'?'🚫':'✅', label.charAt(0).toUpperCase()+label.slice(1), newStatus==='suspended'?'btn-warning':'btn-success', async () => {
    try {
      await api('PATCH', '/users/'+id, { status: newStatus });
      toast('User '+newStatus+'.', 'success');
      fetchUsers();
    } catch(err) { toast(err.message, 'error'); }
  });
}

async function deleteUser(id, name) {
  confirm('Delete User', 'Delete "'+name+'"? This cannot be undone.', '🗑️', 'Delete', 'btn-danger', async () => {
    try {
      await api('DELETE', '/users/'+id);
      toast('User deleted.', 'success');
      fetchUsers();
    } catch(err) { toast(err.message, 'error'); }
  });
}

function openResetPw(id) {
  $('reset-user-id').value = id;
  $('reset-pw-val').value = '';
  clearErr('reset-pw-err');
  openModal('modal-reset-pw');
}

async function doResetPassword() {
  const id = $('reset-user-id').value;
  const pw = $('reset-pw-val').value.trim();
  if (!pw || pw.length < 6) return showErr('reset-pw-err', 'Minimum 6 characters.');
  try {
    await api('POST', '/users/'+id+'/reset-password', { newPassword: pw });
    closeModal('modal-reset-pw');
    toast('Password reset. Student must change on next login.', 'success');
  } catch(err) { showErr('reset-pw-err', err.message); }
}

async function exportCSV() {
  try {
    const res = await api('GET', '/export/students');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'students.csv'; a.click();
    URL.revokeObjectURL(url);
    toast('CSV exported!', 'success');
  } catch(err) { toast(err.message, 'error'); }
}

// ── SUBJECTS ─────────────────────────────────────────────
async function loadSubjects() {
  const el = $('view-subjects');
  $('topbar-actions').innerHTML = '<button class="btn btn-accent btn-sm" onclick="openSubjectModal()">+ Add Subject</button>';
  el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:200px;color:var(--muted)">Loading...</div>';
  try {
    const data = await api('GET', '/subjects');
    const subs = data.subjects || [];
    const byS = {};
    subs.forEach(s => { const k='Semester '+s.semester; if(!byS[k]) byS[k]=[]; byS[k].push(s); });
    el.innerHTML = Object.entries(byS).map(([sem, list]) => `
      <div class="mb-4">
        <h3 style="font-family:'Syne',sans-serif;font-size:.95rem;font-weight:700;margin-bottom:12px;color:var(--text2)">${sem}</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
          ${list.map(s => `
            <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--r2);padding:16px;border-left:4px solid ${s.color};display:flex;align-items:center;gap:12px">
              <span style="font-size:1.6rem">${s.icon||'📚'}</span>
              <div style="flex:1;min-width:0">
                <div style="font-weight:600;font-size:.88rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.name)}</div>
                <div class="text-xs text-muted">${esc(s.code)}</div>
              </div>
              <div style="display:flex;gap:4px">
                <button class="btn btn-icon" onclick="editSubject('${s._id}','${esc(s.name)}','${esc(s.code)}',${s.semester},'${esc(s.description||'')}','${s.color}')">✏️</button>
                <button class="btn btn-icon" onclick="deleteSubject('${s._id}','${esc(s.name)}')">🗑️</button>
              </div>
            </div>`).join('')}
        </div>
      </div>`).join('') || '<div class="empty"><div class="empty-icon">📚</div><div class="empty-title">No subjects yet</div><div class="empty-text">Add your first subject above.</div></div>';
  } catch(err) { el.innerHTML = '<div style="color:var(--danger);padding:20px">'+esc(err.message)+'</div>'; }
}

function openSubjectModal(id='',name='',code='',sem=3,desc='',color='#6366f1') {
  $('subj-id').value=id; $('subj-name').value=name; $('subj-code').value=code;
  $('subj-semester').value=sem; $('subj-desc').value=desc; $('subj-color').value=color;
  $('subj-modal-title').textContent = id ? 'Edit Subject' : 'Add Subject';
  clearErr('subj-err');
  openModal('modal-subject');
}
function editSubject(id,name,code,sem,desc,color) { openSubjectModal(id,name,code,sem,desc,color); }

async function saveSubject() {
  const id   = $('subj-id').value;
  const name = $('subj-name').value.trim();
  const code = $('subj-code').value.trim();
  const sem  = $('subj-semester').value;
  const desc = $('subj-desc').value.trim();
  const color= $('subj-color').value;
  if (!name||!code||!sem) return showErr('subj-err','Name, code and semester required.');
  try {
    if (id) { await api('PUT', '/subjects/'+id, {name,code,semester:Number(sem),description:desc,color}); toast('Subject updated!','success'); }
    else     { await api('POST', '/subjects', {name,code,semester:Number(sem),description:desc,color}); toast('Subject added!','success'); }
    closeModal('modal-subject');
    loadSubjects();
  } catch(err) { showErr('subj-err', err.message); }
}

async function deleteSubject(id, name) {
  confirm('Delete Subject', 'Delete "'+name+'"? Resources linked to this subject may be affected.', '🗑️', 'Delete', 'btn-danger', async () => {
    try { await api('DELETE', '/subjects/'+id); toast('Subject deleted.','success'); loadSubjects(); }
    catch(err) { toast(err.message,'error'); }
  });
}

// ── RESOURCES ────────────────────────────────────────────
let adminSubjectsCache = [];

async function loadAdminSubjects() {
  if (adminSubjectsCache.length) return adminSubjectsCache;
  try {
    const data = await api('GET', '/subjects');
    adminSubjectsCache = data.subjects || [];
    return adminSubjectsCache;
  } catch { return []; }
}

async function loadResources() {
  const el = $('view-resources');
  $('topbar-actions').innerHTML = '<button class="btn btn-accent btn-sm" onclick="openResourceModal()">+ Add Resource</button>';
  el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:200px;color:var(--muted)">Loading...</div>';
  try {
    const data = await api('GET', '/resources/all?limit=50');
    const resources = data.resources || [];
    const typeIcons = {video:'🎥',article:'📄',pdf:'📋',notes:'📝',link:'🔗'};
    el.innerHTML = `
      <div class="section-header mb-4"><div class="section-title">Resource Moderation</div><div class="text-sm text-muted">${data.total} total resources</div></div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Title</th><th>Subject</th><th>Type</th><th>Uploaded By</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              ${resources.length===0 ? '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--muted)">No resources found</td></tr>' :
                resources.map(r => `
                  <tr>
                    <td>
                      <div style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                        <a href="${esc(r.url)}" target="_blank" style="color:var(--accent-text)">${esc(r.title)}</a>
                      </div>
                    </td>
                    <td style="font-size:.82rem;color:var(--muted)">${esc(r.subject?.name||'—')}</td>
                    <td>
                      <span style="display:flex;align-items:center;gap:4px">
                        ${typeIcons[r.resourceType]||'🔗'} <span class="badge badge-${r.type}">${r.type}</span>
                      </span>
                    </td>
                    <td style="font-size:.82rem">${esc(r.userId?.name||r.userId?.email||'System')}</td>
                    <td style="font-size:.78rem;color:var(--muted)">${fmtDate(r.createdAt)}</td>
                    <td>
                      <button class="btn btn-icon btn-danger-soft" onclick="deleteResource('${r._id}','${esc(r.title)}')" title="Delete Resource">🗑️</button>
                    </td>
                  </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  } catch(err) { el.innerHTML = '<div style="color:var(--danger);padding:20px">'+esc(err.message)+'</div>'; }
}

async function openResourceModal() {
  const subjects = await loadAdminSubjects();
  $('res-subject').innerHTML = subjects.length === 0
    ? '<option value="">No subjects found</option>'
    : subjects.map(s => '<option value="'+s._id+'">'+esc(s.icon||'📚')+' '+esc(s.name)+' (Sem '+s.semester+')</option>').join('');
  $('res-title').value = '';
  $('res-url').value = '';
  $('res-desc').value = '';
  $('res-type').value = 'link';
  clearErr('res-err');
  openModal('modal-resource');
}

async function saveResource() {
  const title = $('res-title').value.trim();
  const url = $('res-url').value.trim();
  const subjectId = $('res-subject').value;
  const resourceType = $('res-type').value;
  const description = $('res-desc').value.trim();
  if (!title || !url || !subjectId) return showErr('res-err', 'Title, URL and subject are required.');
  try {
    await api('POST', '/resources', { title, url, subjectId, resourceType, description });
    closeModal('modal-resource');
    toast('Resource added!', 'success');
    loadResources();
  } catch(err) { showErr('res-err', err.message); }
}

async function deleteResource(id, title) {
  confirm('Delete Resource', 'Delete "'+title+'"? This cannot be undone.', '🗑️', 'Delete', 'btn-danger', async () => {
    try { await api('DELETE', '/resources/'+id); toast('Resource deleted.','success'); loadResources(); }
    catch(err) { toast(err.message,'error'); }
  });
}

// ── TASKS MONITOR ────────────────────────────────────────
async function loadTasks() {
  const el = $('view-tasks');
  el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:200px;color:var(--muted)">Loading...</div>';
  try {
    const data = await api('GET', '/tasks?limit=50');
    const tasks = data.tasks || [];
    const priMap = {high:{cls:'b-high',l:'🔴 High'},medium:{cls:'b-med',l:'🟡 Med'},low:{cls:'b-low',l:'🟢 Low'}};
    el.innerHTML = `
      <div class="section-header mb-4"><div class="section-title">Tasks Monitor</div></div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Task</th><th>Student</th><th>Priority</th><th>Due Date</th><th>Status</th></tr></thead>
            <tbody>
              ${tasks.length===0 ? '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--muted)">No tasks found</td></tr>' :
                tasks.map(t => {
                  const pri = priMap[t.priority]||priMap.medium;
                  const done = t.status==='completed';
                  return `<tr>
                    <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.title)}</td>
                    <td style="font-size:.82rem;color:var(--muted)">${esc(t.userId?.name||t.userId?.email||'—')}</td>
                    <td><span class="badge ${pri.cls}">${pri.l}</span></td>
                    <td style="font-size:.8rem;color:var(--muted)">${fmtDate(t.dueDate)}</td>
                    <td><span class="badge" style="background:${done?'var(--success-bg)':'var(--warning-bg)'};color:${done?'var(--success)':'var(--warning)'}">${done?'✅ Done':'⏳ Pending'}</span></td>
                  </tr>`;}).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  } catch(err) { el.innerHTML = '<div style="color:var(--danger);padding:20px">'+esc(err.message)+'</div>'; }
}

// ── CSV IMPORT ────────────────────────────────────────────
function loadImportView() {
  const el = $('view-import');
  el.innerHTML = `
    <div class="section-header mb-4"><div class="section-title">📥 CSV Student Import</div></div>
    <div style="max-width:600px;margin:0 auto">
      <div class="card mb-4">
        <div class="card-header"><span class="card-title">Upload CSV File</span></div>
        <div class="card-body">
          <div class="upload-area" id="upload-area" onclick="$('csv-file').click()" ondragover="event.preventDefault();this.classList.add('drag-over')" ondragleave="this.classList.remove('drag-over')" ondrop="handleDrop(event)">
            <input type="file" id="csv-file" accept=".csv" onchange="handleFileSelect(event)"/>
            <div style="font-size:2.5rem;margin-bottom:8px">📁</div>
            <div style="font-weight:600;font-size:.9rem;color:var(--text2)">Click to upload or drag & drop</div>
            <div class="text-xs text-muted" style="margin-top:4px">CSV files only · Max 5MB</div>
          </div>
          <div id="file-selected" style="margin-top:10px;display:none;padding:10px;background:var(--success-bg);border-radius:8px;font-size:.84rem;color:var(--success)"></div>
          <button class="btn btn-accent btn-full btn-lg" style="margin-top:14px" id="import-btn" onclick="doImport()" disabled>Import Students</button>
          <div id="import-result" style="margin-top:12px"></div>
        </div>
      </div>
    </div>`;
}

let selectedFile = null;

function handleFileSelect(e) {
  selectedFile = e.target.files[0];
  updateFileUI();
}

function handleDrop(e) {
  e.preventDefault();
  $('upload-area').classList.remove('drag-over');
  selectedFile = e.dataTransfer.files[0];
  updateFileUI();
}

function updateFileUI() {
  if (!selectedFile) return;
  const info = $('file-selected');
  info.style.display = 'block';
  info.textContent = 'Selected: ' + selectedFile.name + ' (' + Math.round(selectedFile.size/1024) + ' KB)';
  $('import-btn').disabled = false;
}

async function doImport() {
  if (!selectedFile) return;
  const btn = $('import-btn');
  btn.textContent = 'Importing...'; btn.disabled = true;
  const res = $('import-result');
  res.innerHTML = '';
  try {
    const fd = new FormData();
    fd.append('file', selectedFile);
    const data = await api('POST', '/import/students', fd, true);
    const r = data.results;
    res.innerHTML = `
      <div style="background:var(--success-bg);border-radius:8px;padding:14px;color:var(--success);font-size:.84rem">
        <div style="font-weight:700;margin-bottom:6px">Import Complete</div>
        Total processed: ${r.total} · Imported: ${r.imported} · Duplicates skipped: ${r.duplicates} · Failed: ${r.failed.length}
      </div>
      ${r.failed.length ? '<div style="background:var(--danger-bg);border-radius:8px;padding:14px;color:var(--danger);font-size:.8rem;margin-top:8px"><div style="font-weight:700;margin-bottom:6px">Failed Rows</div>'+r.failed.map(f=>'Row '+f.row+': '+esc(f.reason)).join('<br>')+'</div>' : ''}`;
    toast('Import done: '+r.imported+' students added.', 'success');
  } catch(err) {
    res.innerHTML = '<div style="background:var(--danger-bg);border-radius:8px;padding:14px;color:var(--danger);font-size:.84rem">'+esc(err.message)+'</div>';
    toast(err.message, 'error');
  }
  btn.textContent = 'Import Students'; btn.disabled = false;
}

// ── AUDIT LOGS ────────────────────────────────────────────
async function loadAudit() {
  const el = $('view-audit');
  el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:200px;color:var(--muted)">Loading...</div>';
  try {
    const data = await api('GET', '/audit?limit=50');
    const logs = data.logs || [];
    const actionColors = {
      USER_DELETED:'var(--danger)', USER_UPDATED:'var(--warning)', PASSWORD_RESET:'var(--accent)',
      RESOURCE_DELETED:'var(--danger)', SUBJECT_CREATED:'var(--success)', SUBJECT_DELETED:'var(--danger)',
      CSV_IMPORT:'var(--accent)', DEFAULT:'var(--muted)'
    };
    el.innerHTML = `
      <div class="section-header mb-4"><div class="section-title">Audit Logs</div><span class="text-sm text-muted">${data.total} total actions</span></div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Action</th><th>Performed By</th><th>Target</th><th>Details</th><th>Time</th></tr></thead>
            <tbody>
              ${logs.length===0 ? '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--muted)">No audit logs yet</td></tr>' :
                logs.map(l => {
                  const col = actionColors[l.actionType] || actionColors.DEFAULT;
                  return `<tr>
                    <td><span style="display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:99px;font-size:.7rem;font-weight:700;background:${col}22;color:${col}">${esc(l.actionType.replace(/_/g,' '))}</span></td>
                    <td style="font-size:.82rem">${esc(l.performedByName||l.performedBy?.email||'—')}</td>
                    <td style="font-size:.8rem;color:var(--muted)">${esc(l.targetLabel||'—')}</td>
                    <td style="font-size:.78rem;color:var(--muted);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.details||'—')}</td>
                    <td style="font-size:.78rem;color:var(--muted);white-space:nowrap">${fmtDate(l.createdAt)}</td>
                  </tr>`;}).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  } catch(err) { el.innerHTML = '<div style="color:var(--danger);padding:20px">'+esc(err.message)+'</div>'; }
}

// ── CREATE ADMIN/TEAM ─────────────────────────────────────
function loadCreateAdmin() {
  const el = $('view-create-admin');
  el.innerHTML = `
    <div class="section-header mb-4"><div class="section-title">Create Admin / Team Member</div></div>
    <div style="max-width:500px;margin:0 auto">
      <div class="card">
        <div class="card-header"><span class="card-title">New Account</span></div>
        <div class="card-body">
          <div class="form-group"><label class="form-label">Full Name</label><input type="text" class="form-input" id="ca-name" placeholder="e.g. Dr. Meera Singh"/></div>
          <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="ca-email" placeholder="admin@studyverse.edu"/></div>
          <div class="form-group"><label class="form-label">Password</label><input type="password" class="form-input" id="ca-pass" placeholder="Min. 6 characters"/></div>
          <div class="form-group"><label class="form-label">Role</label>
            <select class="form-select" id="ca-role">
              <option value="team_member">Team Member (limited access)</option>
              <option value="admin">Admin (full access)</option>
            </select>
          </div>
          <div class="form-error" id="ca-err"></div>
          <button class="btn btn-primary btn-full" style="margin-top:4px" onclick="doCreateAdmin()">Create Account</button>
        </div>
      </div>
    </div>`;
}

async function doCreateAdmin() {
  clearErr('ca-err');
  const name = $('ca-name').value.trim();
  const email= $('ca-email').value.trim();
  const pass = $('ca-pass').value;
  const role = $('ca-role').value;
  if (!name||!email||!pass) return showErr('ca-err','All fields required.');
  if (pass.length<6) return showErr('ca-err','Password must be at least 6 characters.');
  try {
    await api('POST', '/auth/register', {name, email, password:pass, role});
    toast('Account created for '+name+'!', 'success');
    $('ca-name').value=''; $('ca-email').value=''; $('ca-pass').value='';
  } catch(err) { showErr('ca-err', err.message); }
}

// ── BOOT ─────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  const token = localStorage.getItem('sv_admin_token');
  const user  = JSON.parse(localStorage.getItem('sv_admin_user')||'null');
  if (!token || !user || !['admin','team_member'].includes(user.role)) {
    showPage('page-login');
    return;
  }
  AdminState.user = user;
  initApp();
});
