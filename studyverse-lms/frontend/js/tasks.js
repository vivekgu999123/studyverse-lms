// ===================== ALL TASKS VIEW =====================
let currentTaskFilter = 'all';
let allTasksCache = [];

async function loadTasksView() {
  const container = document.getElementById('allTasksList');
  if (!container) return;
  container.innerHTML = `<div class="page-loading"><div class="loading-spinner"></div> Loading tasks...</div>`;
  try {
    const data = await api.get('/tasks');
    allTasksCache = data.tasks || [];
    renderFilteredTasks(currentTaskFilter);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-title">Failed to load tasks</div></div>`;
  }
}

function filterTasks(filter, btn) {
  currentTaskFilter = filter;
  // Update active filter button
  document.querySelectorAll('.task-filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderFilteredTasks(filter);
}

function renderFilteredTasks(filter) {
  const container = document.getElementById('allTasksList');
  if (!container) return;

  let tasks = [...allTasksCache];

  if (filter === 'pending') tasks = tasks.filter(t => t.status === 'pending');
  else if (filter === 'completed') tasks = tasks.filter(t => t.status === 'completed');
  else if (filter === 'high') tasks = tasks.filter(t => t.priority === 'high');
  else if (filter === 'medium') tasks = tasks.filter(t => t.priority === 'medium');
  else if (filter === 'low') tasks = tasks.filter(t => t.priority === 'low');

  if (!tasks.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-title">No tasks found</div>
        <div class="empty-state-text">Try a different filter or add a new task.</div>
      </div>`;
    return;
  }

  // Group by date
  const groups = {};
  tasks.forEach(task => {
    const key = new Date(task.dueDate).toDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(task);
  });

  let html = '';
  Object.entries(groups).forEach(([dateStr, groupTasks]) => {
    const label = formatDate(groupTasks[0].dueDate);
    html += `
      <div style="padding:12px 0 4px;border-bottom:1px solid var(--border);margin-bottom:4px">
        <span class="text-xs font-bold text-muted" style="text-transform:uppercase;letter-spacing:.06em">${label}</span>
      </div>`;
    html += groupTasks.map(t => renderTaskItem(t, 'all')).join('');
  });

  container.innerHTML = html;
}

// ===================== ADD TASK HANDLER =====================
async function handleAddTask(e) {
  e.preventDefault();
  clearError('taskError');

  const title = document.getElementById('taskTitle').value.trim();
  const description = document.getElementById('taskDescription').value.trim();
  const priority = document.getElementById('taskPriority').value;
  const dueDate = document.getElementById('taskDueDate').value;
  const subjectId = document.getElementById('taskSubject').value;

  if (!title) return showError('taskError', 'Task title is required.');
  if (!dueDate) return showError('taskError', 'Due date is required.');

  try {
    const payload = { title, description, priority, dueDate };
    if (subjectId) payload.subjectId = subjectId;

    await api.post('/tasks', payload);
    closeModal('taskModal');
    document.getElementById('taskForm').reset();
    // Reset date to today
    document.getElementById('taskDueDate').value = new Date().toISOString().split('T')[0];

    showToast('Task added!', 'success');
    updatePendingBadge();

    // Refresh current view
    if (AppState.currentView === 'dashboard') await loadDashboard();
    else if (AppState.currentView === 'tasks') await loadTasksView();
    else if (AppState.currentView === 'subject-detail' && AppState.currentSubject) {
      await loadSubjectTasks(AppState.currentSubject._id);
    }
  } catch (err) {
    showError('taskError', err.message);
  }
}
