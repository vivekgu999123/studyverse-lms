// ===================== THEME =====================
function initTheme() {
  const saved = localStorage.getItem('st_theme') || 'light';
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = saved === 'dark' || (saved === 'system' && prefersDark);
  applyTheme(isDark);
}

function applyTheme(isDark) {
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  const toggles = document.querySelectorAll('#themeToggle, #themeToggleSettings');
  toggles.forEach(t => { if (t) t.checked = isDark; });
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const newDark = !isDark;
  localStorage.setItem('st_theme', newDark ? 'dark' : 'light');
  applyTheme(newDark);
  // Sync both toggles
  const toggles = document.querySelectorAll('#themeToggle, #themeToggleSettings');
  toggles.forEach(t => { if (t) t.checked = newDark; });
}

// ===================== PAGE ROUTING =====================
function showPage(pageName) {
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
    p.style.display = '';
  });
  const target = document.getElementById('page-' + pageName);
  if (target) {
    target.classList.add('active');
    // set-password and auth pages need flex column
    if (['set-password','login','register','forgot','setup'].includes(pageName)) {
      target.style.display = 'flex';
      target.style.flexDirection = 'column';
    }
  }
}

// ===================== TOAST =====================
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toastContainer');
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-message">${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ===================== MODAL =====================
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }
  });
});

// ===================== SET BUTTON LOADING =====================
function setLoading(btnId, loading, text = '') {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = `<span class="loading-spinner"></span> ${text || 'Loading...'}`;
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.originalText || text;
    btn.disabled = false;
  }
}

function showError(elId, message) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
}

function clearError(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = '';
  el.classList.remove('show');
}

// ===================== AUTH HANDLERS =====================
async function handleLogin(e) {
  e.preventDefault();
  clearError('loginError');
  const identifier = document.getElementById('loginEmail').value.trim();
  const password   = document.getElementById('loginPassword').value;

  // Support email OR USN login
  const isUSN = /^[0-9A-Za-z]{8,15}$/.test(identifier) && !identifier.includes('@');
  const payload = isUSN
    ? { usn: identifier, password }
    : { email: identifier, password };

  setLoading('loginBtn', true, 'Signing in...');
  try {
    const data = await api.post('/auth/login', payload);
    localStorage.setItem('st_token', data.token);
    localStorage.setItem('st_user', JSON.stringify(data.user));

    // First login — force password setup
    if (data.user.firstLogin === true) {
      showPage('set-password');
      return;
    }
    if (!data.user.username || !data.user.semester) {
      showPage('setup');
    } else {
      initApp();
    }
  } catch (err) {
    showError('loginError', err.message);
  } finally {
    setLoading('loginBtn', false, 'Sign In');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  clearError('registerError');
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const securityQuestion = document.getElementById('regSecurityQuestion').value;
  const securityAnswer = document.getElementById('regSecurityAnswer').value.trim();

  if (!securityQuestion) return showError('registerError', 'Please select a security question.');

  setLoading('registerBtn', true, 'Creating account...');
  try {
    const data = await api.post('/auth/register', { email, password, securityQuestion, securityAnswer });
    localStorage.setItem('st_token', data.token);
    localStorage.setItem('st_user', JSON.stringify(data.user));
    showPage('setup');
  } catch (err) {
    showError('registerError', err.message);
  } finally {
    setLoading('registerBtn', false, 'Create Account');
  }
}

async function fetchSecurityQuestion() {
  const email = document.getElementById('forgotEmail').value.trim();
  if (!email) return showToast('Please enter your email first.', 'error');
  try {
    const data = await api.get(`/auth/security-question?email=${encodeURIComponent(email)}`);
    document.getElementById('forgotSecurityQuestion').textContent = data.securityQuestion;
    document.getElementById('securityQuestionGroup').style.display = 'block';
    document.getElementById('securityAnswerGroup').style.display = 'block';
    document.getElementById('newPasswordGroup').style.display = 'block';
    document.getElementById('forgotBtn').style.display = 'flex';
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleForgotPassword(e) {
  e.preventDefault();
  clearError('forgotError');
  const email = document.getElementById('forgotEmail').value.trim();
  const securityAnswer = document.getElementById('forgotSecurityAnswer').value.trim();
  const newPassword = document.getElementById('forgotNewPassword').value;
  setLoading('forgotBtn', true, 'Resetting...');
  try {
    await api.post('/auth/forgot-password', { email, securityAnswer, newPassword });
    showToast('Password reset! Please sign in.', 'success');
    showPage('login');
  } catch (err) {
    showError('forgotError', err.message);
  } finally {
    setLoading('forgotBtn', false, 'Reset Password');
  }
}

// ===================== SETUP =====================
let selectedSemester = null;

function selectSemester(num) {
  selectedSemester = num;
  document.getElementById('setupSemester').value = num;
  document.getElementById('sem1').classList.toggle('selected', num === 1);
  document.getElementById('sem2').classList.toggle('selected', num === 2);
}

async function handleSetup(e) {
  e.preventDefault();
  clearError('setupError');
  const username = document.getElementById('setupUsername').value.trim();
  const semester = document.getElementById('setupSemester').value;
  if (!semester) return showError('setupError', 'Please select your semester.');
  setLoading('setupBtn', true, 'Saving...');
  try {
    const data = await api.put('/auth/setup', { username, semester: Number(semester) });
    localStorage.setItem('st_user', JSON.stringify(data.user));
    initApp();
  } catch (err) {
    showError('setupError', err.message);
  } finally {
    setLoading('setupBtn', false, 'Let\'s Go 🚀');
  }
}

// ===================== LOGOUT =====================
function handleLogout() {
  localStorage.removeItem('st_token');
  localStorage.removeItem('st_user');
  showPage('login');
  showToast('Signed out successfully.', 'info');
}

// ===================== INIT ON LOAD =====================
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  const token = localStorage.getItem('st_token');
  const user  = JSON.parse(localStorage.getItem('st_user') || 'null');

  if (!token || !user) {
    showPage('login');
    return;
  }
  // First login — must set password before anything else
  if (user.firstLogin === true) {
    showPage('set-password');
    return;
  }
  if (!user.username || !user.semester) {
    showPage('setup');
    return;
  }
  initApp();
});


// ===================== FIRST LOGIN PASSWORD SETUP =====================
async function handleSetPassword(e) {
  e.preventDefault();
  const newPassword    = document.getElementById('spNewPassword')?.value || '';
  const confirmPassword = document.getElementById('spConfirmPassword')?.value || '';
  const errEl = document.getElementById('spError');

  if (!newPassword || newPassword.length < 8) {
    errEl.textContent = 'Password must be at least 8 characters.';
    errEl.classList.add('show');
    return;
  }
  if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(newPassword)) {
    errEl.textContent = 'Password must contain letters and numbers.';
    errEl.classList.add('show');
    return;
  }
  if (newPassword !== confirmPassword) {
    errEl.textContent = 'Passwords do not match.';
    errEl.classList.add('show');
    return;
  }
  errEl.classList.remove('show');

  const btn = document.getElementById('spBtn');
  btn.disabled = true; btn.textContent = 'Saving...';
  try {
    await api.post('/auth/set-password', { newPassword, confirmPassword });
    // Update stored user
    const u = JSON.parse(localStorage.getItem('st_user') || '{}');
    u.firstLogin = false;
    localStorage.setItem('st_user', JSON.stringify(u));
    showToast('Password set successfully! Welcome to StudyVerse.', 'success');
    setTimeout(() => initApp(), 800);
  } catch (err) {
    errEl.textContent = err.message || 'Failed to set password.';
    errEl.classList.add('show');
  } finally {
    btn.disabled = false; btn.textContent = 'Set Password';
  }
}

// Password strength indicator
function checkPasswordStrength(val) {
  const bar = document.getElementById('pw-strength-bar');
  const label = document.getElementById('pw-strength-label');
  if (!bar || !label) return;
  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const levels = [
    { color: '#ef4444', text: 'Weak',   width: '25%' },
    { color: '#f59e0b', text: 'Fair',   width: '50%' },
    { color: '#3b82f6', text: 'Good',   width: '75%' },
    { color: '#16a34a', text: 'Strong', width: '100%' }
  ];
  const lvl = levels[Math.max(0, score - 1)] || levels[0];
  bar.style.width = val.length > 0 ? lvl.width : '0%';
  bar.style.background = lvl.color;
  label.textContent = val.length > 0 ? lvl.text : '';
  label.style.color = lvl.color;
}

// Toggle password visibility
function togglePwVisibility(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const isPass = inp.type === 'password';
  inp.type = isPass ? 'text' : 'password';
  btn.textContent = isPass ? '🙈' : '👁️';
}

// ===================== MOTIVATIONAL QUOTES =====================
const QUOTES = [
  "You debug my heart faster than JavaScript fixes bugs. 💻❤️",
  "Compiling knowledge... and maybe feelings too. 🔄",
  "You're the semicolon my life was missing. ;",
  "Error 404: Excuses not found. Keep studying! 🚀",
  "Your GPA and my heart rate go up every time I see you. 📈",
  "I would push to main just to impress you. 🌿",
  "You make my dopamine spike like a memory leak. 🧠",
  "Study hard — the best syntax is a good result. ✨",
  "They say coffee is a coder's best friend. But have you met deadlines? ☕",
  "Stack Overflow can't solve my crush on studying. 😅",
  "Your dedication has O(1) complexity — constantly impressive. ⚡",
  "Brain.exe is running. Please wait... ⏳",
  "In the algorithm of life, you're the optimal solution. 💡",
  "Every great developer was once a student. Keep going! 🎯",
  "You're not behind. You're on your own timeline. 🌟",
  "Ctrl+Z won't undo bad grades. Start now! 🔁",
  "Be the recursion you wish to see in the world. 🔄",
  "My love for you is like a while(true) loop — infinite. 💞",
  "Stay focused. Finals are temporary. Skills are forever. 🏆",
  "Error in life? Add more coffee and try again. ☕✨"
];

function getMotivationalQuote() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}
