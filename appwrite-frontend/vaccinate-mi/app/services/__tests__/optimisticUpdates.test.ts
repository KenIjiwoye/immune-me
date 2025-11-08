/**
 * Tests for Optimistic Updates Service
 */
import { useOptimisticCreate, useOptimisticUpdate, useOptimisticDelete, ConflictResolver, DataRecovery, ValidationErrorHandler } from '../optimisticUpdates';
import { DatabaseService } from '../appwriteDatabase';

// Mock React Query
jest.mock('@tanstack/react-query', () => ({
  useMutation: jest.fn(),
  useQueryClient: jest.fn(() => ({
    cancelQueries: jest.fn(),
    getQueryData: jest.fn(),
    setQueryData: jest.fn(),
    invalidateQueries: jest.fn(),
  })),
}));

// Mock DatabaseService
jest.mock('../appwriteDatabase', () => ({
  DatabaseService: jest.fn().mockImplementation(() => ({
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  })),
}));

// Mock error logging
jest.mock('../../utils/appwriteErrors', () => ({
  logAppwriteError: jest.fn(),
}));

describe('Optimistic Updates Service', () => {
  let mockService: DatabaseService<any>;
  let mockQueryClient: any;

  beforeEach(() => {
    mockService = new DatabaseService('test-collection');
    mockQueryClient = {
      cancelQueries: jest.fn(),
      getQueryData: jest.fn(),
      setQueryData: jest.fn(),
      invalidateQueries: jest.fn(),
    };
  });

  describe('ConflictResolver', () => {
    it('should resolve conflicts with client-wins strategy', async () => {
      const resolver = new ConflictResolver(mockService);
      const localData = { $id: '1', name: 'Local Name' };
      const serverData = { $id: '1', name: 'Server Name' };

      const result = await resolver.resolveConflict(localData, serverData, 'client-wins');

      expect(result).toEqual(localData);
    });

    it('should resolve conflicts with server-wins strategy', async () => {
      const resolver = new ConflictResolver(mockService);
      const localData = { $id: '1', name: 'Local Name' };
      const serverData = { $id: '1', name: 'Server Name' };

      const result = await resolver.resolveConflict(localData, serverData, 'server-wins');

      expect(result).toEqual(serverData);
    });

    it('should merge data correctly', async () => {
      const resolver = new ConflictResolver(mockService);
      const localData = { $id: '1', name: 'Local Name', localField: 'local' };
      const serverData = { $id: '1', name: 'Server Name', serverField: 'server' };

      const result = await resolver.resolveConflict(localData, serverData, 'merge');

      expect(result.name).toBe('Server Name'); // Server wins on conflicts
      expect(result.localField).toBe('local'); // Local value preserved
      expect(result.serverField).toBe('server'); // Server value preserved
    });

    it('should detect version conflicts', () => {
      const resolver = new ConflictResolver(mockService, { versionField: 'version' });
      const localData = { $id: '1', version: 1 };
      const serverData = { $id: '1', version: 2 };

      const hasConflict = resolver.hasVersionConflict(localData, serverData);

      expect(hasConflict).toBe(true);
    });

    it('should detect timestamp conflicts', () => {
      const resolver = new ConflictResolver(mockService, { lastModifiedField: 'updatedAt' });
      const localData = { $id: '1', updatedAt: '2023-01-01T00:00:00Z' };
      const serverData = { $id: '1', updatedAt: '2023-01-02T00:00:00Z' };

      const hasConflict = resolver.hasTimestampConflict(localData, serverData);

      expect(hasConflict).toBe(true);
    });
  });

  describe('DataRecovery', () => {
    let dataRecovery: DataRecovery<any>;

    beforeEach(() => {
      dataRecovery = new DataRecovery(mockService);
    });

    it('should retry operations with exponential backoff', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ $id: '1', name: 'Success' });

      const result = await dataRecovery.retryOperation(mockOperation, 3, 100);

      expect(mockOperation).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ $id: '1', name: 'Success' });
    });

    it('should fail after max retries', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Persistent error'));

      await expect(dataRecovery.retryOperation(mockOperation, 2, 100))
        .rejects.toThrow('Persistent error');

      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should load with fallback on primary failure', async () => {
      const primaryOperation = jest.fn().mockRejectedValue(new Error('Primary failed'));
      const fallbackOperation = jest.fn().mockResolvedValue([{ $id: '1', name: 'Fallback' }]);

      const result = await dataRecovery.loadWithFallback(primaryOperation, fallbackOperation);

      expect(primaryOperation).toHaveBeenCalledTimes(1);
      expect(fallbackOperation).toHaveBeenCalledTimes(1);
      expect(result).toEqual([{ $id: '1', name: 'Fallback' }]);
    });

    it('should handle batch operations with partial failures', async () => {
      const operations = [
        jest.fn().mockResolvedValue({ $id: '1', name: 'Success 1' }),
        jest.fn().mockRejectedValue(new Error('Failed operation')),
        jest.fn().mockResolvedValue({ $id: '3', name: 'Success 2' }),
      ];

      const result = await dataRecovery.batchOperationWithRecovery(operations, true);

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].index).toBe(1);
    });
  });

  describe('ValidationErrorHandler', () => {
    it('should format Zod validation errors', () => {
      const zodError = {
        errors: [
          { path: ['name'], message: 'Name is required' },
          { path: ['email'], message: 'Invalid email format' },
        ],
      };

      const formatted = ValidationErrorHandler.formatZodErrors(zodError);

      expect(formatted).toEqual({
        name: 'Name is required',
        email: 'Invalid email format',
      });
    });

    it('should format Appwrite validation errors', () => {
      const appwriteError = {
        code: 400,
        response: { message: 'name: Name is required' },
      };

      const formatted = ValidationErrorHandler.formatAppwriteErrors(appwriteError);

      expect(formatted).toEqual({
        name: 'Name is required',
      });
    });

    it('should combine multiple error sources', () => {
      const errors1 = { name: 'Name is required' };
      const errors2 = { email: 'Invalid email' };
      const errors3 = { name: 'Name too short' }; // This should override

      const combined = ValidationErrorHandler.combineErrors(errors1, errors2, errors3);

      expect(combined).toEqual({
        name: 'Name too short',
        email: 'Invalid email',
      });
    });

    it('should identify validation errors', () => {
      expect(ValidationErrorHandler.isValidationError({ code: 400 })).toBe(true);
      expect(ValidationErrorHandler.isValidationError({ type: 'validation_error' })).toBe(true);
      expect(ValidationErrorHandler.isValidationError({ errors: [] })).toBe(true);
      expect(ValidationErrorHandler.isValidationError({ code: 500 })).toBe(false);
    });
  });
});

describe('Error Formatting Utilities', () => {
  const { errorFormatting } = require('../../schemas/validation');

  it('should format field errors for display', () => {
    const errors = {
      first_name: 'Required',
      email_address: 'Invalid format',
    };

    const formatted = errorFormatting.formatFieldErrors(errors);

    expect(formatted.first_name).toBe('First Name: Required');
    expect(formatted.email_address).toBe('Email Address: Invalid format');
  });

  it('should create user-friendly error messages', () => {
    expect(errorFormatting.createUserMessage({ code: 401 })).toBe('Your session has expired. Please log in again.');
    expect(errorFormatting.createUserMessage({ code: 404 })).toBe('The requested item was not found.');
    expect(errorFormatting.createUserMessage({ name: 'NetworkError' })).toBe('Network connection error. Please check your internet connection and try again.');
  });

  it('should group errors by severity', () => {
    const errors = {
      name: 'Name is required',
      email: 'Invalid email format',
      age: 'Must be at least 18',
    };

    const grouped = errorFormatting.groupErrorsBySeverity(errors);

    expect(grouped.critical).toHaveProperty('name');
    expect(grouped.critical).toHaveProperty('age');
    expect(grouped.warning).toHaveProperty('email');
  });

  it('should create error summaries', () => {
    const singleError = { name: 'Required' };
    const multipleErrors = { name: 'Required', email: 'Invalid', age: 'Too young' };

    expect(errorFormatting.createErrorSummary(singleError)).toBe('Please correct the error below.');
    expect(errorFormatting.createErrorSummary(multipleErrors)).toBe('Please correct the 3 errors below, including 2 required fields.');
  });

  it('should sanitize error messages', () => {
    const sensitiveMessage = 'User email@example.com with card 1234-5678-9012-3456 was rejected';

    const sanitized = errorFormatting.sanitizeErrorMessage(sensitiveMessage);

    expect(sanitized).toContain('[EMAIL]');
    expect(sanitized).toContain('[CARD NUMBER]');
    expect(sanitized).not.toContain('email@example.com');
    expect(sanitized).not.toContain('1234-5678-9012-3456');
  });
});