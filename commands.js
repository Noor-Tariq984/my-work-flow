export class CommandManager {
  constructor(limit=20, onChange=()=>{}) { this.limit=limit; this.undoStack=[]; this.redoStack=[]; this.onChange=onChange; }
  execute(command) {
    command.execute();
    this.undoStack.push(command);
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack = [];
    this.onChange();
  }
  undo() {
    const command=this.undoStack.pop();
    if(!command) return false;
    command.undo(); this.redoStack.push(command); this.onChange(); return true;
  }
  redo() {
    const command=this.redoStack.pop();
    if(!command) return false;
    command.execute(); this.undoStack.push(command); this.onChange(); return true;
  }
}
export class StateCommand {
  constructor(app,before,after,label){this.app=app;this.before=before;this.after=after;this.label=label}
  execute(){this.app.replaceTasks(this.after)}
  undo(){this.app.replaceTasks(this.before)}
}