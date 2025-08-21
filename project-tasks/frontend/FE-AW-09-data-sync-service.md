# FE-AW-09: Create Data Synchronization Service Between Local and Appwrite

## Title
Create Data Synchronization Service Between Local and Appwrite

## Priority
High

## Estimated Time
8-10 hours

## Dependencies
- FE-AW-07: Appwrite SDK configuration completed
- FE-AW-08: Local SQLite database implemented
- BE-AW-02: Database collections created in Appwrite

## Description
Implement a comprehensive data synchronization service that manages bidirectional data flow between the local SQLite database and Appwrite cloud database. This service will handle optimistic updates, conflict resolution, batch synchronization, and maintain data consistency across offline and online states.

The synchronization service is critical for the offline-first architecture, ensuring users can work seamlessly regardless of network connectivity while maintaining data integrity and providing conflict resolution mechanisms when the same data is modified in multiple places.

## Acceptance Criteria
- [ ] Bidirectional sync service implemented (local ↔ Appwrite)
- [ ] Optimistic updates with local-first approach
- [ ] Conflict detection and resolution strategies
- [ ] Batch synchronization for performance
- [ ] Incremental sync based on timestamps/versions
- [ ] Sync queue management with retry logic
- [ ] Network state awareness and automatic sync triggers
- [ ] Data transformation between local and Appwrite formats
- [ ] Sync status tracking and progress reporting
- [ ] Error handling and recovery mechanisms
- [ ] Background sync capabilities
- [ ] Manual sync triggers for user control
- [ ] Comprehensive logging and debugging tools

## Technical Implementation

### Core Sync Service Architecture
```typescript
// frontend/services/sync/SyncService.ts
import { appwriteClient } from '../../config/appwrite';
import { databaseManager } from '../../database/config';
import { BaseRepository } from '../../database/repository/BaseRepository';
import { useAppwriteConnection } from '../../hooks/useAppwriteConnection';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SyncConfig {
  batchSize: number;
  maxRetries: number;
  retryDelay: number;
  syncInterval: number;
  conflictResolution: 'local' | 'remote' | 'manual' | 'timestamp';
}

export interface SyncStatus {
  isRunning: boolean;
  lastSync: Date | null;
  pendingOperations: number;
  failedOperations: number;
  conflictsCount: number;
  progress: {
    current: number;
    total: number;
    stage: 'idle' | 'uploading' | 'downloading' | 'resolving_conflicts';
  };
}

export interface SyncOperation {
  id: string;
  tableName: string;
  recordId: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  priority: number;
  retryCount: number;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConflictResolution {
  id: string;
  tableName: string;
  recordId: string;
  localData: any;
  remoteData: any;
  conflictType: 'update_conflict' | 'delete_conflict' | 'create_conflict';
  resolution?: 'local' | 'remote' | 'merge';
  resolvedAt?: Date;
  resolvedBy?: string;
}

class SyncService {
  private config: SyncConfig;
  private status: SyncStatus;
  private syncInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private statusListeners: ((status: SyncStatus) => void)[] = [];
  private repositories: Map<string, BaseRepository<any>> = new Map();

  constructor() {
    this.config = {
      batchSize: 50,
      maxRetries: 3,
      retryDelay: 5000,
      syncInterval: 30000, // 30 seconds
      conflictResolution: 'timestamp'
    };

    this.status = {
      isRunning: false,
      lastSync: null,
      pendingOperations: 0,
      failedOperations: 0,
      conflictsCount: 0,
      progress: {
        current: 0,
        total: 0,
        stage: 'idle'
      }
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load last sync status
      await this.loadSyncStatus();
      
      // Set up network monitoring
      this.setupNetworkMonitoring();
      
      // Start automatic sync if online
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected) {
        this.startAutoSync();
      }

      this.isInitialized = true;
      console.log('Sync service initialized');
    } catch (error) {
      console.error('Failed to initialize sync service:', error);
      throw error;
    }
  }

  registerRepository(tableName: string, repository: BaseRepository<any>): void {
    this.repositories.set(tableName, repository);
  }

  private setupNetworkMonitoring(): void {
    NetInfo.addEventListener(state => {
      if (state.isConnected && !this.status.isRunning) {
        console.log('Network connected, starting sync...');
        this.triggerSync();
      } else if (!state.isConnected) {
        console.log('Network disconnected, stopping auto sync');
        this.stopAutoSync();
      }
    });
  }

  private startAutoSync(): void {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(() => {
      this.triggerSync();
    }, this.config.syncInterval);
  }

  private stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async triggerSync(force = false): Promise<void> {
    if (this.status.isRunning && !force) {
      console.log('Sync already running, skipping...');
      return;
    }

    try {
      await this.performSync();
    } catch (error) {
      console.error('Sync failed:', error);
      this.updateStatus({ isRunning: false });
    }
  }

  private async performSync(): Promise<void> {
    console.log('Starting sync process...');
    this.updateStatus({ 
      isRunning: true,
      progress: { current: 0, total: 0, stage: 'uploading' }
    });

    try {
      // Phase 1: Upload local changes to Appwrite
      await this.uploadLocalChanges();

      // Phase 2: Download remote changes from Appwrite
      this.updateStatus({ 
        progress: { ...this.status.progress, stage: 'downloading' }
      });
      await this.downloadRemoteChanges();

      // Phase 3: Resolve conflicts
      this.updateStatus({ 
        progress: { ...this.status.progress, stage: 'resolving_conflicts' }
      });
      await this.resolveConflicts();

      // Update sync status
      this.updateStatus({
        isRunning: false,
        lastSync: new Date(),
        progress: { current: 0, total: 0, stage: 'idle' }
      });

      await this.saveSyncStatus();
      console.log('Sync completed successfully');

    } catch (error) {
      console.error('Sync process failed:', error);
      this.updateStatus({ isRunning: false });
      throw error;
    }
  }

  private async uploadLocalChanges(): Promise<void> {
    const db = await databaseManager.getDatabase();
    
    // Get pending sync operations
    const results = await db.getAllAsync(`
      SELECT * FROM sync_queue 
      WHERE retry_count < max_retries 
      ORDER BY priority DESC, created_at ASC 
      LIMIT ?
    `, [this.config.batchSize]);

    const operations: SyncOperation[] = results.map(row => ({
      id: row.id,
      tableName: row.table_name,
      recordId: row.record_id,
      operation: row.operation,
      data: JSON.parse(row.data || '{}'),
      priority: row.priority,
      retryCount: row.retry_count,
      lastError: row.last_error,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));

    this.updateStatus({
      pendingOperations: operations.length,
      progress: { ...this.status.progress, total: operations.length }
    });

    // Process operations in batches
    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      
      try {
        await this.processUploadOperation(operation);
        await this.removeSyncOperation(operation.id);
        
        this.updateStatus({
          progress: { ...this.status.progress, current: i + 1 }
        });
        
      } catch (error) {
        console.error(`Failed to upload operation ${operation.id}:`, error);
        await this.updateSyncOperationError(operation.id, error.message);
        
        this.updateStatus({
          failedOperations: this.status.failedOperations + 1
        });
      }
    }
  }

  private async processUploadOperation(operation: SyncOperation): Promise<void> {
    const { tableName, recordId, operation: op, data } = operation;
    
    try {
      switch (op) {
        case 'create':
          await this.uploadCreate(tableName, recordId, data);
          break;
        case 'update':
          await this.uploadUpdate(tableName, recordId, data);
          break;
        case 'delete':
          await this.uploadDelete(tableName, recordId);
          break;
      }
    } catch (error) {
      // Check if it's a conflict error
      if (this.isConflictError(error)) {
        await this.handleUploadConflict(operation, error);
      } else {
        throw error;
      }
    }
  }

  private async uploadCreate(tableName: string, recordId: string, data: any): Promise<void> {
    const appwriteData = this.transformToAppwriteFormat(tableName, data);
    
    const response = await appwriteClient.databases.createDocument(
      appwriteClient.getConfig().databaseId,
      tableName,
      recordId,
      appwriteData
    );

    // Mark local record as synced
    const repository = this.repositories.get(tableName);
    if (repository) {
      await repository.markAsSynced(recordId, response.$id);
    }
  }

  private async uploadUpdate(tableName: string, recordId: string, data: any): Promise<void> {
    const repository = this.repositories.get(tableName);
    if (!repository) throw new Error(`Repository not found for table: ${tableName}`);

    const localRecord = await repository.findById(recordId);
    if (!localRecord || !localRecord.appwriteId) {
      throw new Error(`Local record not found or missing Appwrite ID: ${recordId}`);
    }

    const appwriteData = this.transformToAppwriteFormat(tableName, data);
    
    await appwriteClient.databases.updateDocument(
      appwriteClient.getConfig().databaseId,
      tableName,
      localRecord.appwriteId,
      appwriteData
    );

    // Mark local record as synced
    await repository.markAsSynced(recordId);
  }

  private async uploadDelete(tableName: string, recordId: string): Promise<void> {
    const repository = this.repositories.get(tableName);
    if (!repository) throw new Error(`Repository not found for table: ${tableName}`);

    const localRecord = await repository.findById(recordId);
    if (localRecord?.appwriteId) {
      await appwriteClient.databases.deleteDocument(
        appwriteClient.getConfig().databaseId,
        tableName,
        localRecord.appwriteId
      );
    }

    // Hard delete local record
    await repository.hardDelete(recordId);
  }

  private async downloadRemoteChanges(): Promise<void> {
    const lastSync = this.status.lastSync;
    const tables = Array.from(this.repositories.keys());

    for (const tableName of tables) {
      try {
        await this.downloadTableChanges(tableName, lastSync);
      } catch (error) {
        console.error(`Failed to download changes for table ${tableName}:`, error);
      }
    }
  }

  private async downloadTableChanges(tableName: string, lastSync: Date | null): Promise<void> {
    const repository = this.repositories.get(tableName);
    if (!repository) return;

    let queries = [];
    if (lastSync) {
      queries.push(`updatedAt>${lastSync.toISOString()}`);
    }

    const response = await appwriteClient.databases.listDocuments(
      appwriteClient.getConfig().databaseId,
      tableName,
      queries
    );

    for (const remoteDoc of response.documents) {
      try {
        await this.processRemoteDocument(tableName, remoteDoc, repository);
      } catch (error) {
        console.error(`Failed to process remote document ${remoteDoc.$id}:`, error);
      }
    }
  }

  private async processRemoteDocument(
    tableName: string, 
    remoteDoc: any, 
    repository: BaseRepository<any>
  ): Promise<void> {
    // Find local record by Appwrite ID
    const db = await databaseManager.getDatabase();
    const localRecord = await db.getFirstAsync(
      `SELECT * FROM ${tableName} WHERE appwrite_id = ?`,
      [remoteDoc.$id]
    );

    if (!localRecord) {
      // New remote record - create locally
      await this.createLocalFromRemote(tableName, remoteDoc, repository);
    } else {
      // Check for conflicts
      const localData = repository.mapRowToEntity ? repository.mapRowToEntity(localRecord) : localRecord;
      
      if (this.hasConflict(localData, remoteDoc)) {
        await this.handleDownloadConflict(tableName, localData, remoteDoc);
      } else {
        // No conflict - update local record
        await this.updateLocalFromRemote(tableName, remoteDoc, repository);
      }
    }
  }

  private async createLocalFromRemote(
    tableName: string, 
    remoteDoc: any, 
    repository: BaseRepository<any>
  ): Promise<void> {
    const localData = this.transformFromAppwriteFormat(tableName, remoteDoc);
    
    // Create without triggering sync
    const db = await databaseManager.getDatabase();
    const columns = Object.keys(localData).join(', ');
    const placeholders = Object.keys(localData).map(() => '?').join(', ');
    const values = Object.values(localData);

    await db.runAsync(
      `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`,
      values
    );
  }

  private async updateLocalFromRemote(
    tableName: string, 
    remoteDoc: any, 
    repository: BaseRepository<any>
  ): Promise<void> {
    const localData = this.transformFromAppwriteFormat(tableName, remoteDoc);
    
    // Update without triggering sync
    const db = await databaseManager.getDatabase();
    const setClause = Object.keys(localData)
      .filter(key => key !== 'id')
      .map(key => `${key} = ?`)
      .join(', ');
    const values = Object.entries(localData)
      .filter(([key]) => key !== 'id')
      .map(([, value]) => value);
    
    values.push(localData.id);
    
    await db.runAsync(
      `UPDATE ${tableName} SET ${setClause}, is_dirty = 0 WHERE id = ?`,
      values
    );
  }

  private transformToAppwriteFormat(tableName: string, data: any): any {
    // Transform local data format to Appwrite format
    const transformed = { ...data };
    
    // Remove sync metadata
    delete transformed.lastModified;
    delete transformed.version;
    delete transformed.isDeleted;
    delete transformed.isDirty;
    delete transformed.appwriteId;
    delete transformed.conflictResolution;
    delete transformed.createdAt;
    delete transformed.updatedAt;
    
    // Transform field names (snake_case to camelCase)
    const fieldMappings = this.getFieldMappings(tableName);
    const result: any = {};
    
    Object.entries(transformed).forEach(([key, value]) => {
      const appwriteKey = fieldMappings[key] || key;
      result[appwriteKey] = value;
    });
    
    return result;
  }

  private transformFromAppwriteFormat(tableName: string, data: any): any {
    // Transform Appwrite data format to local format
    const fieldMappings = this.getFieldMappings(tableName);
    const reverseMapping: Record<string, string> = {};
    
    Object.entries(fieldMappings).forEach(([local, appwrite]) => {
      reverseMapping[appwrite] = local;
    });
    
    const result: any = {
      id: data.$id,
      appwriteId: data.$id,
      lastModified: new Date(data.$updatedAt).getTime(),
      version: 1,
      isDeleted: false,
      isDirty: false,
      createdAt: new Date(data.$createdAt).getTime(),
      updatedAt: new Date(data.$updatedAt).getTime()
    };
    
    Object.entries(data).forEach(([key, value]) => {
      if (!key.startsWith('$')) {
        const localKey = reverseMapping[key] || key;
        result[localKey] = value;
      }
    });
    
    return result;
  }

  private getFieldMappings(tableName: string): Record<string, string> {
    // Define field mappings between local (snake_case) and Appwrite (camelCase)
    const mappings: Record<string, Record<string, string>> = {
      patients: {
        full_name: 'fullName',
        date_of_birth: 'dateOfBirth',
        mother_name: 'motherName',
        father_name: 'fatherName',
        town_village: 'townVillage',
        contact_phone: 'contactPhone',
        health_worker_id: 'healthWorkerId',
        health_worker_name: 'healthWorkerName',
        health_worker_phone: 'healthWorkerPhone',
        health_worker_address: 'healthWorkerAddress',
        facility_id: 'facilityId'
      },
      immunization_records: {
        patient_id: 'patientId',
        vaccine_id: 'vaccineId',
        facility_id: 'facilityId',
        administered_by: 'administeredBy',
        date_administered: 'dateAdministered',
        dose_number: 'doseNumber',
        batch_number: 'batchNumber',
        expiration_date: 'expirationDate',
        site_of_administration: 'siteOfAdministration',
        adverse_events: 'adverseEvents'
      },
      notifications: {
        patient_id: 'patientId',
        vaccine_id: 'vaccineId',
        facility_id: 'facilityId',
        due_date: 'dueDate'
      }
    };
    
    return mappings[tableName] || {};
  }

  private hasConflict(localData: any, remoteData: any): boolean {
    // Check if local record has been modified since last sync
    if (localData.isDirty) {
      const localModified = new Date(localData.lastModified);
      const remoteModified = new Date(remoteData.$updatedAt);
      
      // Conflict if both have been modified and local is dirty
      return localModified.getTime() !== remoteModified.getTime();
    }
    
    return false;
  }

  private isConflictError(error: any): boolean {
    // Check if error indicates a conflict (e.g., version mismatch, document not found)
    return error.code === 409 || error.code === 404;
  }

  private async handleUploadConflict(operation: SyncOperation, error: any): Promise<void> {
    console.log(`Upload conflict detected for ${operation.tableName}:${operation.recordId}`);
    
    // Store conflict for manual resolution
    await this.storeConflict({
      id: `${operation.tableName}-${operation.recordId}-${Date.now()}`,
      tableName: operation.tableName,
      recordId: operation.recordId,
      localData: operation.data,
      remoteData: null, // Will be fetched when resolving
      conflictType: 'update_conflict'
    });
    
    this.updateStatus({
      conflictsCount: this.status.conflictsCount + 1
    });
  }

  private async handleDownloadConflict(
    tableName: string, 
    localData: any, 
    remoteData: any
  ): Promise<void> {
    console.log(`Download conflict detected for ${tableName}:${localData.id}`);
    
    // Apply conflict resolution strategy
    switch (this.config.conflictResolution) {
      case 'local':
        // Keep local version, mark as dirty for next sync
        break;
      case 'remote':
        // Accept remote version
        const repository = this.repositories.get(tableName);
        if (repository) {
          await this.updateLocalFromRemote(tableName, remoteData, repository);
        }
        break;
      case 'timestamp':
        // Use most recent version
        const localTime = new Date(localData.lastModified);
        const remoteTime = new Date(remoteData.$updatedAt);
        
        if (remoteTime > localTime) {
          const repository = this.repositories.get(tableName);
          if (repository) {
            await this.updateLocalFromRemote(tableName, remoteData, repository);
          }
        }
        break;
      case 'manual':
        // Store for manual resolution
        await this.storeConflict({
          id: `${tableName}-${localData.id}-${Date.now()}`,
          tableName,
          recordId: localData.id,
          localData,
          remoteData,
          conflictType: 'update_conflict'
        });
        
        this.updateStatus({
          conflictsCount: this.status.conflictsCount + 1
        });
        break;
    }
  }

  private async storeConflict(conflict: ConflictResolution): Promise<void> {
    const db = await databaseManager.getDatabase();
    
    await db.runAsync(`
      INSERT INTO conflict_resolution 
      (id, table_name, record_id, local_data, remote_data, conflict_type, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      conflict.id,
      conflict.tableName,
      conflict.recordId,
      JSON.stringify(conflict.localData),
      JSON.stringify(conflict.remoteData),
      conflict.conflictType,
      Date.now()
    ]);
  }

  private async resolveConflicts(): Promise<void> {
    const db = await databaseManager.getDatabase();
    
    const conflicts = await db.getAllAsync(`
      SELECT * FROM conflict_resolution 
      WHERE resolved = 0 
      ORDER BY created_at ASC
    `);

    for (const conflict of conflicts) {
      try {
        await this.resolveConflict({
          id: conflict.id,
          tableName: conflict.table_name,
          recordId: conflict.record_id,
          localData: JSON.parse(conflict.local_data),
          remoteData: JSON.parse(conflict.remote_data),
          conflictType: conflict.conflict_type,
          resolution: conflict.resolution_strategy
        });
      } catch (error) {
        console.error(`Failed to resolve conflict ${conflict.id}:`, error);
      }
    }
  }

  private async resolveConflict(conflict: ConflictResolution): Promise<void> {
    if (!conflict.resolution) {
      // Auto-resolve based on strategy
      conflict.resolution = this.config.conflictResolution === 'manual' ? 'local' : this.config.conflictResolution;
    }

    const repository = this.repositories.get(conflict.tableName);
    if (!repository) return;

    switch (conflict.resolution) {
      case 'local':
        // Keep local, mark as dirty for next sync
        await repository.update(conflict.recordId, { isDirty: true });
        break;
      case 'remote':
        // Accept remote version
        await this.updateLocalFromRemote(conflict.tableName, conflict.remoteData, repository);
        break;
    }

    // Mark conflict as resolved
    const db = await databaseManager.getDatabase();
    await db.runAsync(`
      UPDATE conflict_resolution 
      SET resolved = 1, resolved_at = ?, resolution_strategy = ?
      WHERE id = ?
    `, [Date.now(), conflict.resolution, conflict.id]);

    this.updateStatus({
      conflictsCount: Math.max(0, this.status.conflictsCount - 1)
    });
  }

  private async removeSyncOperation(operationId: string): Promise<void> {
    const db = await databaseManager.getDatabase();
    await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [operationId]);
  }

  private async updateSyncOperationError(operationId: string, error: string): Promise<void> {
    const db = await databaseManager.getDatabase();
    await db.runAsync(`
      UPDATE sync_queue 
      SET retry_count = retry_count + 1, last_error = ?, updated_at = ?
      WHERE id = ?
    `, [error, Date.now(), operationId]);
  }

  private updateStatus(updates: Partial<SyncStatus>): void {
    this.status = { ...this.status, ...updates };
    this.notifyStatusListeners();
  }

  private notifyStatusListeners(): void {
    this.statusListeners.forEach(listener => {
      try {
        listener({ ...this.status });
      } catch (error) {
        console.error('Error in sync status listener:', error);
      }
    });
  }

  public onStatusChange(listener: (status: SyncStatus) => void): () => void {
    this.statusListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.statusListeners.indexOf(listener);
      if (index > -1) {
        this.statusListeners.splice(index, 1);
      }
    };
  }

  public getStatus(): SyncStatus {
    return { ...this.status };
  }

  private async loadSyncStatus(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('sync_status');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.status.lastSync = parsed.lastSync ? new Date(parsed.lastSync) : null;
      }
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  }

  private async saveSyncStatus(): Promise<void> {
    try {
      await AsyncStorage.setItem('sync_status', JSON.stringify({
        lastSync: this.status.lastSync?.toISOString()
      }));
    } catch (error) {
      console.error('Failed to save sync status:', error);
    }
  }

  public async getConflicts(): Promise<ConflictResolution[]> {
    const db = await databaseManager.getDatabase();
    const results = await db.getAllAsync(`
      SELECT * FROM conflict_resolution 
      WHERE resolved = 0 
      ORDER BY created_at DESC
    `);

    return results.map(row => ({
      id: row.id,
      tableName: row.table_name,
      recordId: row.record_id,
      localData: JSON.parse(row.local_data),
      remoteData: JSON.parse(row.remote_data),
      conflictType: row.conflict_type,
      resolution: row.resolution_strategy,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
      resolvedBy: row.resolved_by
    }));
  }

  public async resolveConflictManually(
    conflictId: string, 
    resolution: 'local' | 'remote' | 'merge',
    mergedData?: any
  ): Promise<void> {
    const db = await databaseManager.getDatabase();
    const conflict = await db.getFirstAsync(
      'SELECT * FROM conflict_resolution WHERE id = ?',
      [conflictId]
    );

    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    const conflictData: ConflictResolution = {
      id: conflict.id,
      tableName: conflict.table_name,
      recordId: conflict.record_id,
      localData: JSON.parse(conflict.local_data),
      remoteData: JSON.parse(conflict.remote_data),
      conflictType: conflict.conflict_type,
      resolution
    };

    if (resolution === 'merge' && mergedData) {
      // Apply merged data
      const repository = this.repositories.get(conflictData.tableName);
      if (repository) {
        await repository.update(conflictData.recordId, mergedData);
      }
    } else {
      await this.resolveConflict(conflictData);
    }
  }
}

export const syncService = new SyncService();
```

### Sync Hook for React Components
```typescript
// frontend/hooks/useSync.ts
import { useState, useEffect } from 'react';
import { syncService, SyncStatus } from '../services/sync/SyncService';

export const useSync = () => {
  const [status, setStatus] = useState<SyncStatus>(syncService.getStatus());

  useEffect(() => {
    const unsubscribe = syncService.onStatusChange(setStatus);
    return unsubscribe;
  }, []);

  const triggerSync = async (force = false) => {
    await syncService.triggerSync(force);
  };

  const getConflicts = async () => {
    return await syncService.getConflicts();
  };

  const resolveConflict = async (
    conflictId: string, 
    resolution: 'local' | 'remote' | 'merge',
    mergedData?: any
  ) => {
    await syncService.resolveConflictManually(conflictId, resolution, mergedData);
  };

  return {
    status,
    triggerSync,
    getConflicts,
    resolveConflict,
    isOnline: status.isRunning || status.lastSync !== null,
    hasPendingChanges: status.pendingOperations > 0,
    hasConflicts: status.conflictsCount > 0
  };
};
```

### Background Sync Service
```typescript
// frontend/services/sync/BackgroundSyncService.ts
import BackgroundTask from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { syncService } from './SyncService';

const BACKGROUND_SYNC_TASK = 'background-sync';

// Define the backgroun
d task
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    console.log('Running background sync...');
    await syncService.triggerSync();
    return BackgroundTask.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Background sync failed:', error);
    return BackgroundTask.BackgroundFetchResult.Failed;
  }
});

class BackgroundSyncService {
  private isRegistered = false;

  async initialize(): Promise<void> {
    try {
      // Register background task
      await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, {
        minimumInterval: 15 * 60 * 1000, // 15 minutes
        stopOnTerminate: false,
        startOnBoot: true,
      });

      this.isRegistered = true;
      console.log('Background sync registered');
    } catch (error) {
      console.error('Failed to register background sync:', error);
    }
  }

  async unregister(): Promise<void> {
    if (this.isRegistered) {
      await BackgroundTask.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
      this.isRegistered = false;
    }
  }

  async getStatus(): Promise<any> {
    return await BackgroundTask.getStatusAsync();
  }
}

export const backgroundSyncService = new BackgroundSyncService();
```

### Sync Utilities and Helpers
```typescript
// frontend/services/sync/SyncUtils.ts
import { syncService } from './SyncService';
import { patientRepository } from '../../database/repository/PatientRepository';
import { immunizationRepository } from '../../database/repository/ImmunizationRepository';
import { notificationRepository } from '../../database/repository/NotificationRepository';
import { facilityRepository } from '../../database/repository/FacilityRepository';
import { vaccineRepository } from '../../database/repository/VaccineRepository';

export class SyncUtils {
  static async initializeSync(): Promise<void> {
    // Register all repositories
    syncService.registerRepository('patients', patientRepository);
    syncService.registerRepository('immunization_records', immunizationRepository);
    syncService.registerRepository('notifications', notificationRepository);
    syncService.registerRepository('facilities', facilityRepository);
    syncService.registerRepository('vaccines', vaccineRepository);

    // Initialize sync service
    await syncService.initialize();
  }

  static async performInitialSync(): Promise<void> {
    console.log('Performing initial sync...');
    await syncService.triggerSync(true);
  }

  static async clearSyncData(): Promise<void> {
    // Clear sync queue and conflicts
    const db = await databaseManager.getDatabase();
    await db.execAsync('DELETE FROM sync_queue');
    await db.execAsync('DELETE FROM conflict_resolution');
    
    console.log('Sync data cleared');
  }

  static async getSyncStatistics(): Promise<{
    totalPendingOperations: number;
    totalConflicts: number;
    lastSyncTime: Date | null;
    syncFrequency: number;
  }> {
    const status = syncService.getStatus();
    const conflicts = await syncService.getConflicts();
    
    return {
      totalPendingOperations: status.pendingOperations,
      totalConflicts: conflicts.length,
      lastSyncTime: status.lastSync,
      syncFrequency: 30000 // 30 seconds
    };
  }

  static async exportSyncLogs(): Promise<string> {
    // Export sync logs for debugging
    const db = await databaseManager.getDatabase();
    
    const syncQueue = await db.getAllAsync('SELECT * FROM sync_queue ORDER BY created_at DESC LIMIT 100');
    const conflicts = await db.getAllAsync('SELECT * FROM conflict_resolution ORDER BY created_at DESC LIMIT 50');
    
    const logs = {
      timestamp: new Date().toISOString(),
      syncQueue,
      conflicts,
      status: syncService.getStatus()
    };
    
    return JSON.stringify(logs, null, 2);
  }
}
```

### Conflict Resolution UI Components
```typescript
// frontend/components/sync/ConflictResolutionModal.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { ConflictResolution } from '../../services/sync/SyncService';
import { useSync } from '../../hooks/useSync';

interface ConflictResolutionModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  visible,
  onClose
}) => {
  const { getConflicts, resolveConflict } = useSync();
  const [conflicts, setConflicts] = useState<ConflictResolution[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<ConflictResolution | null>(null);

  useEffect(() => {
    if (visible) {
      loadConflicts();
    }
  }, [visible]);

  const loadConflicts = async () => {
    try {
      const conflictList = await getConflicts();
      setConflicts(conflictList);
    } catch (error) {
      console.error('Failed to load conflicts:', error);
    }
  };

  const handleResolveConflict = async (
    conflictId: string, 
    resolution: 'local' | 'remote'
  ) => {
    try {
      await resolveConflict(conflictId, resolution);
      await loadConflicts();
      setSelectedConflict(null);
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    }
  };

  const renderConflictItem = (conflict: ConflictResolution) => (
    <TouchableOpacity
      key={conflict.id}
      style={styles.conflictItem}
      onPress={() => setSelectedConflict(conflict)}
    >
      <Text style={styles.conflictTitle}>
        {conflict.tableName} - {conflict.recordId}
      </Text>
      <Text style={styles.conflictType}>{conflict.conflictType}</Text>
    </TouchableOpacity>
  );

  const renderConflictDetails = () => {
    if (!selectedConflict) return null;

    return (
      <View style={styles.conflictDetails}>
        <Text style={styles.detailsTitle}>Conflict Details</Text>
        
        <View style={styles.dataComparison}>
          <View style={styles.dataColumn}>
            <Text style={styles.dataTitle}>Local Version</Text>
            <ScrollView style={styles.dataContent}>
              <Text style={styles.dataText}>
                {JSON.stringify(selectedConflict.localData, null, 2)}
              </Text>
            </ScrollView>
          </View>
          
          <View style={styles.dataColumn}>
            <Text style={styles.dataTitle}>Remote Version</Text>
            <ScrollView style={styles.dataContent}>
              <Text style={styles.dataText}>
                {JSON.stringify(selectedConflict.remoteData, null, 2)}
              </Text>
            </ScrollView>
          </View>
        </View>
        
        <View style={styles.resolutionButtons}>
          <TouchableOpacity
            style={[styles.resolutionButton, styles.localButton]}
            onPress={() => handleResolveConflict(selectedConflict.id, 'local')}
          >
            <Text style={styles.buttonText}>Keep Local</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.resolutionButton, styles.remoteButton]}
            onPress={() => handleResolveConflict(selectedConflict.id, 'remote')}
          >
            <Text style={styles.buttonText}>Keep Remote</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Resolve Data Conflicts</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>Close</Text>
          </TouchableOpacity>
        </View>
        
        {selectedConflict ? (
          renderConflictDetails()
        ) : (
          <ScrollView style={styles.conflictList}>
            {conflicts.length === 0 ? (
              <Text style={styles.noConflicts}>No conflicts to resolve</Text>
            ) : (
              conflicts.map(renderConflictItem)
            )}
          </ScrollView>
        )}
        
        {selectedConflict && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedConflict(null)}
          >
            <Text style={styles.backButtonText}>← Back to List</Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    color: '#007bff',
    fontSize: 16,
  },
  conflictList: {
    flex: 1,
    padding: 16,
  },
  conflictItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  conflictTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  conflictType: {
    fontSize: 14,
    color: '#6c757d',
  },
  noConflicts: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6c757d',
    marginTop: 50,
  },
  conflictDetails: {
    flex: 1,
    padding: 16,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  dataComparison: {
    flexDirection: 'row',
    flex: 1,
    gap: 16,
  },
  dataColumn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
  },
  dataTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  dataContent: {
    flex: 1,
    maxHeight: 300,
  },
  dataText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  resolutionButtons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  resolutionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  localButton: {
    backgroundColor: '#28a745',
  },
  remoteButton: {
    backgroundColor: '#007bff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  backButtonText: {
    color: '#007bff',
    fontSize: 16,
  },
});
```

### Sync Status Indicator Component
```typescript
// frontend/components/sync/SyncStatusIndicator.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSync } from '../../hooks/useSync';

interface SyncStatusIndicatorProps {
  onPress?: () => void;
  showDetails?: boolean;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  onPress,
  showDetails = false
}) => {
  const { status, triggerSync, hasPendingChanges, hasConflicts } = useSync();

  const getStatusColor = () => {
    if (hasConflicts) return '#dc3545';
    if (status.isRunning) return '#ffc107';
    if (hasPendingChanges) return '#fd7e14';
    return '#28a745';
  };

  const getStatusIcon = () => {
    if (hasConflicts) return 'alert-circle';
    if (status.isRunning) return 'sync';
    if (hasPendingChanges) return 'cloud-upload-outline';
    return 'checkmark-circle';
  };

  const getStatusText = () => {
    if (hasConflicts) return `${status.conflictsCount} conflicts`;
    if (status.isRunning) return 'Syncing...';
    if (hasPendingChanges) return `${status.pendingOperations} pending`;
    return 'Up to date';
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (!status.isRunning) {
      triggerSync();
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <View style={[styles.indicator, { backgroundColor: getStatusColor() }]}>
        <Ionicons 
          name={getStatusIcon()} 
          size={16} 
          color="#fff" 
          style={status.isRunning ? styles.spinning : undefined}
        />
      </View>
      
      {showDetails && (
        <View style={styles.details}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
          {status.lastSync && (
            <Text style={styles.lastSyncText}>
              Last sync: {status.lastSync.toLocaleTimeString()}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  indicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinning: {
    // Add rotation animation if needed
  },
  details: {
    marginLeft: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  lastSyncText: {
    fontSize: 12,
    color: '#6c757d',
  },
});
```

## Files to Create/Modify
- `frontend/services/sync/SyncService.ts` - Main synchronization service
- `frontend/services/sync/BackgroundSyncService.ts` - Background sync functionality
- `frontend/services/sync/SyncUtils.ts` - Sync utilities and helpers
- `frontend/hooks/useSync.ts` - React hook for sync functionality
- `frontend/components/sync/ConflictResolutionModal.tsx` - UI for resolving conflicts
- `frontend/components/sync/SyncStatusIndicator.tsx` - Sync status indicator component
- `frontend/types/sync.ts` - TypeScript types for sync operations

## Testing Requirements

### Sync Service Testing
```typescript
// frontend/__tests__/services/sync/SyncService.test.ts
import { syncService } from '../../../services/sync/SyncService';
import { databaseManager } from '../../../database/config';

describe('SyncService', () => {
  beforeEach(async () => {
    await databaseManager.initialize();
    await databaseManager.clearDatabase();
  });

  afterEach(async () => {
    await databaseManager.close();
  });

  it('should initialize sync service', async () => {
    await syncService.initialize();
    const status = syncService.getStatus();
    expect(status).toBeDefined();
  });

  it('should handle upload operations', async () => {
    // Mock Appwrite client
    const mockCreate = jest.fn().mockResolvedValue({ $id: 'test-id' });
    
    // Test upload create operation
    await syncService.uploadCreate('patients', 'local-id', {
      fullName: 'Test Patient',
      sex: 'M',
      dateOfBirth: '2020-01-01'
    });

    expect(mockCreate).toHaveBeenCalled();
  });

  it('should detect and handle conflicts', async () => {
    // Create conflicting data
    const localData = {
      id: 'test-id',
      fullName: 'Local Name',
      lastModified: Date.now(),
      isDirty: true
    };

    const remoteData = {
      $id: 'test-id',
      fullName: 'Remote Name',
      $updatedAt: new Date(Date.now() + 1000).toISOString()
    };

    const hasConflict = syncService.hasConflict(localData, remoteData);
    expect(hasConflict).toBe(true);
  });
});
```

### Conflict Resolution Testing
```typescript
// frontend/__tests__/services/sync/ConflictResolution.test.ts
describe('Conflict Resolution', () => {
  it('should resolve conflicts using timestamp strategy', async () => {
    const conflict = {
      id: 'conflict-1',
      tableName: 'patients',
      recordId: 'patient-1',
      localData: { lastModified: Date.now() - 1000 },
      remoteData: { $updatedAt: new Date().toISOString() },
      conflictType: 'update_conflict'
    };

    await syncService.resolveConflict(conflict);
    
    // Verify remote data was chosen (more recent)
    const resolved = await syncService.getConflicts();
    expect(resolved.find(c => c.id === 'conflict-1')).toBeUndefined();
  });

  it('should store conflicts for manual resolution', async () => {
    await syncService.storeConflict({
      id: 'manual-conflict',
      tableName: 'patients',
      recordId: 'patient-1',
      localData: { name: 'Local' },
      remoteData: { name: 'Remote' },
      conflictType: 'update_conflict'
    });

    const conflicts = await syncService.getConflicts();
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].id).toBe('manual-conflict');
  });
});
```

### Network State Testing
```typescript
// frontend/__tests__/services/sync/NetworkSync.test.ts
describe('Network State Sync', () => {
  it('should trigger sync when network comes online', async () => {
    const mockTriggerSync = jest.spyOn(syncService, 'triggerSync');
    
    // Simulate network state change
    const mockNetInfo = {
      isConnected: true,
      isInternetReachable: true
    };

    // Trigger network change event
    syncService.setupNetworkMonitoring();
    
    expect(mockTriggerSync).toHaveBeenCalled();
  });

  it('should stop auto sync when network goes offline', async () => {
    const mockStopAutoSync = jest.spyOn(syncService, 'stopAutoSync');
    
    // Simulate network disconnection
    const mockNetInfo = {
      isConnected: false,
      isInternetReachable: false
    };

    expect(mockStopAutoSync).toHaveBeenCalled();
  });
});
```

## Implementation Steps

### Phase 1: Core Sync Service (3 hours)
1. Implement main SyncService class
2. Add upload/download functionality
3. Implement conflict detection
4. Test basic sync operations

### Phase 2: Conflict Resolution (2 hours)
1. Implement conflict resolution strategies
2. Add manual conflict resolution
3. Create conflict storage system
4. Test conflict scenarios

### Phase 3: Network Integration (1.5 hours)
1. Add network state monitoring
2. Implement automatic sync triggers
3. Add retry logic for failed operations
4. Test network state changes

### Phase 4: Background Sync (1.5 hours)
1. Implement background sync service
2. Add task scheduling
3. Test background operations
4. Optimize for battery usage

### Phase 5: UI Components & Testing (2 hours)
1. Create sync status indicators
2. Build conflict resolution UI
3. Add sync hooks for React components
4. Write comprehensive tests

## Success Metrics
- Bidirectional sync working correctly
- Conflict resolution strategies functional
- Network state changes handled properly
- Background sync operational
- UI components providing clear feedback
- All tests passing
- Performance acceptable on mobile devices

## Rollback Plan
- Disable automatic sync if issues occur
- Provide manual sync controls
- Maintain local data integrity
- Document rollback procedures

## Next Steps
After completion, this task enables:
- FE-AW-10: Authentication context migration
- FE-AW-11: Patient services migration with offline support
- FE-AW-12: Immunization services migration with offline support
- FE-AW-13: Notification services migration with offline support
- FE-AW-14: Offline indicators and conflict resolution UI