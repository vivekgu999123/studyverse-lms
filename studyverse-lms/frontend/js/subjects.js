// ===================== SUBJECTS VIEW =====================
async function loadSubjectsView() {
  const grid = document.getElementById('subjectsGrid');
  const subtitle = document.getElementById('subjectsSubtitle');
  if (!grid) return;

  grid.innerHTML = `<div class="page-loading" style="grid-column:1/-1"><div class="loading-spinner"></div> Loading subjects...</div>`;

  if (!AppState.subjects.length) await loadSubjects();
  const subjects = AppState.subjects;

  if (subtitle) subtitle.textContent = `${subjects.length} subjects · Semester ${AppState.user?.semester}`;

  if (!subjects.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-state-icon">📚</div>
      <div class="empty-state-title">No subjects found</div>
      <div class="empty-state-text">Make sure the database is seeded. Visit /api/subjects/seed</div>
    </div>`;
    return;
  }

  // Load progress data to show per-subject completion
  let progressMap = {};
  try {
    const pData = await api.get('/progress');
    (pData.progress.subjectProgress || []).forEach(sp => {
      progressMap[sp.subject._id] = sp;
    });
  } catch {}

  grid.innerHTML = subjects.map(sub => {
    const sp = progressMap[sub._id] || { percent: 0, completed: 0, total: 0 };
    return `
      <div class="subject-card" style="--subject-color:${sub.color}" onclick="navigateTo('subject-detail', '${sub._id}')">
        <span class="subject-card-icon">${sub.icon}</span>
        <div class="subject-card-name">${escapeHtml(sub.name)}</div>
        <div class="subject-card-code">${sub.code}</div>
        <div class="text-xs text-muted mb-2">${sub.description}</div>
        <div class="subject-card-progress">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs text-muted">Tasks</span>
            <span class="text-xs font-semibold" style="color:${sub.color}">${sp.percent}%</span>
          </div>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill" style="width:${sp.percent}%;background:${sub.color}"></div>
          </div>
          <div class="text-xs text-muted mt-1">${sp.completed}/${sp.total} completed</div>
        </div>
      </div>`;
  }).join('');
}

// ===================== SUBJECT DETAIL =====================
async function loadSubjectDetail(subjectId) {
  if (!subjectId) return navigateTo('subjects');

  AppState.currentSubject = AppState.subjects.find(s => s._id === subjectId) || null;
  if (!AppState.currentSubject) {
    try {
      const d = await api.get(`/subjects/${subjectId}`);
      AppState.currentSubject = d.subject;
    } catch { return navigateTo('subjects'); }
  }

  const sub = AppState.currentSubject;

  // Update header
  document.getElementById('subjectDetailName').textContent = sub.name;
  document.getElementById('subjectDetailIcon').textContent = sub.icon;
  document.getElementById('subjectDetailTitle').textContent = sub.name;
  document.getElementById('subjectDetailDesc').textContent = `${sub.code} · ${sub.description}`;
  document.getElementById('topbarTitle').textContent = sub.name;

  // Set pre-selected subject in task modal
  const taskSubjectSelect = document.getElementById('taskSubject');
  if (taskSubjectSelect) taskSubjectSelect.value = subjectId;

  // Load resources tab by default
  switchSubjectTab('resources');
  loadSubjectResources(subjectId);
}

function switchSubjectTab(tab) {
  document.getElementById('subtab-resources').style.display = tab === 'resources' ? 'block' : 'none';
  document.getElementById('subtab-tasks').style.display = tab === 'tasks' ? 'block' : 'none';
  document.getElementById('tab-resources').classList.toggle('active', tab === 'resources');
  document.getElementById('tab-tasks').classList.toggle('active', tab === 'tasks');

  if (tab === 'tasks' && AppState.currentSubject) {
    loadSubjectTasks(AppState.currentSubject._id);
  }
}

// ===================== RESOURCES =====================
async function loadSubjectResources(subjectId) {
  const container = document.getElementById('resourcesList');
  if (!container) return;
  container.innerHTML = `<div class="page-loading"><div class="loading-spinner"></div></div>`;
  try {
    const data = await api.get(`/resources?subjectId=${subjectId}`);
    const resources = data.resources || [];
    renderResources(resources, container, subjectId);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-title">Failed to load</div></div>`;
  }
}

function renderResources(resources, container, subjectId) {
  if (!resources.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📎</div>
        <div class="empty-state-title">No resources yet</div>
        <div class="empty-state-text">Add links to helpful videos, articles, or notes for this subject.</div>
      </div>`;
    return;
  }

  const system = resources.filter(r => r.type === 'system');
  const personal = resources.filter(r => r.type === 'personal');

  let html = '';
  if (system.length) {
    html += `<div class="text-xs font-semibold text-muted" style="text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">📌 Provided by Team</div>`;
    html += system.map(r => renderResourceItem(r)).join('');
  }
  if (personal.length) {
    html += `<div class="text-xs font-semibold text-muted" style="text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;margin-top:16px">👤 Your Resources</div>`;
    html += personal.map(r => renderResourceItem(r, true)).join('');
  }

  container.innerHTML = html;
}

function renderResourceItem(resource, canDelete = false) {
  return `
    <div class="resource-item" id="resource-${resource._id}">
      <div class="resource-icon">${getResourceIcon(resource.resourceType)}</div>
      <div class="resource-content">
        <a href="${escapeHtml(resource.url)}" target="_blank" rel="noopener" class="resource-title">${escapeHtml(resource.title)}</a>
        <div class="resource-meta">
          <span class="badge ${resource.type === 'system' ? 'badge-system' : 'badge-personal'}">${resource.type}</span>
          ${resource.description ? `· ${escapeHtml(resource.description)}` : ''}
        </div>
      </div>
      ${canDelete ? `<button class="btn btn-icon" onclick="deleteResource('${resource._id}')" title="Remove" style="color:var(--text-muted)">🗑️</button>` : ''}
    </div>`;
}

async function handleAddResource(e) {
  e.preventDefault();
  clearError('resourceError');
  if (!AppState.currentSubject) return showError('resourceError', 'No subject selected.');

  const title = document.getElementById('resourceTitle').value.trim();
  const url = document.getElementById('resourceUrl').value.trim();
  const description = document.getElementById('resourceDescription').value.trim();
  const resourceType = document.getElementById('resourceType').value;

  try {
    await api.post('/resources', {
      title, url, description,
      subjectId: AppState.currentSubject._id,
      resourceType
    });
    closeModal('resourceModal');
    document.getElementById('resourceForm').reset();
    showToast('Resource added!', 'success');
    loadSubjectResources(AppState.currentSubject._id);
  } catch (err) {
    showError('resourceError', err.message);
  }
}

async function deleteResource(resourceId) {
  if (!confirm('Remove this resource?')) return;
  try {
    await api.delete(`/resources/${resourceId}`);
    document.getElementById(`resource-${resourceId}`)?.remove();
    showToast('Resource removed.', 'info');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ===================== SUBJECT TASKS =====================
async function loadSubjectTasks(subjectId) {
  const container = document.getElementById('subjectTasksList');
  if (!container) return;
  container.innerHTML = `<div class="page-loading"><div class="loading-spinner"></div></div>`;
  try {
    const data = await api.get(`/tasks?subjectId=${subjectId}`);
    const tasks = data.tasks || [];
    if (!tasks.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">✅</div>
          <div class="empty-state-title">No tasks for this subject</div>
          <div class="empty-state-text">Add a task to start tracking your work.</div>
        </div>`;
      return;
    }
    container.innerHTML = tasks.map(t => renderTaskItem(t, 'subject')).join('');
  } catch {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-title">Failed to load tasks</div></div>`;
  }
}
