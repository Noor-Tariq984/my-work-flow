import {TaskStore} from "./state.js";
import {CommandManager, StateCommand} from "./commands.js";

const store = new TaskStore();
const commandHistory = new CommandManager(20, render);
const $ = (id)=>document.getElementById(id);
const ui = {
  list:$("taskList"), empty:$("emptyState"), search:$("searchInput"),
  status:$("statusFilter"), priority:$("priorityFilter"), sort:$("sortSelect"),
  result:$("resultCount"), dialog:$("taskDialog"), form:$("taskForm"),
  id:$("taskId"), title:$("taskTitle"), desc:$("taskDescription"),
  taskStatus:$("taskStatus"), taskPriority:$("taskPriority"), due:$("taskDue"),
  toast:$("toast")
};
let currentTasks=[];
let searchTimer;
let draggedId=null;

const params = new URLSearchParams(location.search);
ui.status.value=params.get("status") || "all";
ui.priority.value=params.get("priority") || "all";
ui.sort.value=params.get("sort") || "manual";
ui.search.value=params.get("q") || "";

const escapeHTML = (s)=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const highlight = (text,q)=>{
  const safe=escapeHTML(text); if(!q) return safe;
  const re=new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})`,"ig");
  return safe.replace(re,"<mark class='match'>$1</mark>");
};
const clone=(x)=>JSON.parse(JSON.stringify(x));

function filteredTasks(){
  let list=store.tasks;
  const q=ui.search.value.trim().toLowerCase();
  if(ui.status.value!=="all") list=list.filter(t=>t.status===ui.status.value);
  if(ui.priority.value!=="all") list=list.filter(t=>t.priority===ui.priority.value);
  if(q) list=list.filter(t=>`${t.title} ${t.description}`.toLowerCase().includes(q));
  const priority={high:0,medium:1,low:2};
  if(ui.sort.value==="priority") list.sort((a,b)=>priority[a.priority]-priority[b.priority]);
  if(ui.sort.value==="due") list.sort((a,b)=>(a.due||"9999").localeCompare(b.due||"9999"));
  if(ui.sort.value==="title") list.sort((a,b)=>a.title.localeCompare(b.title));
  if(ui.sort.value==="newest") list.sort((a,b)=>b.createdAt-a.createdAt);
  return list;
}
function syncURL(){
  const p=new URLSearchParams();
  if(ui.search.value)p.set("q",ui.search.value);
  if(ui.status.value!=="all")p.set("status",ui.status.value);
  if(ui.priority.value!=="all")p.set("priority",ui.priority.value);
  if(ui.sort.value!=="manual")p.set("sort",ui.sort.value);
  window.history.replaceState(null,"",`${location.pathname}${p.toString()?"?"+p:""}`);
}
function render(){
  currentTasks=filteredTasks();
  const all=store.tasks;
  $("totalCount").textContent=all.length;
  $("todoCount").textContent=all.filter(t=>t.status==="todo").length;
  $("progressCount").textContent=all.filter(t=>t.status==="progress").length;
  $("doneCount").textContent=all.filter(t=>t.status==="done").length;
  $("progressValue").textContent=all.length?Math.round(all.filter(t=>t.status==="done").length/all.length*100)+"%":"0%";
  ui.result.textContent=`${currentTasks.length} task${currentTasks.length!==1?"s":""}`;
  ui.list.innerHTML="";
  ui.empty.classList.toggle("hidden",currentTasks.length!==0);
  currentTasks.forEach(task=>{
    const card=document.createElement("article");
    card.className="task-card"; card.draggable=true; card.dataset.id=task.id;
    const overdue=task.due && task.due<new Date().toISOString().slice(0,10) && task.status!=="done";
    card.innerHTML=`
      <button class="check ${task.status==="done"?"done":""}" data-action="toggle" title="Mark complete">${task.status==="done"?"✓":""}</button>
      <div>
        <h4 class="task-title">${highlight(task.title,ui.search.value.trim())}</h4>
        <p class="task-desc">${highlight(task.description,ui.search.value.trim())}</p>
        <div class="task-meta">
          <span class="tag ${task.priority}">${task.priority}</span>
          <span class="tag status">${task.status==="progress"?"In Progress":task.status==="done"?"Completed":"To Do"}</span>
          ${task.due?`<span class="tag status ${overdue?"overdue":""}">Due ${escapeHTML(task.due)}</span>`:""}
        </div>
      </div>
      <div class="task-actions">
        <button class="mini-btn" data-action="edit" title="Edit">✎</button>
        <button class="mini-btn" data-action="delete" title="Delete">⌫</button>
      </div>`;
    ui.list.appendChild(card);
  });
}
function commit(next,label){
  const before=clone(store.tasks), after=clone(next);
  commandHistory.execute(new StateCommand(store,before,after,label));
  showToast(label);
}
function openCreate(){
  ui.form.reset(); ui.id.value=""; ui.taskStatus.value="todo"; ui.taskPriority.value="medium";
  $("dialogTitle").textContent="Create task"; ui.dialog.showModal(); ui.title.focus();
}
function openEdit(id){
  const t=store.tasks.find(x=>x.id===id); if(!t)return;
  ui.id.value=t.id; ui.title.value=t.title; ui.desc.value=t.description; ui.taskStatus.value=t.status; ui.taskPriority.value=t.priority; ui.due.value=t.due;
  $("dialogTitle").textContent="Edit task"; ui.dialog.showModal(); ui.title.focus();
}
function saveTask(){
  const id=ui.id.value, before=store.tasks, task={id:id||crypto.randomUUID(),title:ui.title.value.trim(),description:ui.desc.value.trim(),status:ui.taskStatus.value,priority:ui.taskPriority.value,due:ui.due.value,createdAt:id?(store.tasks.find(t=>t.id===id)?.createdAt||Date.now()):Date.now(),order:store.tasks.length};
  if(!task.title)return;
  const next=id?before.map(t=>t.id===id?{...t,...task}:t):[...before,task];
  commit(next,id?"Task updated":"Task created"); ui.dialog.close(); render();
}
function showToast(msg){ui.toast.textContent=msg;ui.toast.classList.add("show");setTimeout(()=>ui.toast.classList.remove("show"),1500)}
function updateFilters(){syncURL(); render()}
function moveTask(id,targetId){
  const arr=store.tasks; const from=arr.findIndex(t=>t.id===id), to=arr.findIndex(t=>t.id===targetId);
  if(from<0||to<0||from===to)return;
  const [item]=arr.splice(from,1); arr.splice(to,0,item); commit(arr,"Task order changed");
}

store.subscribe(render);
ui.form.addEventListener("submit",(e)=>{e.preventDefault();saveTask()});
$("closeDialogBtn").addEventListener("click",()=>ui.dialog.close());
$("cancelTaskBtn").addEventListener("click",()=>ui.dialog.close());
$("addTopBtn").onclick=openCreate;
$("undoBtn").onclick=()=>commandHistory.undo()&&showToast("Undo complete");
$("redoBtn").onclick=()=>commandHistory.redo()&&showToast("Redo complete");
ui.status.onchange=updateFilters; ui.priority.onchange=updateFilters; ui.sort.onchange=updateFilters;
ui.search.addEventListener("input",()=>{
  clearTimeout(searchTimer);
  searchTimer=setTimeout(updateFilters,250);
});
ui.search.addEventListener("keydown",(e)=>{
  if(e.key==="Enter"){
    e.preventDefault();
    clearTimeout(searchTimer);
    updateFilters();
  }
});
$("clearFiltersBtn").onclick=()=>{ui.search.value="";ui.status.value="all";ui.priority.value="all";ui.sort.value="manual";updateFilters()};
ui.list.addEventListener("click",(e)=>{
  const card=e.target.closest(".task-card"); if(!card)return;
  const id=card.dataset.id, action=e.target.closest("[data-action]")?.dataset.action;
  if(action==="edit")openEdit(id);
  if(action==="delete" && confirm("Delete this task?"))commit(store.tasks.filter(t=>t.id!==id),"Task deleted");
  if(action==="toggle"){const t=store.tasks.find(x=>x.id===id);commit(store.tasks.map(x=>x.id===id?{...x,status:x.status==="done"?"todo":"done"}:x),"Task status changed")}
});
ui.list.addEventListener("dragstart",e=>{const card=e.target.closest(".task-card");draggedId=card?.dataset.id;card?.classList.add("dragging")});
ui.list.addEventListener("dragend",e=>e.target.closest(".task-card")?.classList.remove("dragging"));
ui.list.addEventListener("dragover",e=>{e.preventDefault()});
ui.list.addEventListener("drop",e=>{e.preventDefault();const target=e.target.closest(".task-card");if(target&&draggedId)moveTask(draggedId,target.dataset.id);draggedId=null});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape" && ui.dialog.open){ui.dialog.close();return;}
  const typing=["INPUT","TEXTAREA","SELECT"].includes(document.activeElement.tagName);
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){e.preventDefault();commandHistory.undo()&&showToast("Undo complete")}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="y"){e.preventDefault();commandHistory.redo()&&showToast("Redo complete")}
  if(!typing&&e.key.toLowerCase()==="n"){e.preventDefault();openCreate()}
  if(!typing&&e.key==="/"){e.preventDefault();ui.search.focus()}
});
render();