// ===================== SETTINGS VIEW =====================
function loadSettingsView() {
  const u = AppState.user;
  if (!u) return;

  const name = u.username || u.email || '?';
  document.getElementById('profileAvatar').textContent = name.charAt(0).toUpperCase();
  document.getElementById('profileName').textContent = name;
  document.getElementById('profileEmail').textContent = u.email || '—';
  document.getElementById('profileSemester').textContent = `Semester ${u.semester} · CS Department`;
  document.getElementById('profileStreak').textContent = u.streak || 0;
  document.getElementById('profilePoints').textContent = u.points || 0;

  const usernameInput = document.getElementById('settingsUsername');
  const semesterSelect = document.getElementById('settingsSemester');
  if (usernameInput) usernameInput.value = u.username || '';
  if (semesterSelect) semesterSelect.value = u.semester || 1;

  // Sync theme toggle
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const toggle = document.getElementById('themeToggleSettings');
  if (toggle) toggle.checked = isDark;
}

async function handleUpdateProfile(e) {
  e.preventDefault();
  const username = document.getElementById('settingsUsername').value.trim();
  const semester = Number(document.getElementById('settingsSemester').value);
  if (!username) return showToast('Name cannot be empty.', 'error');
  try {
    const data = await api.put('/auth/setup', { username, semester });
    AppState.user = { ...AppState.user, ...data.user };
    localStorage.setItem('st_user', JSON.stringify(AppState.user));

    // Reload subjects for new semester so task modal dropdown updates
    await loadSubjects();
    populateTaskSubjectDropdown();

    updateSidebar();
    loadSettingsView();
    showToast('Profile updated! Subjects updated to Semester ' + semester, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}
