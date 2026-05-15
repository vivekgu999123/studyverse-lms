// ===================== GLOBAL STATE =====================
const AppState = {
  user: null,
  subjects: [],
  allTasks: [],
  currentSubject: null,
  currentView: 'dashboard',
};

// ===================== INIT APP =====================
async function initApp() {
  // Check first login — redirect to password setup
  const storedUser = JSON.parse(localStorage.getItem('st_user') || '{}');
  if (storedUser.firstLogin === true) {
    showPage('set-password');
    return;
  }
  AppState.user = JSON.parse(localStorage.getItem('st_user') || 'null');
  if (!AppState.user) return showPage('login');

  showPage('app');
  updateSidebar();
  await loadSubjects();
  populateTaskSubjectDropdown();
  navigateTo('dashboard');

  // Set today as default for task modal
  const today = new Date().toISOString().split('T')[0];
  const taskDateInput = document.getElementById('taskDueDate');
  if (taskDateInput) taskDateInput.value = today;
}

// ===================== SIDEBAR =====================
function updateSidebar() {
  const u = AppState.user;
  if (!u) return;
  document.getElementById('sidebarUsername').textContent = u.username || u.email;
  document.getElementById('sidebarMeta').textContent = `Semester ${u.semester} · CS Dept`;
  document.getElementById('sidebarPoints').innerHTML = `⚡ ${u.points || 0} pts`;
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('open');
  overlay.style.display = sidebar.classList.contains('open') ? 'block' : 'none';
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').style.display = 'none';
}

// ===================== NAVIGATION =====================
const viewTitles = {
  dashboard: 'Dashboard',
  subjects: 'Subjects',
  'subject-detail': 'Subject Detail',
  tasks: 'All Tasks',
  progress: 'Progress',
  leaderboard: 'Leaderboard',
  settings: 'Settings',
};

async function navigateTo(view, data = null) {
  // Hide all views
  document.querySelectorAll('[id^="view-"]').forEach(v => v.style.display = 'none');

  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navItem = document.getElementById(`nav-${view}`);
  if (navItem) navItem.classList.add('active');

  // Update topbar title
  document.getElementById('topbarTitle').textContent = viewTitles[view] || 'StudyTrack';

  // Show target view
  const targetView = document.getElementById(`view-${view}`);
  if (targetView) {
    targetView.style.display = 'block';
    targetView.classList.add('animate-in');
    setTimeout(() => targetView.classList.remove('animate-in'), 400);
  }

  AppState.currentView = view;
  closeSidebar();

  // Load view data
  switch (view) {
    case 'dashboard': await loadDashboard(); break;
    case 'subjects': await loadSubjectsView(); break;
    case 'subject-detail': await loadSubjectDetail(data); break;
    case 'tasks': await loadTasksView(); break;
    case 'progress': await loadProgressView(); break;
    case 'leaderboard': await loadLeaderboardView(); break;
    case 'settings': loadSettingsView(); break;
  }
}

// ===================== LOAD SUBJECTS (GLOBAL) =====================
async function loadSubjects() {
  try {
    const u = AppState.user;
    if (!u || !u.semester) return;
    const data = await api.get(`/subjects?semester=${u.semester}`);
    AppState.subjects = data.subjects || [];
  } catch (err) {
    console.error('Failed to load subjects:', err);
  }
}

// ===================== TASK SUBJECT DROPDOWN =====================
function populateTaskSubjectDropdown() {
  const select = document.getElementById('taskSubject');
  if (!select) return;
  // Keep first "No subject" option
  while (select.options.length > 1) select.remove(1);
  AppState.subjects.forEach(sub => {
    const opt = document.createElement('option');
    opt.value = sub._id;
    opt.textContent = `${sub.icon} ${sub.name}`;
    select.appendChild(opt);
  });
}

// ===================== HELPERS =====================
function formatDate(dateStr) {
  const d = new Date(dateStr);
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const date = new Date(d); date.setHours(0,0,0,0);
  const diff = Math.round((date - today) / (1000*60*60*24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff <= 7) return `In ${diff} days`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isOverdue(dateStr) {
  const d = new Date(dateStr); d.setHours(23,59,59,999);
  return d < new Date();
}

function isDueSoon(dateStr) {
  const d = new Date(dateStr);
  const diff = (d - new Date()) / (1000*60*60*24);
  return diff >= 0 && diff <= 2;
}

function getPriorityBadge(priority) {
  const labels = { low: '🟢 Low', medium: '🟡 Medium', high: '🔴 High' };
  return `<span class="badge badge-priority-${priority}">${labels[priority] || priority}</span>`;
}

function getResourceIcon(type) {
  const icons = { video: '🎥', article: '📄', pdf: '📋', notes: '📝', link: '🔗' };
  return icons[type] || '🔗';
}

function refreshUserFromServer() {
  api.get('/auth/me').then(data => {
    if (data.user) {
      AppState.user = data.user;
      localStorage.setItem('st_user', JSON.stringify(data.user));
      updateSidebar();
      // Update streak display
      const streak = data.user.streak || 0;
      const streakDisplay = document.getElementById('streakDisplay');
      if (streakDisplay) {
        streakDisplay.style.display = streak > 0 ? 'flex' : 'none';
        document.getElementById('streakCount').textContent = streak;
      }
      // Update pending badge
      updatePendingBadge();
    }
  }).catch(() => {});
}

async function updatePendingBadge() {
  try {
    const data = await api.get('/tasks?status=pending');
    const count = (data.tasks || []).length;
    const badge = document.getElementById('pendingTasksBadge');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline' : 'none';
    }
  } catch {}
}

// Keyboard shortcut: Escape closes modals
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => {
      m.classList.remove('open');
      document.body.style.overflow = '';
    });
  }
});
