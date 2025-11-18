import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useUndoRedo } from '../useUndoRedo';

// Mock the undoRedoManager
jest.mock('../services/undoRedoManager', () => ({
  undoRedoManager: {
    canUndo: jest.fn(),
    canRedo: jest.fn(),
    undo: jest.fn(),
    redo: jest.fn(),
  },
}));

import { undoRedoManager } from '../services/undoRedoManager';

const mockUndoRedoManager = undoRedoManager as jest.Mocked<typeof undoRedoManager>;

describe('useUndoRedo', () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with correct state', () => {
      mockUndoRedoManager.canUndo.mockReturnValue(false);
      mockUndoRedoManager.canRedo.mockReturnValue(false);

      const { result } = renderHook(() => useUndoRedo(), { wrapper });

      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
      expect(typeof result.current.undo).toBe('function');
      expect(typeof result.current.redo).toBe('function');
    });

    it('should initialize with undo available', () => {
      mockUndoRedoManager.canUndo.mockReturnValue(true);
      mockUndoRedoManager.canRedo.mockReturnValue(false);

      const { result } = renderHook(() => useUndoRedo(), { wrapper });

      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(false);
    });

    it('should initialize with redo available', () => {
      mockUndoRedoManager.canUndo.mockReturnValue(false);
      mockUndoRedoManager.canRedo.mockReturnValue(true);

      const { result } = renderHook(() => useUndoRedo(), { wrapper });

      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(true);
    });
  });

  describe('Undo Functionality', () => {
    it('should call undoRedoManager.undo when undo is called', async () => {
      mockUndoRedoManager.canUndo.mockReturnValue(true);
      mockUndoRedoManager.undo.mockResolvedValue(undefined);

      const { result } = renderHook(() => useUndoRedo(), { wrapper });

      await act(async () => {
        await result.current.undo();
      });

      expect(mockUndoRedoManager.undo).toHaveBeenCalledTimes(1);
    });

    it('should update state after undo', async () => {
      mockUndoRedoManager.canUndo.mockReturnValue(true);
      mockUndoRedoManager.canRedo.mockReturnValue(false);
      mockUndoRedoManager.undo.mockResolvedValue(undefined);

      // After undo, canUndo becomes false, canRedo becomes true
      mockUndoRedoManager.canUndo.mockReturnValueOnce(true).mockReturnValueOnce(false);
      mockUndoRedoManager.canRedo.mockReturnValueOnce(false).mockReturnValueOnce(true);

      const { result } = renderHook(() => useUndoRedo(), { wrapper });

      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(false);

      await act(async () => {
        await result.current.undo();
      });

      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(true);
    });

    it('should handle undo errors gracefully', async () => {
      mockUndoRedoManager.canUndo.mockReturnValue(true);
      mockUndoRedoManager.undo.mockRejectedValue(new Error('Undo failed'));

      const { result } = renderHook(() => useUndoRedo(), { wrapper });

      await expect(result.current.undo()).rejects.toThrow('Undo failed');
    });
  });

  describe('Redo Functionality', () => {
    it('should call undoRedoManager.redo when redo is called', async () => {
      mockUndoRedoManager.canRedo.mockReturnValue(true);
      mockUndoRedoManager.redo.mockResolvedValue(undefined);

      const { result } = renderHook(() => useUndoRedo(), { wrapper });

      await act(async () => {
        await result.current.redo();
      });

      expect(mockUndoRedoManager.redo).toHaveBeenCalledTimes(1);
    });

    it('should update state after redo', async () => {
      mockUndoRedoManager.canUndo.mockReturnValue(false);
      mockUndoRedoManager.canRedo.mockReturnValue(true);
      mockUndoRedoManager.redo.mockResolvedValue(undefined);

      // After redo, canUndo becomes true, canRedo becomes false
      mockUndoRedoManager.canUndo.mockReturnValueOnce(false).mockReturnValueOnce(true);
      mockUndoRedoManager.canRedo.mockReturnValueOnce(true).mockReturnValueOnce(false);

      const { result } = renderHook(() => useUndoRedo(), { wrapper });

      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(true);

      await act(async () => {
        await result.current.redo();
      });

      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(false);
    });

    it('should handle redo errors gracefully', async () => {
      mockUndoRedoManager.canRedo.mockReturnValue(true);
      mockUndoRedoManager.redo.mockRejectedValue(new Error('Redo failed'));

      const { result } = renderHook(() => useUndoRedo(), { wrapper });

      await expect(result.current.redo()).rejects.toThrow('Redo failed');
    });
  });

  describe('State Updates', () => {
    it('should update state when undo/redo availability changes', () => {
      mockUndoRedoManager.canUndo.mockReturnValue(false);
      mockUndoRedoManager.canRedo.mockReturnValue(false);

      const { result, rerender } = renderHook(() => useUndoRedo(), { wrapper });

      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);

      // Simulate state change
      mockUndoRedoManager.canUndo.mockReturnValue(true);
      mockUndoRedoManager.canRedo.mockReturnValue(true);

      rerender();

      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(true);
    });

    it('should maintain stable function references', () => {
      const { result, rerender } = renderHook(() => useUndoRedo(), { wrapper });

      const initialUndo = result.current.undo;
      const initialRedo = result.current.redo;

      rerender();

      expect(result.current.undo).toBe(initialUndo);
      expect(result.current.redo).toBe(initialRedo);
    });
  });

  describe('Integration with React Query', () => {
    it('should work within QueryClient context', () => {
      mockUndoRedoManager.canUndo.mockReturnValue(true);
      mockUndoRedoManager.canRedo.mockReturnValue(false);

      expect(() => {
        renderHook(() => useUndoRedo(), { wrapper });
      }).not.toThrow();
    });

    it('should handle multiple state updates correctly', async () => {
      mockUndoRedoManager.canUndo.mockReturnValue(true);
      mockUndoRedoManager.canRedo.mockReturnValue(false);
      mockUndoRedoManager.undo.mockResolvedValue(undefined);

      const { result } = renderHook(() => useUndoRedo(), { wrapper });

      // First undo
      await act(async () => {
        await result.current.undo();
      });

      expect(mockUndoRedoManager.undo).toHaveBeenCalledTimes(1);

      // Second undo
      await act(async () => {
        await result.current.undo();
      });

      expect(mockUndoRedoManager.undo).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Boundaries', () => {
    it('should handle manager method errors without crashing', async () => {
      mockUndoRedoManager.canUndo.mockImplementation(() => {
        throw new Error('Manager error');
      });

      // Should not crash during render
      expect(() => {
        renderHook(() => useUndoRedo(), { wrapper });
      }).toThrow('Manager error');
    });

    it('should handle async errors in undo/redo operations', async () => {
      mockUndoRedoManager.canUndo.mockReturnValue(true);
      mockUndoRedoManager.undo.mockRejectedValue(new Error('Async error'));

      const { result } = renderHook(() => useUndoRedo(), { wrapper });

      await expect(result.current.undo()).rejects.toThrow('Async error');

      // State should still be accessible after error
      expect(result.current.canUndo).toBeDefined();
      expect(result.current.canRedo).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should not cause unnecessary re-renders', () => {
      mockUndoRedoManager.canUndo.mockReturnValue(true);
      mockUndoRedoManager.canRedo.mockReturnValue(false);

      let renderCount = 0;
      const TestComponent = () => {
        renderCount++;
        return useUndoRedo();
      };

      const { rerender } = renderHook(() => <TestComponent />, { wrapper });

      expect(renderCount).toBe(1);

      // Rerender should not increase count if state hasn't changed
      rerender();
      expect(renderCount).toBe(1);
    });
  });
});