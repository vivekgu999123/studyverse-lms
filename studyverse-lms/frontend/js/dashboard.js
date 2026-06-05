// ===================== DASHBOARD =====================
async function loadDashboard() {
  // Show motivational quote
  const quoteEl = document.getElementById('motivationalQuote');
  if (quoteEl) {
    quoteEl.textContent = getMotivationalQuote();
    quoteEl.style.display = 'block';
  }
  await Promise.all([
    loadTodayTasks(),
    loadDashboardProgress(),
    loadLeaderboardPreview(),
  ]);
  refreshUserFromServer();
}

// ---- TODAY'S TASKS ----
async function loadTodayTasks() {
  const container = document.getElementById('todayTasksList');
  if (!container) return;
  container.innerHTML = `<div class="page-loading"><div class="loading-spinner"></div></div>`;
  try {
    const data = await api.get('/tasks?today=true&status=pending');
    const tasks = data.tasks || [];
    AppState.allTasks = tasks;
    renderTodayTasks(tasks, container);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-title">Failed to load</div></div>`;
  }
}

function renderTodayTasks(tasks, container) {
  if (tasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🎉</div>
        <div class="empty-state-title">No tasks today!</div>
        <div class="empty-state-text">Clear schedule. Add a task to stay on track.</div>
      </div>`;
    return;
  }

  container.innerHTML = tasks.map(task => renderTaskItem(task, 'dashboard')).join('');
}

function renderTaskItem(task, context = 'all') {
  const done = task.status === 'completed';
  const dateLabel = formatDate(task.dueDate);
  const overdue = !done && isOverdue(task.dueDate);
  const dueSoon = !done && !overdue && isDueSoon(task.dueDate);

  const dateClass = overdue ? 'overdue' : dueSoon ? 'due-soon' : '';
  const subjectChip = task.subject
    ? `<span class="subject-chip" style="background:${task.subject.color}22;color:${task.subject.color}">${task.subject.icon} ${task.subject.name}</span>`
    : '';

  const clickAction = context === 'dashboard'
    ? `handleDashboardTaskClick('${task._id}', '${task.subject ? task.subject._id : ''}')`
    : `toggleTaskStatus('${task._id}', '${done ? 'pending' : 'completed'}')`;

  return `
    <div class="task-item" id="task-${task._id}">
      <div class="task-check ${done ? 'checked' : ''}" onclick="${clickAction}"></div>
      <div class="task-content">
        <div class="task-title ${done ? 'done' : ''}">${escapeHtml(task.title)}</div>
        <div class="task-meta">
          ${getPriorityBadge(task.priority)}
          <span class="date-tag ${dateClass}">📅 ${dateLabel}</span>
          ${subjectChip}
        </div>
      </div>
      <div class="task-actions">
        <button class="btn btn-icon" onclick="deleteTask('${task._id}')" title="Delete" style="color:var(--text-muted);font-size:0.85rem">🗑️</button>
      </div>
    </div>`;
}

async function handleDashboardTaskClick(taskId, subjectId) {
  triggerTaskCompletion(taskId, subjectId);
}

async function triggerTaskCompletion(taskId, subjectId) {
  if (AppState.activeCompletion) {
    showToast('A task is already undergoing completion wait.', 'warning');
    return;
  }

  // Redirect to relevant section first
  if (subjectId) {
    navigateTo('subject-detail', subjectId);
    setTimeout(() => {
      switchSubjectTab('tasks');
    }, 200);
  } else {
    navigateTo('tasks');
  }

  showToast('Stay on this page for 1.5 minutes to complete the task...', 'info', 6000);

  const timer = setTimeout(async () => {
    try {
      await api.put(`/tasks/${taskId}`, { status: 'completed' });
      showToast(`Task completed! +10 pts 🎉`, 'success');
      refreshUserFromServer();
      updatePendingBadge();
      AppState.activeCompletion = null;

      // Refresh current view to show the completed task in the completed section
      if (AppState.currentView === 'subject-detail' && AppState.currentSubject) {
        loadSubjectTasks(AppState.currentSubject._id);
      } else if (AppState.currentView === 'tasks') {
        loadTasksView();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }, 90000); // 90 seconds = 1.5 minutes

  AppState.activeCompletion = {
    timer,
    taskId,
    subjectId
  };
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ---- DASHBOARD PROGRESS + STATS ----
async function loadDashboardProgress() {
  try {
    const data = await api.get('/progress');
    const p = data.progress;

    // Stats cards
    const statsEl = document.getElementById('dashboardStats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--accent-light)">✅</div>
          <div class="stat-value">${p.completed}</div>
          <div class="stat-label">Tasks Done</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--warning-light)">⏳</div>
          <div class="stat-value">${p.pending}</div>
          <div class="stat-label">Pending Tasks</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--success-light)">📈</div>
          <div class="stat-value">${p.overallPercent}%</div>
          <div class="stat-label">Completion Rate</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--warning-light)">🔥</div>
          <div class="stat-value">${p.streak}</div>
          <div class="stat-label">Day Streak</div>
        </div>`;
    }

    // Subject progress list
    const subEl = document.getElementById('subjectProgressList');
    if (subEl) {
      if (!p.subjectProgress.length) {
        subEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📚</div><div class="empty-state-title">No subjects loaded</div></div>`;
      } else {
        subEl.innerHTML = p.subjectProgress.map(sp => `
          <div style="margin-bottom:14px">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium" style="display:flex;align-items:center;gap:6px">
                <span>${sp.subject.icon}</span>${sp.subject.name}
              </span>
              <span class="text-xs text-muted">${sp.completed}/${sp.total} tasks</span>
            </div>
            <div class="progress-bar-wrap">
              <div class="progress-bar-fill ${sp.percent >= 80 ? 'success' : sp.percent >= 40 ? '' : 'warning'}"
                style="width:${sp.percent}%; background:${sp.subject.color}"></div>
            </div>
          </div>`).join('');
      }
    }

    // Gamification stats
    const gameEl = document.getElementById('gamificationStats');
    if (gameEl) {
      gameEl.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;text-align:center">
          <div style="padding:16px;background:var(--bg-tertiary);border-radius:var(--radius-md)">
            <div style="font-size:1.8rem;font-family:var(--font-display);font-weight:800;color:var(--text-primary)">${p.points}</div>
            <div class="text-xs text-muted" style="margin-top:2px;text-transform:uppercase;letter-spacing:.05em">Total Points</div>
          </div>
          <div style="padding:16px;background:var(--warning-light);border-radius:var(--radius-md)">
            <div style="font-size:1.8rem;font-family:var(--font-display);font-weight:800;color:var(--warning)">${p.streak} 🔥</div>
            <div class="text-xs" style="color:var(--warning);margin-top:2px;text-transform:uppercase;letter-spacing:.05em">Day Streak</div>
          </div>
        </div>
        <p class="text-xs text-muted" style="margin-top:12px;text-align:center">+10 pts for every completed task</p>`;
    }
  } catch (err) {
    console.error('Dashboard progress error:', err);
  }
}

// ---- LEADERBOARD PREVIEW ----
async function loadLeaderboardPreview() {
  const container = document.getElementById('leaderboardPreview');
  if (!container) return;
  try {
    const data = await api.get('/gamification/leaderboard');
    const leaders = data.leaderboard || [];
    if (!leaders.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🏆</div><div class="empty-state-title">No rankings yet</div></div>`;
      return;
    }
    container.innerHTML = leaders.map((l, i) => `
      <div class="leader-item">
        <div class="leader-rank rank-${i+1}">${i+1}</div>
        <div class="leader-name">${escapeHtml(l.username || 'Anonymous')}</div>
        <div class="leader-points">⚡ ${l.points}</div>
      </div>`).join('');
  } catch {}
}

// ===================== TASK TOGGLE =====================
async function toggleTaskStatus(taskId, newStatus) {
  if (newStatus === 'completed') {
    const task = AppState.allTasks.find(t => t._id === taskId) || 
                 (typeof allTasksCache !== 'undefined' ? allTasksCache.find(t => t._id === taskId) : null);
    const subjectId = task && task.subject ? (task.subject._id || task.subject) : null;
    triggerTaskCompletion(taskId, subjectId);
    return;
  }

  try {
    const data = await api.put(`/tasks/${taskId}`, { status: newStatus });
    showToast('Task moved back to pending.', 'info');
    refreshUserFromServer();
    updatePendingBadge();

    // Refresh relevant sections
    if (AppState.currentView === 'dashboard') {
      setTimeout(loadDashboardProgress, 500);
    } else if (AppState.currentView === 'tasks') {
      setTimeout(loadTasksView, 300);
    } else if (AppState.currentView === 'subject-detail' && AppState.currentSubject) {
      loadSubjectTasks(AppState.currentSubject._id);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ===================== DELETE TASK =====================
async function deleteTask(taskId) {
  if (!confirm('Delete this task?')) return;
  try {
    await api.delete(`/tasks/${taskId}`);
    const el = document.getElementById(`task-${taskId}`);
    if (el) el.remove();
    showToast('Task deleted.', 'info');
    updatePendingBadge();
    if (AppState.currentView === 'dashboard') loadDashboardProgress();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
