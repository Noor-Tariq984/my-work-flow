const KEY = "taskflow-pro-data";
const CURRENT_VERSION = 2;

const seedTasks = [
  {id: crypto.randomUUID(), title:"Finish internship report", description:"Complete the architecture and testing sections.", status:"progress", priority:"high", due:"2026-08-15", createdAt:Date.now()-500000, order:0},
  {id: crypto.randomUUID(), title:"Review JavaScript modules", description:"Practice import/export and module organization.", status:"todo", priority:"medium", due:"2026-08-16", createdAt:Date.now()-400000, order:1},
  {id: crypto.randomUUID(), title:"Prepare project screenshots", description:"Capture clean screenshots for the final report.", status:"done", priority:"low", due:"2026-08-12", createdAt:Date.now()-300000, order:2}
];

const normalizeTask = (task, index=0) => ({
  id: task.id || crypto.randomUUID(),
  title: String(task.title ?? "Untitled task"),
  description: String(task.description ?? ""),
  status: ["todo","progress","done"].includes(task.status) ? task.status : "todo",
  priority: ["high","medium","low"].includes(task.priority) ? task.priority : "medium",
  due: task.due || "",
  createdAt: Number(task.createdAt) || Date.now(),
  order: Number.isFinite(task.order) ? task.order : index
});

const migrate = (raw) => {
  if (!raw) return {version:CURRENT_VERSION,tasks:seedTasks};
  if (Array.isArray(raw)) return {version:CURRENT_VERSION,tasks:raw.map(normalizeTask)};
  if (raw.version === 1) {
    return {version:CURRENT_VERSION,tasks:(raw.tasks || []).map((t,i)=>normalizeTask(t,i))};
  }
  return {version:CURRENT_VERSION,tasks:(raw.tasks || []).map(normalizeTask)};
};

export const loadState = () => {
  try { return migrate(JSON.parse(localStorage.getItem(KEY))); }
  catch { return {version:CURRENT_VERSION,tasks:seedTasks}; }
};

export const saveState = (state) => {
  localStorage.setItem(KEY, JSON.stringify({version:CURRENT_VERSION,tasks:state.tasks}));
};