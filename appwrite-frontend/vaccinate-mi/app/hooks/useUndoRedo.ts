import { useState, useCallback } from 'react';
import { undoRedoManager } from '../services/undoRedoManager';

export const useUndoRedo = () => {
  const [canUndo, setCanUndo] = useState(undoRedoManager.canUndo());
  const [canRedo, setCanRedo] = useState(undoRedoManager.canRedo());

  const updateState = useCallback(() => {
    setCanUndo(undoRedoManager.canUndo());
    setCanRedo(undoRedoManager.canRedo());
  }, []);

  const undo = useCallback(async () => {
    await undoRedoManager.undo();
    updateState();
  }, [updateState]);

  const redo = useCallback(async () => {
    await undoRedoManager.redo();
    updateState();
  }, [updateState]);

  return {
    canUndo,
    canRedo,
    undo,
    redo,
  };
};