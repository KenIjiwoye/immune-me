import { UndoRedoManager, MutationCommand } from '../undoRedoManager';

describe('UndoRedoManager', () => {
  let manager: UndoRedoManager;

  beforeEach(() => {
    manager = new UndoRedoManager();
  });

  describe('execute', () => {
    it('should execute a command and add it to undo stack', async () => {
      const command: MutationCommand = {
        do: jest.fn().mockResolvedValue({ $id: 'test-1', result: 'created' }),
        undo: jest.fn().mockResolvedValue(undefined),
      };

      const result = await manager.execute(command);

      expect(command.do).toHaveBeenCalled();
      expect(result).toEqual({ $id: 'test-1', result: 'created' });
      expect(manager.canUndo()).toBe(true);
      expect(manager.canRedo()).toBe(false);
    });

    it('should clear redo stack when executing new command', async () => {
      // Execute first command
      const command1: MutationCommand = {
        do: jest.fn().mockResolvedValue('result1'),
        undo: jest.fn().mockResolvedValue(undefined),
      };

      await manager.execute(command1);

      // Undo it (adds to redo stack)
      await manager.undo();
      expect(manager.canRedo()).toBe(true);

      // Execute second command (should clear redo stack)
      const command2: MutationCommand = {
        do: jest.fn().mockResolvedValue('result2'),
        undo: jest.fn().mockResolvedValue(undefined),
      };

      await manager.execute(command2);

      expect(manager.canRedo()).toBe(false);
      expect(manager.canUndo()).toBe(true);
    });

    it('should limit undo stack size', async () => {
      // Set max history to 3 for testing
      (manager as any).maxHistory = 3;

      const commands: MutationCommand[] = [];

      // Execute 5 commands
      for (let i = 0; i < 5; i++) {
        const command: MutationCommand = {
          do: jest.fn().mockResolvedValue(`result${i}`),
          undo: jest.fn().mockResolvedValue(undefined),
        };
        commands.push(command);
        await manager.execute(command);
      }

      // Should only be able to undo 3 times (maxHistory)
      expect(manager.canUndo()).toBe(true);
      await manager.undo(); // 1
      await manager.undo(); // 2
      await manager.undo(); // 3
      expect(manager.canUndo()).toBe(false); // No more undo available
    });
  });

  describe('undo', () => {
    it('should undo the last executed command', async () => {
      const command: MutationCommand = {
        do: jest.fn().mockResolvedValue({ $id: 'test-1' }),
        undo: jest.fn().mockResolvedValue(undefined),
      };

      await manager.execute(command);

      expect(manager.canUndo()).toBe(true);

      await manager.undo();

      expect(command.undo).toHaveBeenCalledWith({ $id: 'test-1' });
      expect(manager.canUndo()).toBe(false);
      expect(manager.canRedo()).toBe(true);
    });

    it('should do nothing if no commands to undo', async () => {
      expect(manager.canUndo()).toBe(false);

      await manager.undo();

      // Should not throw or cause issues
      expect(manager.canUndo()).toBe(false);
    });

    it('should handle undo errors gracefully', async () => {
      const command: MutationCommand = {
        do: jest.fn().mockResolvedValue('result'),
        undo: jest.fn().mockRejectedValue(new Error('Undo failed')),
      };

      await manager.execute(command);

      await expect(manager.undo()).rejects.toThrow('Undo failed');

      // Should still be able to redo after failed undo
      expect(manager.canRedo()).toBe(true);
    });
  });

  describe('redo', () => {
    it('should redo the last undone command', async () => {
      const command: MutationCommand = {
        do: jest.fn().mockResolvedValue('original-result'),
        undo: jest.fn().mockResolvedValue(undefined),
      };

      await manager.execute(command);
      await manager.undo();

      expect(manager.canRedo()).toBe(true);

      // Mock do to return different result on redo
      command.do.mockResolvedValue('redone-result');

      const redoResult = await manager.redo();

      expect(command.do).toHaveBeenCalledTimes(2); // Once for execute, once for redo
      expect(redoResult).toBe('redone-result');
      expect(manager.canRedo()).toBe(false);
      expect(manager.canUndo()).toBe(true);
    });

    it('should do nothing if no commands to redo', async () => {
      expect(manager.canRedo()).toBe(false);

      await manager.redo();

      // Should not throw or cause issues
      expect(manager.canRedo()).toBe(false);
    });

    it('should handle redo errors gracefully', async () => {
      const command: MutationCommand = {
        do: jest.fn().mockResolvedValueOnce('result').mockRejectedValueOnce(new Error('Redo failed')),
        undo: jest.fn().mockResolvedValue(undefined),
      };

      await manager.execute(command);
      await manager.undo();

      await expect(manager.redo()).rejects.toThrow('Redo failed');

      // Should still be able to undo after failed redo
      expect(manager.canUndo()).toBe(true);
    });
  });

  describe('canUndo', () => {
    it('should return true when undo stack has items', async () => {
      expect(manager.canUndo()).toBe(false);

      const command: MutationCommand = {
        do: jest.fn().mockResolvedValue('result'),
        undo: jest.fn().mockResolvedValue(undefined),
      };

      await manager.execute(command);

      expect(manager.canUndo()).toBe(true);
    });

    it('should return false when undo stack is empty', () => {
      expect(manager.canUndo()).toBe(false);
    });
  });

  describe('canRedo', () => {
    it('should return true when redo stack has items', async () => {
      const command: MutationCommand = {
        do: jest.fn().mockResolvedValue('result'),
        undo: jest.fn().mockResolvedValue(undefined),
      };

      await manager.execute(command);
      await manager.undo();

      expect(manager.canRedo()).toBe(true);
    });

    it('should return false when redo stack is empty', () => {
      expect(manager.canRedo()).toBe(false);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle multiple undo/redo cycles correctly', async () => {
      const commands: MutationCommand[] = [
        {
          do: jest.fn().mockResolvedValue('result1'),
          undo: jest.fn().mockResolvedValue(undefined),
        },
        {
          do: jest.fn().mockResolvedValue('result2'),
          undo: jest.fn().mockResolvedValue(undefined),
        },
        {
          do: jest.fn().mockResolvedValue('result3'),
          undo: jest.fn().mockResolvedValue(undefined),
        },
      ];

      // Execute all commands
      await manager.execute(commands[0]);
      await manager.execute(commands[1]);
      await manager.execute(commands[2]);

      expect(manager.canUndo()).toBe(true);
      expect(manager.canRedo()).toBe(false);

      // Undo twice
      await manager.undo();
      await manager.undo();

      expect(manager.canUndo()).toBe(true); // Can still undo one more
      expect(manager.canRedo()).toBe(true); // Can redo two

      // Redo once
      await manager.redo();

      expect(manager.canUndo()).toBe(true); // Can undo two
      expect(manager.canRedo()).toBe(true); // Can redo one

      // Execute new command (should clear redo stack)
      const newCommand: MutationCommand = {
        do: jest.fn().mockResolvedValue('result4'),
        undo: jest.fn().mockResolvedValue(undefined),
      };

      await manager.execute(newCommand);

      expect(manager.canUndo()).toBe(true);
      expect(manager.canRedo()).toBe(false); // Redo stack cleared
    });

    it('should maintain correct order of operations', async () => {
      const executionOrder: string[] = [];

      const command1: MutationCommand = {
        do: jest.fn().mockImplementation(() => {
          executionOrder.push('do1');
          return Promise.resolve('result1');
        }),
        undo: jest.fn().mockImplementation(() => {
          executionOrder.push('undo1');
          return Promise.resolve(undefined);
        }),
      };

      const command2: MutationCommand = {
        do: jest.fn().mockImplementation(() => {
          executionOrder.push('do2');
          return Promise.resolve('result2');
        }),
        undo: jest.fn().mockImplementation(() => {
          executionOrder.push('undo2');
          return Promise.resolve(undefined);
        }),
      };

      // Execute commands
      await manager.execute(command1);
      await manager.execute(command2);

      expect(executionOrder).toEqual(['do1', 'do2']);

      // Undo commands (should be in reverse order)
      await manager.undo();
      await manager.undo();

      expect(executionOrder).toEqual(['do1', 'do2', 'undo2', 'undo1']);

      // Redo commands (should be in original order)
      await manager.redo();
      await manager.redo();

      expect(executionOrder).toEqual(['do1', 'do2', 'undo2', 'undo1', 'do2', 'do1']);
    });
  });

  describe('Error Handling', () => {
    it('should handle command execution errors', async () => {
      const command: MutationCommand = {
        do: jest.fn().mockRejectedValue(new Error('Execution failed')),
        undo: jest.fn().mockResolvedValue(undefined),
      };

      await expect(manager.execute(command)).rejects.toThrow('Execution failed');

      // Should not add failed command to undo stack
      expect(manager.canUndo()).toBe(false);
    });

    it('should handle async command operations', async () => {
      const command: MutationCommand = {
        do: jest.fn().mockImplementation(() => {
          return new Promise(resolve => setTimeout(() => resolve('async-result'), 10));
        }),
        undo: jest.fn().mockImplementation(() => {
          return new Promise(resolve => setTimeout(() => resolve(undefined), 10));
        }),
      };

      const result = await manager.execute(command);
      expect(result).toBe('async-result');

      await manager.undo();
      expect(command.undo).toHaveBeenCalledWith('async-result');
    });

    it('should handle commands that return undefined', async () => {
      const command: MutationCommand = {
        do: jest.fn().mockResolvedValue(undefined),
        undo: jest.fn().mockResolvedValue(undefined),
      };

      const result = await manager.execute(command);
      expect(result).toBeUndefined();

      await manager.undo();
      expect(command.undo).toHaveBeenCalledWith(undefined);
    });
  });

  describe('Memory Management', () => {
    it('should properly manage stack sizes', async () => {
      const commands: MutationCommand[] = [];

      // Create 10 commands
      for (let i = 0; i < 10; i++) {
        commands.push({
          do: jest.fn().mockResolvedValue(`result${i}`),
          undo: jest.fn().mockResolvedValue(undefined),
        });
      }

      // Execute all commands
      for (const command of commands) {
        await manager.execute(command);
      }

      // Undo all
      for (let i = 0; i < 10; i++) {
        expect(manager.canUndo()).toBe(true);
        await manager.undo();
      }

      expect(manager.canUndo()).toBe(false);

      // Redo all
      for (let i = 0; i < 10; i++) {
        expect(manager.canRedo()).toBe(true);
        await manager.redo();
      }

      expect(manager.canRedo()).toBe(false);
      expect(manager.canUndo()).toBe(true);
    });
  });
});