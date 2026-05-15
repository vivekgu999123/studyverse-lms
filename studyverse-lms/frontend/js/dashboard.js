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
    const data = await api.get('/tasks?today=true');
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

  return `
    <div class="task-item" id="task-${task._id}">
      <div class="task-check ${done ? 'checked' : ''}" onclick="toggleTaskStatus('${task._id}', '${done ? 'pending' : 'completed'}')"></div>
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
          <div class="stat-label">Pending</div>
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
  try {
    const data = await api.put(`/tasks/${taskId}`, { status: newStatus });
    const task = data.task;

    // Update the DOM task item
    const taskEl = document.getElementById(`task-${taskId}`);
    if (taskEl) {
      const check = taskEl.querySelector('.task-check');
      const title = taskEl.querySelector('.task-title');
      if (newStatus === 'completed') {
        check.classList.add('checked');
        title.classList.add('done');
      } else {
        check.classList.remove('checked');
        title.classList.remove('done');
      }
    }

    if (newStatus === 'completed') {
      showToast(`Task completed! +10 pts 🎉`, 'success');
      refreshUserFromServer();
    }

    // Refresh relevant sections
    if (AppState.currentView === 'dashboard') {
      setTimeout(loadDashboardProgress, 500);
    } else if (AppState.currentView === 'tasks') {
      setTimeout(loadTasksView, 300);
    }
    updatePendingBadge();
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
