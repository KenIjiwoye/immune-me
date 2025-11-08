export interface MutationCommand {
  do(): Promise<any>;
  undo(result: any): Promise<void>;
}

export class UndoRedoManager {
  private undoStack: { command: MutationCommand; result: any }[] = [];
  private redoStack: { command: MutationCommand; result: any }[] = [];
  private maxHistory = 50;

  async execute(command: MutationCommand) {
    const result = await command.do();
    this.undoStack.push({ command, result });
    this.redoStack = [];
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
  }

  async undo() {
    const entry = this.undoStack.pop();
    if (entry) {
      await entry.command.undo(entry.result);
      this.redoStack.push(entry);
    }
  }

  async redo() {
    const entry = this.redoStack.pop();
    if (entry) {
      const result = await entry.command.do();
      this.undoStack.push({ command: entry.command, result });
    }
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}

export const undoRedoManager = new UndoRedoManager();