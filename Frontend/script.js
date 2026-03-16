const API = 'http://localhost:8080';

let allTasks      = [];
let currentFilter = 'all';
let currentPrio   = 'low';

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  loadTasks();

  document.getElementById('taskInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') addTask();
  });

  document.querySelectorAll('.prio-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.prio-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPrio = btn.dataset.prio;
    });
  });

  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
});

// ── Theme ─────────────────────────────────────────────────────
function loadTheme() {
  setTheme(localStorage.getItem('theme') || 'dark');
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  setTheme(current === 'dark' ? 'light' : 'dark');
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  document.getElementById('themeIcon').textContent = theme === 'dark' ? '☀' : '☾';
}

// ── Load tasks ────────────────────────────────────────────────
async function loadTasks() {
  try {
    const res = await fetch(`${API}/tasks`);
    if (!res.ok) throw new Error();
    allTasks = await res.json();
    renderTasks();
  } catch {
    showToast('Cannot reach backend. Is the server running?', true);
    allTasks = [];
    renderTasks();
  }
}

// ── Render ────────────────────────────────────────────────────
function renderTasks() {
  const list  = document.getElementById('taskList');
  const empty = document.getElementById('emptyState');

  // Filter
  let tasks = allTasks.filter(t => {
    if (currentFilter === 'active')  return !t.completed;
    if (currentFilter === 'done')    return  t.completed;
    if (currentFilter === 'high')    return  t.priority === 'high';
    if (currentFilter === 'overdue') return  isOverdue(t);
    return true;
  });

  // Sort
  const sort = document.getElementById('sortSelect')?.value || 'newest';
  if (sort === 'priority') {
    const order = { high: 0, medium: 1, low: 2 };
    tasks.sort((a, b) => (order[a.priority] ?? 2) - (order[b.priority] ?? 2));
  } else if (sort === 'duedate') {
    tasks.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
  }

  // Update stats
  const done    = allTasks.filter(t => t.completed).length;
  const overdue = allTasks.filter(t => isOverdue(t)).length;
  document.getElementById('statTotal').textContent   = allTasks.length;
  document.getElementById('statDone').textContent    = done;
  document.getElementById('statOverdue').textContent = overdue;

  // Clear old items
  list.querySelectorAll('.task-item').forEach(n => n.remove());

  if (tasks.length === 0) {
    empty.style.display = '';
    return;
  }

  empty.style.display = 'none';

  tasks.forEach((task, i) => {
    const serial    = i + 1;
    const item      = document.createElement('div');
    const prioLabel = task.priority || 'low';
    item.className  = `task-item prio-${prioLabel}${task.completed ? ' done' : ''}${isOverdue(task) ? ' overdue' : ''}`;
    item.style.animationDelay = `${i * 35}ms`;
    item.dataset.id = task.id;

    // Build inline priority buttons
    const prioBtns = ['low','medium','high'].map(p =>
      `<button class="inline-prio-btn${prioLabel === p ? ' active' : ''}" data-prio="${p}" onclick="markPendingPrio(${task.id},'${p}',this)">${p}</button>`
    ).join('');

    item.innerHTML = `
      <span class="task-serial">#${serial}</span>
      <button class="task-checkbox" onclick="completeTask(${task.id})" title="Toggle complete">
        <svg viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polyline points="1,5 4.5,8.5 11,1" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div class="task-content">
        <div class="task-desc">${escapeHTML(task.description)}</div>
        <div class="task-footer">
          <div class="task-footer-left">
            <span class="prio-badge ${prioLabel}">${prioLabel}</span>
          </div>
          <div class="task-footer-right">
            ${buildDueBadge(task)}
          </div>
        </div>
        <div class="task-edit-row" id="edit-${task.id}" style="display:none;">
          <div class="inline-prio">${prioBtns}</div>
          <div class="inline-date-wrapper" onclick="this.querySelector('input').showPicker()">
            <span>📅</span>
            <input type="date" class="inline-date-input" id="editDate-${task.id}" value="${task.dueDate || ''}"/>
          </div>
          <button class="inline-save-btn" onclick="saveEdit(${task.id})">Save</button>
        </div>
      </div>
      <button class="task-edit-toggle" onclick="toggleEdit(${task.id})" title="Edit priority / date">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      <button class="task-delete" onclick="deleteTask(${task.id})" title="Delete task">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;
    list.appendChild(item);
  });
}

// ── Toggle edit row ───────────────────────────────────────────
function toggleEdit(id) {
  const row = document.getElementById(`edit-${id}`);
  if (!row) return;
  const isOpen = row.style.display !== 'none';
  document.querySelectorAll('.task-edit-row').forEach(r => r.style.display = 'none');
  row.style.display = isOpen ? 'none' : 'flex';
}

// ── Mark pending priority (before save) ──────────────────────
function markPendingPrio(id, prio, btn) {
  const row = document.getElementById(`edit-${id}`);
  if (!row) return;
  row.querySelectorAll('.inline-prio-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  row.dataset.pendingPrio = prio;
}

// ── Save edit ─────────────────────────────────────────────────
async function saveEdit(id) {
  const row       = document.getElementById(`edit-${id}`);
  const dateInput = document.getElementById(`editDate-${id}`);
  const activeBtn = row.querySelector('.inline-prio-btn.active');
  const newPrio   = row.dataset.pendingPrio || activeBtn?.dataset.prio || 'low';
  const newDate   = dateInput?.value || '';

  try {
    await fetch(`${API}/update`, {
      method:  'POST',
      body:    `${id}||${newPrio}||${newDate}`,
      headers: { 'Content-Type': 'text/plain' }
    });
    await loadTasks();
    showToast('Task updated ✓');
  } catch {
    showToast('Failed to update task.', true);
  }
}

// ── Due date helpers ──────────────────────────────────────────
function buildDueBadge(task) {
  if (!task.dueDate) return '';
  const today = new Date(); today.setHours(0,0,0,0);
  const due   = new Date(task.dueDate + 'T00:00:00');
  const diff  = Math.round((due - today) / 86400000);

  if (task.completed) return `<span class="due-badge">📅 ${formatDate(task.dueDate)}</span>`;
  if (diff < 0)       return `<span class="due-badge overdue">⚠ Overdue · ${formatDate(task.dueDate)}</span>`;
  if (diff === 0)     return `<span class="due-badge due-soon">⏰ Due today</span>`;
  if (diff === 1)     return `<span class="due-badge due-soon">⏰ Due tomorrow</span>`;
  if (diff <= 3)      return `<span class="due-badge due-soon">📅 Due in ${diff} days</span>`;
  return `<span class="due-badge">📅 ${formatDate(task.dueDate)}</span>`;
}

function isOverdue(task) {
  if (!task.dueDate || task.completed) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  return new Date(task.dueDate + 'T00:00:00') < today;
}

function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

// ── Add task ──────────────────────────────────────────────────
async function addTask() {
  const input     = document.getElementById('taskInput');
  const dateInput = document.getElementById('dueDateInput');
  const desc      = input.value.trim();

  if (!desc) {
    input.style.borderColor = 'var(--danger)';
    setTimeout(() => input.style.borderColor = '', 800);
    input.focus();
    return;
  }

  const btn = document.getElementById('addBtn');
  btn.disabled = true;

  try {
    const res = await fetch(`${API}/add`, {
      method:  'POST',
      body:    `${desc}||${currentPrio}||${dateInput.value || ''}`,
      headers: { 'Content-Type': 'text/plain' }
    });
    if (!res.ok) throw new Error();
    input.value     = '';
    dateInput.value = '';
    await loadTasks();
    showToast('Task added ✓');
  } catch {
    showToast('Failed to add task.', true);
  } finally {
    btn.disabled = false;
  }
}

// ── Complete ──────────────────────────────────────────────────
async function completeTask(id) {
  try {
    await fetch(`${API}/complete`, {
      method: 'POST', body: String(id),
      headers: { 'Content-Type': 'text/plain' }
    });
    await loadTasks();
  } catch {
    showToast('Failed to update task.', true);
  }
}

// ── Delete ────────────────────────────────────────────────────
async function deleteTask(id) {
  const item = document.querySelector(`.task-item[data-id="${id}"]`);
  if (item) {
    item.style.transition = 'opacity .2s, transform .2s';
    item.style.opacity    = '0';
    item.style.transform  = 'translateX(20px)';
  }
  setTimeout(async () => {
    try {
      await fetch(`${API}/delete`, {
        method: 'POST', body: String(id),
        headers: { 'Content-Type': 'text/plain' }
      });
      await loadTasks();
    } catch {
      showToast('Failed to delete task.', true);
      await loadTasks();
    }
  }, 200);
}

// ── Filter ────────────────────────────────────────────────────
function setFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTasks();
}

// ── Helpers ───────────────────────────────────────────────────
function escapeHTML(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

let toastTimer;
function showToast(msg, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className   = 'toast show' + (isError ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}