// ===================== LEADERBOARD VIEW =====================
async function loadLeaderboardView() {
  const container = document.getElementById('fullLeaderboard');
  const myRankingEl = document.getElementById('myRanking');
  const optInToggle = document.getElementById('leaderboardOptIn');

  if (container) container.innerHTML = `<div class="page-loading"><div class="loading-spinner"></div></div>`;

  // Set opt-in toggle from user state
  if (optInToggle && AppState.user) {
    optInToggle.checked = AppState.user.optInLeaderboard !== false;
  }

  try {
    const data = await api.get('/gamification/leaderboard');
    const leaders = data.leaderboard || [];

    if (!leaders.length) {
      if (container) container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🏆</div>
          <div class="empty-state-title">No rankings yet</div>
          <div class="empty-state-text">Complete tasks and opt in to appear here.</div>
        </div>`;
    } else {
      if (container) container.innerHTML = leaders.map((l, i) => `
        <div class="leader-item">
          <div class="leader-rank rank-${i+1}">${i+1}</div>
          <div>
            <div class="leader-name">${escapeHtml(l.username || 'Anonymous')}</div>
            <div class="text-xs text-muted">🔥 ${l.streak || 0} day streak</div>
          </div>
          <div class="leader-points">⚡ ${l.points} pts</div>
        </div>`).join('');
    }

    // My ranking
    if (myRankingEl && AppState.user) {
      const u = AppState.user || JSON.parse(localStorage.getItem('st_user') || '{}');
      const myRank = leaders.findIndex(l =>
        String(l._id) === String(u.id) ||
        String(l._id) === String(u._id)
      ) + 1;
      myRankingEl.innerHTML = `
        <div style="text-align:center;padding:16px 0">
          <div style="font-family:var(--font-display);font-size:3rem;font-weight:800;color:var(--text-primary)">
            ${myRank > 0 ? `#${myRank}` : '—'}
          </div>
          <div class="text-sm text-muted">${myRank > 0 ? 'Your current rank' : 'Not on leaderboard yet'}</div>
          <div style="margin-top:12px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
            <span class="sidebar-user-points" style="display:inline-flex">⚡ ${u.points || 0} pts</span>
            <span class="streak-display">🔥 ${u.streak || 0} days</span>
          </div>
        </div>`;
    }
  } catch (err) {
    if (container) container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-title">Failed to load</div></div>`;
  }
}

async function updateLeaderboardOptIn(optIn) {
  try {
    await api.put('/gamification/optin', { optIn });
    AppState.user.optInLeaderboard = optIn;
    localStorage.setItem('st_user', JSON.stringify(AppState.user));
    showToast(`Leaderboard opt-${optIn ? 'in' : 'out'} updated.`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}
