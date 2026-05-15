// ===================== PROGRESS VIEW =====================
async function loadProgressView() {
  const statsEl = document.getElementById('progressStats');
  const subjectEl = document.getElementById('subjectProgressDetailed');
  const overallEl = document.getElementById('overallProgressCircle');
  const activityEl = document.getElementById('activityStats');

  if (statsEl) statsEl.innerHTML = `<div class="page-loading" style="grid-column:1/-1"><div class="loading-spinner"></div></div>`;

  try {
    const data = await api.get('/progress');
    const p = data.progress;

    // Stats cards
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--accent-light)">📋</div>
          <div class="stat-value">${p.total}</div>
          <div class="stat-label">Total Tasks</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--success-light)">✅</div>
          <div class="stat-value">${p.completed}</div>
          <div class="stat-label">Completed</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--warning-light)">⏳</div>
          <div class="stat-value">${p.pending}</div>
          <div class="stat-label">Remaining</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--bg-tertiary)">⚡</div>
          <div class="stat-value">${p.points}</div>
          <div class="stat-label">Points Earned</div>
        </div>`;
    }

    // Subject breakdown
    if (subjectEl) {
      if (!p.subjectProgress.length) {
        subjectEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📚</div><div class="empty-state-title">No data yet</div></div>`;
      } else {
        subjectEl.innerHTML = p.subjectProgress.map(sp => `
          <div style="margin-bottom:20px">
            <div class="flex items-center justify-between mb-2">
              <div style="display:flex;align-items:center;gap:8px">
                <span style="font-size:1.2rem">${sp.subject.icon}</span>
                <div>
                  <div class="text-sm font-semibold">${escapeHtml(sp.subject.name)}</div>
                  <div class="text-xs text-muted">${sp.completed} of ${sp.total} tasks done</div>
                </div>
              </div>
              <span style="font-family:var(--font-display);font-size:1.1rem;font-weight:800;color:${sp.subject.color}">${sp.percent}%</span>
            </div>
            <div class="progress-bar-wrap" style="height:10px">
              <div class="progress-bar-fill" style="width:${sp.percent}%;background:${sp.subject.color}"></div>
            </div>
          </div>`).join('');
      }
    }

    // Overall circle (CSS-drawn)
    const pct = p.overallPercent || 0;
    if (overallEl) {
      const color = pct >= 80 ? 'var(--success)' : pct >= 40 ? 'var(--accent)' : 'var(--warning)';
      const dash = 283; // circumference of r=45
      const fill = Math.round((pct / 100) * dash);
      overallEl.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:16px 0">
          <svg width="120" height="120" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--bg-tertiary)" stroke-width="8"/>
            <circle cx="50" cy="50" r="45" fill="none" stroke="${color}" stroke-width="8"
              stroke-dasharray="${fill} ${dash - fill}"
              stroke-dashoffset="70.75"
              stroke-linecap="round"
              style="transition:stroke-dasharray 0.8s ease"/>
            <text x="50" y="45" text-anchor="middle" font-family="Syne,sans-serif" font-size="18" font-weight="800" fill="var(--text-primary)">${pct}%</text>
            <text x="50" y="62" text-anchor="middle" font-size="9" fill="var(--text-muted)">COMPLETE</text>
          </svg>
          <div class="text-sm text-secondary" style="text-align:center">${p.completed} tasks done out of ${p.total} total</div>
        </div>`;
    }

    // Activity
    if (activityEl) {
      activityEl.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:12px">
          <div class="flex items-center justify-between" style="padding:10px;background:var(--bg-tertiary);border-radius:var(--radius-sm)">
            <span class="text-sm">🔥 Current Streak</span>
            <span class="font-bold" style="color:var(--warning)">${p.streak} days</span>
          </div>
          <div class="flex items-center justify-between" style="padding:10px;background:var(--bg-tertiary);border-radius:var(--radius-sm)">
            <span class="text-sm">⚡ Points Earned</span>
            <span class="font-bold" style="color:var(--accent-text)">${p.points} pts</span>
          </div>
          <div class="flex items-center justify-between" style="padding:10px;background:var(--bg-tertiary);border-radius:var(--radius-sm)">
            <span class="text-sm">📈 Completion Rate</span>
            <span class="font-bold">${p.overallPercent || 0}%</span>
          </div>
        </div>`;
    }
  } catch (err) {
    if (statsEl) statsEl.innerHTML = `<div class="page-loading" style="grid-column:1/-1;color:var(--danger)">Failed to load progress data.</div>`;
  }
}