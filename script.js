/* Smart Student Planner - all data is stored in the browser (localStorage) */
const KEY = "smartStudentPlanner";
const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

let data = load();
let filter = "all";

/* ---------- Storage ---------- */
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && Array.isArray(d.tasks) && Array.isArray(d.sessions)) return d;
  } catch (e) {}
  return { tasks: [], sessions: [] };
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
}

/* ---------- Helpers ---------- */
const $ = (id) => document.getElementById(id);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function daysLeft(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + "T00:00:00");
  return Math.round((due - today) / 86400000);
}
function dueLabel(t) {
  const d = daysLeft(t.date);
  const pretty = new Date(t.date + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  if (t.done) return `Due ${pretty}`;
  if (d < 0) return `<span class="late">Overdue by ${-d} day${d === -1 ? "" : "s"}</span> · ${pretty}`;
  if (d === 0) return `<span class="late">Due today</span> · ${pretty}`;
  if (d === 1) return `Due tomorrow · ${pretty}`;
  return `Due in ${d} days · ${pretty}`;
}

/* ---------- Navigation ---------- */
document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    btn.classList.add("active");
    $(btn.dataset.view).classList.add("active");
    $("pageTitle").textContent = btn.querySelector("span").textContent;
  });
});

/* ---------- Task markup ---------- */
function taskHTML(t) {
  return `
    <li class="task ${t.priority} ${t.done ? "done" : ""}">
      <input type="checkbox" data-id="${t.id}" ${t.done ? "checked" : ""} aria-label="Mark complete">
      <div class="task-info">
        <div class="task-title">${esc(t.title)}</div>
        <div class="task-meta">${esc(t.subject)} · ${t.priority} priority · ${dueLabel(t)}</div>
      </div>
      <button class="del" data-del-task="${t.id}" aria-label="Delete assignment">🗑️</button>
    </li>`;
}

/* ---------- Renderers ---------- */
function renderDashboard() {
  const total = data.tasks.length;
  const done = data.tasks.filter((t) => t.done).length;
  const overdue = data.tasks.filter((t) => !t.done && daysLeft(t.date) < 0).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  $("statTotal").textContent = total;
  $("statDone").textContent = done;
  $("statPending").textContent = total - done;
  $("statOverdue").textContent = overdue;
  $("ringText").textContent = pct + "%";
  $("ring").style.setProperty("--p", pct);
  $("barFill").style.width = pct + "%";
  $("progressNote").textContent = !total
    ? "Add an assignment to get started."
    : pct === 100 ? "🎉 All tasks complete. Great work!"
    : `${done} of ${total} tasks completed. Keep going!`;

  const upcoming = data.tasks
    .filter((t) => !t.done)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);
  $("upcomingList").innerHTML = upcoming.length
    ? upcoming.map(taskHTML).join("")
    : '<li class="empty">No pending deadlines 🎉</li>';
}

function renderTasks() {
  let list = [...data.tasks].sort((a, b) => a.date.localeCompare(b.date));
  if (filter === "pending") list = list.filter((t) => !t.done);
  if (filter === "done") list = list.filter((t) => t.done);
  $("taskList").innerHTML = list.length
    ? list.map(taskHTML).join("")
    : '<li class="empty">No assignments here yet.</li>';
}

function renderWeek() {
  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  $("weekGrid").innerHTML = DAYS.map((day) => {
    const items = data.sessions
      .filter((s) => s.day === day)
      .sort((a, b) => a.start.localeCompare(b.start))
      .map((s) => `
        <div class="session">
          <b>${esc(s.subject)}</b>
          <small>${s.start} – ${s.end}</small>
          <button class="del" data-del-session="${s.id}" aria-label="Delete session">×</button>
        </div>`).join("");
    return `<div class="day ${day === todayName ? "today" : ""}"><h3>${day}</h3>${items || '<p class="muted" style="text-align:center">Free</p>'}</div>`;
  }).join("");
}

function renderAll() {
  renderDashboard();
  renderTasks();
  renderWeek();
}

/* ---------- Events ---------- */
$("taskForm").addEventListener("submit", (e) => {
  e.preventDefault();
  data.tasks.push({
    id: uid(),
    title: $("tTitle").value.trim(),
    subject: $("tSubject").value.trim(),
    date: $("tDate").value,
    priority: $("tPriority").value,
    done: false
  });
  save(); renderAll(); e.target.reset(); $("tPriority").value = "Medium";
});

$("sessionForm").addEventListener("submit", (e) => {
  e.preventDefault();
  if ($("sEnd").value <= $("sStart").value) {
    alert("End time must be after the start time.");
    return;
  }
  data.sessions.push({
    id: uid(),
    day: $("sDay").value,
    start: $("sStart").value,
    end: $("sEnd").value,
    subject: $("sSubject").value.trim()
  });
  save(); renderAll(); e.target.reset();
});

/* Checkbox + delete (event delegation) */
document.addEventListener("change", (e) => {
  if (e.target.matches('input[type="checkbox"][data-id]')) {
    const t = data.tasks.find((x) => x.id === e.target.dataset.id);
    if (t) { t.done = e.target.checked; save(); renderAll(); }
  }
});
document.addEventListener("click", (e) => {
  const delTask = e.target.closest("[data-del-task]");
  const delSession = e.target.closest("[data-del-session]");
  if (delTask && confirm("Delete this assignment?")) {
    data.tasks = data.tasks.filter((t) => t.id !== delTask.dataset.delTask);
    save(); renderAll();
  }
  if (delSession) {
    data.sessions = data.sessions.filter((s) => s.id !== delSession.dataset.delSession);
    save(); renderAll();
  }
  const chip = e.target.closest(".chip");
  if (chip) {
    filter = chip.dataset.filter;
    document.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === chip));
    renderTasks();
  }
});

/* ---------- Init ---------- */
$("todayText").textContent = new Date().toLocaleDateString(undefined, {
  weekday: "long", day: "numeric", month: "long", year: "numeric"
});
renderAll();
