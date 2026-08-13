import {loadState, saveState} from "./storage.js";
export class TaskStore {
  constructor(){ this.state=loadState(); this.listeners=new Set(); }
  get tasks(){ return [...this.state.tasks].sort((a,b)=>a.order-b.order); }
  replaceTasks(tasks){ this.state={...this.state,tasks:tasks.map((t,i)=>({...t,order:i}))}; saveState(this.state); this.listeners.forEach(fn=>fn(this.tasks)); }
  subscribe(fn){this.listeners.add(fn); fn(this.tasks); return ()=>this.listeners.delete(fn)}
}