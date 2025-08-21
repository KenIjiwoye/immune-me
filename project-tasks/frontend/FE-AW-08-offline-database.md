# FE-AW-08: Implement Local SQLite Database for Offline Storage

## Title
Implement Local SQLite Database for Offline Storage

## Priority
High

## Estimated Time
6-8 hours

## Dependencies
- FE-AW-07: Appwrite SDK configuration completed
- BE-AW-02: Database collections schema defined

## Description
Implement a comprehensive local SQLite database system for offline-first functionality in the React Native application. This includes creating database schemas that mirror Appwrite collections, implementing CRUD operations, data versioning for conflict resolution, and establishing a robust foundation for data synchronization.

The offline database will serve as the primary data source for the application, ensuring full functionality even without network connectivity, while maintaining data integrity and supporting eventual consistency with the remote Appwrite database.

## Acceptance Criteria
- [ ] SQLite database properly configured and initialized
- [ ] Database schemas created for all main entities (patients, immunizations, notifications, etc.)
- [ ] CRUD operations implemented for all entities
- [ ] Data versioning and conflict resolution metadata included
- [ ] Database migration system implemented
- [ ] Indexing for performance optimization
- [ ] Data validation and constraints enforced
- [ ] Backup and restore functionality
- [ ] Database encryption for sensitive data
- [ ] Performance monitoring and optimization
- [ ] Comprehensive error handling
- [ ] TypeScript types for all database operations

## Technical Implementation

### Package Installation
```bash
# Install Expo SQLite
npx expo install expo-sqlite

# Install additional dependencies for offline support
npm install @react-native-async-storage/async-storage
npm install @react-native-community/netinfo
npm install uuid
npm install @types/uuid
```

### Database Setup and Configuration
```typescript
// frontend/database/config.ts
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

export interface DatabaseConfig {
  name: string;
  version: string;
}

export const DATABASE_CONFIG: DatabaseConfig = {
  name: 'ImmuneMe.db',
  version: '1.0'
};

export interface SyncMetadata {
  id: string;
  lastModified: number;
  version: number;
  isDeleted: boolean;
  isDirty: boolean;
  appwriteId?: string;
  conflictResolution?: 'local' | 'remote' | 'manual';
  createdAt: number;
  updatedAt: number;
}

class DatabaseManager {
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.db = await SQLite.openDatabaseAsync(DATABASE_CONFIG.name);
      await this.createTables();
      await this.createIndexes();
      this.isInitialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const tables = [
      this.createPatientsTable(),
      this.createImmunizationRecordsTable(),
      this.createNotificationsTable(),
      this.createFacilitiesTable(),
      this.createVaccinesTable(),
      this.createVaccineSchedulesTable(),
      this.createVaccineScheduleItemsTable(),
      this.createSupplementaryImmunizationsTable(),
      this.createSyncQueueTable(),
      this.createConflictResolutionTable()
    ];

    for (const tableSQL of tables) {
      await this.db.execAsync(tableSQL);
    }
  }

  private createPatientsTable(): string {
    return `
      CREATE TABLE IF NOT EXISTS patients (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        sex TEXT NOT NULL CHECK (sex IN ('M', 'F')),
        date_of_birth TEXT NOT NULL,
        mother_name TEXT,
        father_name TEXT,
        district TEXT NOT NULL,
        town_village TEXT,
        address TEXT,
        contact_phone TEXT,
        health_worker_id TEXT,
        health_worker_name TEXT,
        health_worker_phone TEXT,
        health_worker_address TEXT,
        facility_id TEXT NOT NULL,
        
        -- Sync metadata
        last_modified INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        version INTEGER NOT NULL DEFAULT 1,
        is_deleted INTEGER NOT NULL DEFAULT 0,
        is_dirty INTEGER NOT NULL DEFAULT 1,
        appwrite_id TEXT UNIQUE,
        conflict_resolution TEXT CHECK (conflict_resolution IN ('local', 'remote', 'manual')),
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        
        FOREIGN KEY (facility_id) REFERENCES facilities (id)
      );
    `;
  }

  private createImmunizationRecordsTable(): string {
    return `
      CREATE TABLE IF NOT EXISTS immunization_records (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        vaccine_id TEXT NOT NULL,
        facility_id TEXT NOT NULL,
        administered_by TEXT NOT NULL,
        date_administered TEXT NOT NULL,
        dose_number INTEGER NOT NULL,
        batch_number TEXT,
        expiration_date TEXT,
        site_of_administration TEXT,
        adverse_events TEXT,
        notes TEXT,
        
        -- Sync metadata
        last_modified INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        version INTEGER NOT NULL DEFAULT 1,
        is_deleted INTEGER NOT NULL DEFAULT 0,
        is_dirty INTEGER NOT NULL DEFAULT 1,
        appwrite_id TEXT UNIQUE,
        conflict_resolution TEXT CHECK (conflict_resolution IN ('local', 'remote', 'manual')),
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        
        FOREIGN KEY (patient_id) REFERENCES patients (id),
        FOREIGN KEY (vaccine_id) REFERENCES vaccines (id),
        FOREIGN KEY (facility_id) REFERENCES facilities (id)
      );
    `;
  }

  private createNotificationsTable(): string {
    return `
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        vaccine_id TEXT NOT NULL,
        facility_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('due', 'overdue', 'reminder')),
        status TEXT NOT NULL CHECK (status IN ('pending', 'viewed', 'completed')),
        due_date TEXT NOT NULL,
        message TEXT,
        priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
        
        -- Sync metadata
        last_modified INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        version INTEGER NOT NULL DEFAULT 1,
        is_deleted INTEGER NOT NULL DEFAULT 0,
        is_dirty INTEGER NOT NULL DEFAULT 1,
        appwrite_id TEXT UNIQUE,
        conflict_resolution TEXT CHECK (conflict_resolution IN ('local', 'remote', 'manual')),
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        
        FOREIGN KEY (patient_id) REFERENCES patients (id),
        FOREIGN KEY (vaccine_id) REFERENCES vaccines (id),
        FOREIGN KEY (facility_id) REFERENCES facilities (id)
      );
    `;
  }

  private createFacilitiesTable(): string {
    return `
      CREATE TABLE IF NOT EXISTS facilities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('hospital', 'clinic', 'health_center', 'outreach_post')),
        district TEXT NOT NULL,
        address TEXT,
        contact_phone TEXT,
        contact_email TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        
        -- Sync metadata
        last_modified INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        version INTEGER NOT NULL DEFAULT 1,
        is_deleted INTEGER NOT NULL DEFAULT 0,
        is_dirty INTEGER NOT NULL DEFAULT 1,
        appwrite_id TEXT UNIQUE,
        conflict_resolution TEXT CHECK (conflict_resolution IN ('local', 'remote', 'manual')),
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      );
    `;
  }

  private createVaccinesTable(): string {
    return `
      CREATE TABLE IF NOT EXISTS vaccines (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        manufacturer TEXT,
        dosage_form TEXT,
        route_of_administration TEXT,
        storage_requirements TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        
        -- Sync metadata
        last_modified INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        version INTEGER NOT NULL DEFAULT 1,
        is_deleted INTEGER NOT NULL DEFAULT 0,
        is_dirty INTEGER NOT NULL DEFAULT 1,
        appwrite_id TEXT UNIQUE,
        conflict_resolution TEXT CHECK (conflict_resolution IN ('local', 'remote', 'manual')),
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      );
    `;
  }

  private createVaccineSchedulesTable(): string {
    return `
      CREATE TABLE IF NOT EXISTS vaccine_schedules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        country TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        
        -- Sync metadata
        last_modified INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        version INTEGER NOT NULL DEFAULT 1,
        is_deleted INTEGER NOT NULL DEFAULT 0,
        is_dirty INTEGER NOT NULL DEFAULT 1,
        appwrite_id TEXT UNIQUE,
        conflict_resolution TEXT CHECK (conflict_resolution IN ('local', 'remote', 'manual')),
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      );
    `;
  }

  private createVaccineScheduleItemsTable(): string {
    return `
      CREATE TABLE IF NOT EXISTS vaccine_schedule_items (
        id TEXT PRIMARY KEY,
        schedule_id TEXT NOT NULL,
        vaccine_id TEXT NOT NULL,
        dose_number INTEGER NOT NULL,
        age_in_weeks INTEGER NOT NULL,
        age_in_months INTEGER,
        minimum_interval_weeks INTEGER,
        notes TEXT,
        
        -- Sync metadata
        last_modified INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        version INTEGER NOT NULL DEFAULT 1,
        is_deleted INTEGER NOT NULL DEFAULT 0,
        is_dirty INTEGER NOT NULL DEFAULT 1,
        appwrite_id TEXT UNIQUE,
        conflict_resolution TEXT CHECK (conflict_resolution IN ('local', 'remote', 'manual')),
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        
        FOREIGN KEY (schedule_id) REFERENCES vaccine_schedules (id),
        FOREIGN KEY (vaccine_id) REFERENCES vaccines (id)
      );
    `;
  }

  private createSupplementaryImmunizationsTable(): string {
    return `
      CREATE TABLE IF NOT EXISTS supplementary_immunizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        target_age_group TEXT,
        vaccine_id TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT,
        target_districts TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        
        -- Sync metadata
        last_modified INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        version INTEGER NOT NULL DEFAULT 1,
        is_deleted INTEGER NOT NULL DEFAULT 0,
        is_dirty INTEGER NOT NULL DEFAULT 1,
        appwrite_id TEXT UNIQUE,
        conflict_resolution TEXT CHECK (conflict_resolution IN ('local', 'remote', 'manual')),
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        
        FOREIGN KEY (vaccine_id) REFERENCES vaccines (id)
      );
    `;
  }

  private createSyncQueueTable(): string {
    return `
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
        data TEXT, -- JSON data for the operation
        priority INTEGER NOT NULL DEFAULT 1,
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3,
        last_error TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      );
    `;
  }

  private createConflictResolutionTable(): string {
    return `
      CREATE TABLE IF NOT EXISTS conflict_resolution (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        local_data TEXT NOT NULL, -- JSON
        remote_data TEXT NOT NULL, -- JSON
        conflict_type TEXT NOT NULL,
        resolution_strategy TEXT CHECK (resolution_strategy IN ('local', 'remote', 'manual', 'merge')),
        resolved INTEGER NOT NULL DEFAULT 0,
        resolved_at INTEGER,
        resolved_by TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      );
    `;
  }

  private async createIndexes(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const indexes = [
      // Patient indexes
      'CREATE INDEX IF NOT EXISTS idx_patients_facility_id ON patients (facility_id)',
      'CREATE INDEX IF NOT EXISTS idx_patients_full_name ON patients (full_name)',
      'CREATE INDEX IF NOT EXISTS idx_patients_district ON patients (district)',
      'CREATE INDEX IF NOT EXISTS idx_patients_date_of_birth ON patients (date_of_birth)',
      'CREATE INDEX IF NOT EXISTS idx_patients_is_dirty ON patients (is_dirty)',
      'CREATE INDEX IF NOT EXISTS idx_patients_appwrite_id ON patients (appwrite_id)',
      
      // Immunization records indexes
      'CREATE INDEX IF NOT EXISTS idx_immunization_records_patient_id ON immunization_records (patient_id)',
      'CREATE INDEX IF NOT EXISTS idx_immunization_records_vaccine_id ON immunization_records (vaccine_id)',
      'CREATE INDEX IF NOT EXISTS idx_immunization_records_facility_id ON immunization_records (facility_id)',
      'CREATE INDEX IF NOT EXISTS idx_immunization_records_date_administered ON immunization_records (date_administered)',
      'CREATE INDEX IF NOT EXISTS idx_immunization_records_is_dirty ON immunization_records (is_dirty)',
      
      // Notifications indexes
      'CREATE INDEX IF NOT EXISTS idx_notifications_patient_id ON notifications (patient_id)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications (status)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_due_date ON notifications (due_date)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications (priority)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_is_dirty ON notifications (is_dirty)',
      
      // Facilities indexes
      'CREATE INDEX IF NOT EXISTS idx_facilities_district ON facilities (district)',
      'CREATE INDEX IF NOT EXISTS idx_facilities_type ON facilities (type)',
      'CREATE INDEX IF NOT EXISTS idx_facilities_is_active ON facilities (is_active)',
      
      // Vaccines indexes
      'CREATE INDEX IF NOT EXISTS idx_vaccines_name ON vaccines (name)',
      'CREATE INDEX IF NOT EXISTS idx_vaccines_is_active ON vaccines (is_active)',
      
      // Vaccine schedule items indexes
      'CREATE INDEX IF NOT EXISTS idx_vaccine_schedule_items_schedule_id ON vaccine_schedule_items (schedule_id)',
      'CREATE INDEX IF NOT EXISTS idx_vaccine_schedule_items_vaccine_id ON vaccine_schedule_items (vaccine_id)',
      'CREATE INDEX IF NOT EXISTS idx_vaccine_schedule_items_age_weeks ON vaccine_schedule_items (age_in_weeks)',
      
      // Sync queue indexes
      'CREATE INDEX IF NOT EXISTS idx_sync_queue_table_record ON sync_queue (table_name, record_id)',
      'CREATE INDEX IF NOT EXISTS idx_sync_queue_priority ON sync_queue (priority)',
      'CREATE INDEX IF NOT EXISTS idx_sync_queue_created_at ON sync_queue (created_at)',
      
      // Conflict resolution indexes
      'CREATE INDEX IF NOT EXISTS idx_conflict_resolution_table_record ON conflict_resolution (table_name, record_id)',
      'CREATE INDEX IF NOT EXISTS idx_conflict_resolution_resolved ON conflict_resolution (resolved)'
    ];

    for (const indexSQL of indexes) {
      await this.db.execAsync(indexSQL);
    }
  }

  async getDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (!this.db) {
      await this.initialize();
    }
    return this.db!;
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      this.isInitialized = false;
    }
  }

  async clearDatabase(): Promise<void> {
    const db = await this.getDatabase();
    const tables = [
      'patients', 'immunization_records', 'notifications', 'facilities',
      'vaccines', 'vaccine_schedules', 'vaccine_schedule_items',
      'supplementary_immunizations', 'sync_queue', 'conflict_resolution'
    ];

    for (const table of tables) {
      await db.execAsync(`DELETE FROM ${table}`);
    }
  }
}

export const databaseManager = new DatabaseManager();
```

### Generic Repository Pattern
```typescript
// frontend/database/repository/BaseRepository.ts
import { databaseManager } from '../config';
import { SyncMetadata } from '../config';
import { v4 as uuidv4 } from 'uuid';

export interface BaseEntity extends SyncMetadata {
  id: string;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  where?: Record<string, any>;
}

export interface QueryResult<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

export abstract class BaseRepository<T extends BaseEntity> {
  protected abstract tableName: string;
  protected abstract mapRowToEntity(row: any): T;
  protected abstract mapEntityToRow(entity: Partial<T>): Record<string, any>;

  async create(entity: Omit<T, keyof SyncMetadata>): Promise<T> {
    const db = await databaseManager.getDatabase();
    const id = uuidv4();
    const now = Date.now();
    
    const fullEntity: T = {
      ...entity,
      id,
      lastModified: now,
      version: 1,
      isDeleted: false,
      isDirty: true,
      createdAt: now,
      updatedAt: now
    } as T;

    const row = this.mapEntityToRow(fullEntity);
    const columns = Object.keys(row).join(', ');
    const placeholders = Object.keys(row).map(() => '?').join(', ');
    const values = Object.values(row);

    const sql = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`;
    
    try {
      await db.runAsync(sql, values);
      
      // Add to sync queue
      await this.addToSyncQueue(id, 'create', fullEntity);
      
      return fullEntity;
    } catch (error) {
      console.error(`Error creating ${this.tableName}:`, error);
      throw error;
    }
  }

  async findById(id: string): Promise<T | null> {
    const db = await databaseManager.getDatabase();
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ? AND is_deleted = 0`;
    
    try {
      const result = await db.getFirstAsync(sql, [id]);
      if (!result) return null;
      
      return this.mapRowToEntity(result);
    } catch (error) {
      console.error(`Error finding ${this.tableName} by id:`, error);
      throw error;
    }
  }

  async findAll(options: QueryOptions = {}): Promise<QueryResult<T>> {
    const db = await databaseManager.getDatabase();
    const { limit = 50, offset = 0, orderBy = 'created_at', orderDirection = 'DESC', where = {} } = options;
    
    let sql = `SELECT * FROM ${this.tableName} WHERE is_deleted = 0`;
    const params: any[] = [];
    
    // Add WHERE conditions
    Object.entries(where).forEach(([key, value]) => {
      sql += ` AND ${key} = ?`;
      params.push(value);
    });
    
    // Add ORDER BY
    sql += ` ORDER BY ${orderBy} ${orderDirection}`;
    
    // Add LIMIT and OFFSET
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    try {
      const results = await db.getAllAsync(sql, params);
      const data: T[] = results.map(row => this.mapRowToEntity(row));
      
      // Get total count
      let countSql = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE is_deleted = 0`;
      const countParams: any[] = [];
      
      Object.entries(where).forEach(([key, value]) => {
        countSql += ` AND ${key} = ?`;
        countParams.push(value);
      });
      
      const countResult = await db.getFirstAsync(countSql, countParams);
      const total = countResult?.total || 0;
      
      return {
        data,
        total,
        hasMore: offset + data.length < total
      };
    } catch (error) {
      console.error(`Error finding all ${this.tableName}:`, error);
      throw error;
    }
  }

  async update(id: string, updates: Partial<Omit<T, keyof SyncMetadata>>): Promise<T> {
    const db = await databaseManager.getDatabase();
    const existing = await this.findById(id);
    
    if (!existing) {
      throw new Error(`${this.tableName} with id ${id} not found`);
    }
    
    const now = Date.now();
    const updatedEntity: T = {
      ...existing,
      ...updates,
      version: existing.version + 1,
      lastModified: now,
      updatedAt: now,
      isDirty: true
    };
    
    const row = this.mapEntityToRow(updatedEntity);
    const setClause = Object.keys(row)
      .filter(key => key !== 'id')
      .map(key => `${key} = ?`)
      .join(', ');
    const values = Object.entries(row)
      .filter(([key]) => key !== 'id')
      .map(([, value]) => value);
    
    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
    values.push(id);
    
    try {
      await db.runAsync(sql, values);
      
      // Add to sync queue
      await this.addToSyncQueue(id, 'update', updatedEntity);
      
      return updatedEntity;
    } catch (error) {
      console.error(`Error updating ${this.tableName}:`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const db = await databaseManager.getDatabase();
    const now = Date.now();
    
    const sql = `UPDATE ${this.tableName} SET is_deleted = 1, updated_at = ?, last_modified = ?, is_dirty = 1 WHERE id = ?`;
    
    try {
      await db.runAsync(sql, [now, now, id]);
      
      // Add to sync queue
      await this.addToSyncQueue(id, 'delete', { id });
    } catch (error) {
      console.error(`Error deleting ${this.tableName}:`, error);
      throw error;
    }
  }

  async hardDelete(id: string): Promise<void> {
    const db = await databaseManager.getDatabase();
    const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
    
    try {
      await db.runAsync(sql, [id]);
    } catch (error) {
      console.error(`Error hard deleting ${this.tableName}:`, error);
      throw error;
    }
  }

  async findDirtyRecords(): Promise<T[]> {
    const db = await databaseManager.getDatabase();
    const sql = `SELECT * FROM ${this.tableName} WHERE is_dirty = 1 ORDER BY last_modified ASC`;
    
    try {
      const results = await db.getAllAsync(sql);
      return results.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error(`Error finding dirty ${this.tableName}:`, error);
      throw error;
    }
  }

  async markAsSynced(id: string, appwriteId?: string): Promise<void> {
    const db = await databaseManager.getDatabase();
    const now = Date.now();
    
    let sql = `UPDATE ${this.tableName} SET is_dirty = 0, updated_at = ?`;
    const params = [now];
    
    if (appwriteId) {
      sql += `, appwrite_id = ?`;
      params.push(appwriteId);
    }
    
    sql += ` WHERE id = ?`;
    params.push(id);
    
    try {
      await db.runAsync(sql, params);
    } catch (error) {
      console.error(`Error marking ${this.tableName} as synced:`, error);
      throw error;
    }
  }

  private async addToSyncQueue(recordId: string, operation: 'create' | 'update' | 'delete', data: any): Promise<void> {
    const db = await databaseManager.getDatabase();
    const id = uuidv4();
    const now = Date.now();
    
    const sql = `INSERT INTO sync_queue (id, table_name, record_id, operation, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [id, this.tableName, recordId, operation, JSON.stringify(data), now, now];
    
    try {
      await db.runAsync(sql, params);
    } catch (error) {
      console.error('Error adding to sync queue:', error);
      // Don't throw here as this shouldn't block the main operation
    }
  }

  async search(query: string, fields: string[], options: QueryOptions = {}): Promise<QueryResult<T>> {
    const db = await databaseManager.getDatabase();
    const { limit = 50, offset = 0, orderBy = 'created_at', orderDirection = 'DESC' } = options;
    
    const searchConditions = fields.map(field => `${field} LIKE ?`).join(' OR ');
    const searchParams = fields.map(() => `%${query}%`);
    
    let sql = `SELECT * FROM ${this.tableName} WHERE is_deleted = 0 AND (${searchConditions})`;
    sql += ` ORDER BY ${orderBy} ${orderDirection} LIMIT ? OFFSET ?`;
    
    const params = [...searchParams, limit, offset];
    
    try {
      const results = await db.getAllAsync(sql, params);
      const data: T[] = results.map(row => this.mapRowToEntity(row));
      
      // Get total count for search
      const countSql = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE is_deleted = 0 AND (${searchConditions})`;
      const countResult = await db.getFirstAsync(countSql, searchParams);
      const total = countResult?.total || 0;
      
      return {
        data,
        total,
        hasMore: offset + data.length < total
      };
    } catch (error) {
      console.error(`Error searching ${this.tableName}:`, error);
      throw error;
    }
  }
}
```

### Patient Repository Implementation
```typescript
// frontend/database/repository/PatientRepository.ts
import { BaseRepository, BaseEntity, QueryOptions, QueryResult } from './BaseRepository';

export interface Patient extends BaseEntity {
  fullName: string;
  sex: 'M' | 'F';
  dateOfBirth: string;
  motherName?: string;
  fatherName?: string;
  district: string;
  townVillage?: string;
  address?: string;
  contactPhone?: string;
  healthWorkerId?: string;
  healthWorkerName?: string;
  healthWorkerPhone?: string;
  healthWorkerAddress?: string;
  facilityId: string;
}

export class PatientRepository extends BaseRepository<Patient> {
  protected tableName = 'patients';

  protected mapRowToEntity(row: any): Patient {
    return {
      id: row.id,
      fullName: row.full_name,
      sex: row.sex,
      dateOfBirth: row.date_of_birth,
      motherName: row.mother_name,
      fatherName: row.father_name,
      district: row.district,
      townVillage: row.town_village,
      address: row.address,
      contactPhone: row.contact_phone,
      healthWorkerId: row.health_worker_id,
      healthWorkerName: row.health_worker_name,
      healthWorkerPhone: row.health_worker_phone,
      healthWorkerAddress: row.health_worker_address,
      facilityId: row.facility_id,
      lastModified: row.last_modified,
      version: row.version,
      isDeleted: Boolean(row.is_deleted),
      isDirty: Boolean(row.is_dirty),
      appwriteId: row.appwrite_id,
      conflictResolution: row.conflict_resolution,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  protected mapEntityToRow(entity: Partial<Patient>): Record<string, any> {
    return {
      id: entity.id,
      full_name: entity.fullName,
      sex: entity.sex,
      date_of_birth: entity.
dateOfBirth,
      mother_name: entity.motherName,
      father_name: entity.fatherName,
      district: entity.district,
      town_village: entity.townVillage,
      address: entity.address,
      contact_phone: entity.contactPhone,
      health_worker_id: entity.healthWorkerId,
      health_worker_name: entity.healthWorkerName,
      health_worker_phone: entity.healthWorkerPhone,
      health_worker_address: entity.healthWorkerAddress,
      facility_id: entity.facilityId,
      last_modified: entity.lastModified,
      version: entity.version,
      is_deleted: entity.isDeleted ? 1 : 0,
      is_dirty: entity.isDirty ? 1 : 0,
      appwrite_id: entity.appwriteId,
      conflict_resolution: entity.conflictResolution,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt
    };
  }

  async findByFacility(facilityId: string, options: QueryOptions = {}): Promise<QueryResult<Patient>> {
    return this.findAll({ ...options, where: { facility_id: facilityId } });
  }

  async findByDistrict(district: string, options: QueryOptions = {}): Promise<QueryResult<Patient>> {
    return this.findAll({ ...options, where: { district } });
  }

  async searchByName(query: string, options: QueryOptions = {}): Promise<QueryResult<Patient>> {
    return this.search(query, ['full_name', 'mother_name', 'father_name'], options);
  }

  async findDueForImmunization(): Promise<Patient[]> {
    // This would involve complex queries with vaccine schedules
    // Implementation would depend on business logic for determining due immunizations
    const db = await databaseManager.getDatabase();
    
    // Simplified example - would need more complex logic in real implementation
    const sql = `
      SELECT DISTINCT p.* FROM patients p
      LEFT JOIN immunization_records ir ON p.id = ir.patient_id
      WHERE p.is_deleted = 0
      GROUP BY p.id
      HAVING COUNT(ir.id) < (
        SELECT COUNT(*) FROM vaccine_schedule_items vsi
        WHERE vsi.age_in_weeks <= (
          (julianday('now') - julianday(p.date_of_birth)) / 7
        )
      )
      ORDER BY p.date_of_birth DESC
    `;
    
    try {
      const results = await db.getAllAsync(sql);
      return results.map(row => this.mapRowToEntity(row));
    } catch (error) {
      console.error('Error finding patients due for immunization:', error);
      throw error;
    }
  }
}

export const patientRepository = new PatientRepository();
```

### Database Migration System
```typescript
// frontend/database/migrations/MigrationManager.ts
import { databaseManager } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Migration {
  version: number;
  name: string;
  up: (db: any) => Promise<void>;
  down: (db: any) => Promise<void>;
}

class MigrationManager {
  private migrations: Migration[] = [];
  private readonly MIGRATION_KEY = 'database_migration_version';

  registerMigration(migration: Migration): void {
    this.migrations.push(migration);
    this.migrations.sort((a, b) => a.version - b.version);
  }

  async getCurrentVersion(): Promise<number> {
    try {
      const version = await AsyncStorage.getItem(this.MIGRATION_KEY);
      return version ? parseInt(version, 10) : 0;
    } catch (error) {
      console.error('Error getting migration version:', error);
      return 0;
    }
  }

  async setCurrentVersion(version: number): Promise<void> {
    try {
      await AsyncStorage.setItem(this.MIGRATION_KEY, version.toString());
    } catch (error) {
      console.error('Error setting migration version:', error);
      throw error;
    }
  }

  async migrate(): Promise<void> {
    const currentVersion = await this.getCurrentVersion();
    const db = await databaseManager.getDatabase();
    
    const pendingMigrations = this.migrations.filter(m => m.version > currentVersion);
    
    if (pendingMigrations.length === 0) {
      console.log('No pending migrations');
      return;
    }
    
    console.log(`Running ${pendingMigrations.length} migrations...`);
    
    for (const migration of pendingMigrations) {
      try {
        console.log(`Running migration ${migration.version}: ${migration.name}`);
        await migration.up(db);
        await this.setCurrentVersion(migration.version);
        console.log(`Migration ${migration.version} completed`);
      } catch (error) {
        console.error(`Migration ${migration.version} failed:`, error);
        throw error;
      }
    }
    
    console.log('All migrations completed successfully');
  }

  async rollback(targetVersion: number): Promise<void> {
    const currentVersion = await this.getCurrentVersion();
    const db = await databaseManager.getDatabase();
    
    const migrationsToRollback = this.migrations
      .filter(m => m.version > targetVersion && m.version <= currentVersion)
      .sort((a, b) => b.version - a.version); // Reverse order for rollback
    
    if (migrationsToRollback.length === 0) {
      console.log('No migrations to rollback');
      return;
    }
    
    console.log(`Rolling back ${migrationsToRollback.length} migrations...`);
    
    for (const migration of migrationsToRollback) {
      try {
        console.log(`Rolling back migration ${migration.version}: ${migration.name}`);
        await migration.down(db);
        await this.setCurrentVersion(migration.version - 1);
        console.log(`Migration ${migration.version} rolled back`);
      } catch (error) {
        console.error(`Rollback of migration ${migration.version} failed:`, error);
        throw error;
      }
    }
    
    console.log('Rollback completed successfully');
  }
}

export const migrationManager = new MigrationManager();

// Example migration
migrationManager.registerMigration({
  version: 1,
  name: 'Add indexes for performance',
  up: async (db) => {
    await db.executeSql('CREATE INDEX IF NOT EXISTS idx_patients_search ON patients (full_name, district)');
    await db.executeSql('CREATE INDEX IF NOT EXISTS idx_immunizations_patient_vaccine ON immunization_records (patient_id, vaccine_id)');
  },
  down: async (db) => {
    await db.executeSql('DROP INDEX IF EXISTS idx_patients_search');
    await db.executeSql('DROP INDEX IF EXISTS idx_immunizations_patient_vaccine');
  }
});
```

### Database Backup and Restore
```typescript
// frontend/database/backup/BackupManager.ts
import { databaseManager } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

export interface BackupMetadata {
  version: string;
  timestamp: number;
  recordCounts: Record<string, number>;
  checksum: string;
}

class BackupManager {
  private readonly BACKUP_DIR = `${FileSystem.documentDirectory}backups/`;

  async createBackup(): Promise<string> {
    try {
      // Ensure backup directory exists
      await FileSystem.makeDirectoryAsync(this.BACKUP_DIR, { intermediates: true });
      
      const db = await databaseManager.getDatabase();
      const timestamp = Date.now();
      const backupFileName = `backup_${timestamp}.json`;
      const backupPath = `${this.BACKUP_DIR}${backupFileName}`;
      
      // Get all data from all tables
      const tables = [
        'patients', 'immunization_records', 'notifications', 'facilities',
        'vaccines', 'vaccine_schedules', 'vaccine_schedule_items',
        'supplementary_immunizations'
      ];
      
      const backupData: Record<string, any[]> = {};
      const recordCounts: Record<string, number> = {};
      
      for (const table of tables) {
        const results = await db.getAllAsync(`SELECT * FROM ${table} WHERE is_deleted = 0`);
        backupData[table] = results;
        recordCounts[table] = results.length;
      }
      
      const metadata: BackupMetadata = {
        version: '1.0',
        timestamp,
        recordCounts,
        checksum: this.generateChecksum(JSON.stringify(backupData))
      };
      
      const fullBackup = {
        metadata,
        data: backupData
      };
      
      await FileSystem.writeAsStringAsync(backupPath, JSON.stringify(fullBackup));
      
      // Store backup metadata
      await this.storeBackupMetadata(backupFileName, metadata);
      
      console.log(`Backup created: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  }

  async restoreBackup(backupPath: string): Promise<void> {
    try {
      const backupContent = await FileSystem.readAsStringAsync(backupPath);
      const backup = JSON.parse(backupContent);
      
      // Verify checksum
      const dataChecksum = this.generateChecksum(JSON.stringify(backup.data));
      if (dataChecksum !== backup.metadata.checksum) {
        throw new Error('Backup file is corrupted (checksum mismatch)');
      }
      
      const db = await databaseManager.getDatabase();
      
      // Clear existing data
      await databaseManager.clearDatabase();
      
      // Restore data
      for (const [tableName, records] of Object.entries(backup.data)) {
        if (Array.isArray(records) && records.length > 0) {
          const sampleRecord = records[0];
          const columns = Object.keys(sampleRecord);
          const placeholders = columns.map(() => '?').join(', ');
          const columnNames = columns.join(', ');
          
          const insertSQL = `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`;
          
          for (const record of records) {
            const values = columns.map(col => record[col]);
            await db.runAsync(insertSQL, values);
          }
        }
      }
      
      console.log('Backup restored successfully');
    } catch (error) {
      console.error('Error restoring backup:', error);
      throw error;
    }
  }

  async listBackups(): Promise<Array<{ fileName: string; metadata: BackupMetadata }>> {
    try {
      const backupList = await AsyncStorage.getItem('backup_list');
      return backupList ? JSON.parse(backupList) : [];
    } catch (error) {
      console.error('Error listing backups:', error);
      return [];
    }
  }

  async deleteBackup(fileName: string): Promise<void> {
    try {
      const backupPath = `${this.BACKUP_DIR}${fileName}`;
      await FileSystem.deleteAsync(backupPath);
      
      // Remove from backup list
      const backups = await this.listBackups();
      const updatedBackups = backups.filter(b => b.fileName !== fileName);
      await AsyncStorage.setItem('backup_list', JSON.stringify(updatedBackups));
      
      console.log(`Backup deleted: ${fileName}`);
    } catch (error) {
      console.error('Error deleting backup:', error);
      throw error;
    }
  }

  private async storeBackupMetadata(fileName: string, metadata: BackupMetadata): Promise<void> {
    try {
      const backups = await this.listBackups();
      backups.push({ fileName, metadata });
      
      // Keep only last 10 backups
      const sortedBackups = backups
        .sort((a, b) => b.metadata.timestamp - a.metadata.timestamp)
        .slice(0, 10);
      
      await AsyncStorage.setItem('backup_list', JSON.stringify(sortedBackups));
    } catch (error) {
      console.error('Error storing backup metadata:', error);
      throw error;
    }
  }

  private generateChecksum(data: string): string {
    // Simple checksum implementation - in production, use a proper hash function
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }
}

export const backupManager = new BackupManager();
```

### Performance Monitoring
```typescript
// frontend/database/monitoring/PerformanceMonitor.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface QueryPerformance {
  query: string;
  duration: number;
  timestamp: number;
  recordCount?: number;
}

export interface DatabaseStats {
  totalQueries: number;
  averageQueryTime: number;
  slowQueries: QueryPerformance[];
  tableStats: Record<string, {
    recordCount: number;
    lastUpdated: number;
  }>;
}

class PerformanceMonitor {
  private queryLog: QueryPerformance[] = [];
  private readonly MAX_LOG_SIZE = 1000;
  private readonly SLOW_QUERY_THRESHOLD = 100; // ms

  async logQuery(query: string, duration: number, recordCount?: number): Promise<void> {
    const performance: QueryPerformance = {
      query: this.sanitizeQuery(query),
      duration,
      timestamp: Date.now(),
      recordCount
    };

    this.queryLog.push(performance);

    // Keep log size manageable
    if (this.queryLog.length > this.MAX_LOG_SIZE) {
      this.queryLog.shift();
    }

    // Log slow queries
    if (duration > this.SLOW_QUERY_THRESHOLD) {
      console.warn(`Slow query detected (${duration}ms):`, query);
    }

    // Persist performance data periodically
    if (this.queryLog.length % 50 === 0) {
      await this.persistPerformanceData();
    }
  }

  async getStats(): Promise<DatabaseStats> {
    const totalQueries = this.queryLog.length;
    const averageQueryTime = totalQueries > 0 
      ? this.queryLog.reduce((sum, q) => sum + q.duration, 0) / totalQueries 
      : 0;

    const slowQueries = this.queryLog
      .filter(q => q.duration > this.SLOW_QUERY_THRESHOLD)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    const tableStats = await this.getTableStats();

    return {
      totalQueries,
      averageQueryTime,
      slowQueries,
      tableStats
    };
  }

  private async getTableStats(): Promise<Record<string, { recordCount: number; lastUpdated: number }>> {
    // This would query each table for record counts
    // Implementation depends on specific requirements
    return {};
  }

  private sanitizeQuery(query: string): string {
    // Remove sensitive data from query for logging
    return query.replace(/VALUES\s*\([^)]+\)/gi, 'VALUES (...)');
  }

  private async persistPerformanceData(): Promise<void> {
    try {
      const recentQueries = this.queryLog.slice(-100); // Keep last 100 queries
      await AsyncStorage.setItem('db_performance_log', JSON.stringify(recentQueries));
    } catch (error) {
      console.error('Error persisting performance data:', error);
    }
  }

  async clearStats(): Promise<void> {
    this.queryLog = [];
    await AsyncStorage.removeItem('db_performance_log');
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Wrapper function to monitor query performance
export async function monitoredRunAsync(
  db: any,
  sql: string,
  params: any[] = []
): Promise<any> {
  const startTime = Date.now();
  
  try {
    const result = await db.runAsync(sql, params);
    const duration = Date.now() - startTime;
    
    await performanceMonitor.logQuery(sql, duration);
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    await performanceMonitor.logQuery(`ERROR: ${sql}`, duration);
    throw error;
  }
}

export async function monitoredGetAllAsync(
  db: any,
  sql: string,
  params: any[] = []
): Promise<any> {
  const startTime = Date.now();
  
  try {
    const results = await db.getAllAsync(sql, params);
    const duration = Date.now() - startTime;
    
    await performanceMonitor.logQuery(sql, duration, results.length);
    
    return results;
  } catch (error) {
    const duration = Date.now() - startTime;
    await performanceMonitor.logQuery(`ERROR: ${sql}`, duration);
    throw error;
  }
}
```

## Files to Create/Modify
- `frontend/database/config.ts` - Database configuration and manager
- `frontend/database/repository/BaseRepository.ts` - Generic repository pattern
- `frontend/database/repository/PatientRepository.ts` - Patient-specific repository
- `frontend/database/repository/ImmunizationRepository.ts` - Immunization records repository
- `frontend/database/repository/NotificationRepository.ts` - Notifications repository
- `frontend/database/repository/FacilityRepository.ts` - Facilities repository
- `frontend/database/repository/VaccineRepository.ts` - Vaccines repository
- `frontend/database/migrations/MigrationManager.ts` - Database migration system
- `frontend/database/backup/BackupManager.ts` - Backup and restore functionality
- `frontend/database/monitoring/PerformanceMonitor.ts` - Performance monitoring
- `frontend/types/database.ts` - Database-specific TypeScript types

## Testing Requirements

### Database Setup Testing
```typescript
// frontend/__tests__/database/config.test.ts
import { databaseManager } from '../../database/config';

describe('Database Configuration', () => {
  beforeEach(async () => {
    await databaseManager.initialize();
  });

  afterEach(async () => {
    await databaseManager.clearDatabase();
    await databaseManager.close();
  });

  it('should initialize database successfully', async () => {
    const db = await databaseManager.getDatabase();
    expect(db).toBeDefined();
  });

  it('should create all required tables', async () => {
    const db = await databaseManager.getDatabase();
    
    const tables = [
      'patients', 'immunization_records', 'notifications',
      'facilities', 'vaccines', 'vaccine_schedules',
      'vaccine_schedule_items', 'supplementary_immunizations',
      'sync_queue', 'conflict_resolution'
    ];

    for (const table of tables) {
      const [result] = await db.executeSql(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
        [table]
      );
      expect(result.rows.length).toBe(1);
    }
  });
});
```

### Repository Testing
```typescript
// frontend/__tests__/database/repository/PatientRepository.test.ts
import { patientRepository } from '../../../database/repository/PatientRepository';
import { databaseManager } from '../../../database/config';

describe('PatientRepository', () => {
  beforeEach(async () => {
    await databaseManager.initialize();
    await databaseManager.clearDatabase();
  });

  afterEach(async () => {
    await databaseManager.close();
  });

  it('should create a patient', async () => {
    const patientData = {
      fullName: 'Test Patient',
      sex: 'M' as const,
      dateOfBirth: '2020-01-01',
      district: 'Test District',
      facilityId: 'facility-1'
    };

    const patient = await patientRepository.create(patientData);
    
    expect(patient.id).toBeDefined();
    expect(patient.fullName).toBe('Test Patient');
    expect(patient.isDirty).toBe(true);
    expect(patient.version).toBe(1);
  });

  it('should find patient by id', async () => {
    const patientData = {
      fullName: 'Test Patient',
      sex: 'F' as const,
      dateOfBirth: '2020-01-01',
      district: 'Test District',
      facilityId: 'facility-1'
    };

    const created = await patientRepository.create(patientData);
    const found = await patientRepository.findById(created.id);
    
    expect(found).toBeDefined();
    expect(found!.fullName).toBe('Test Patient');
  });

  it('should update patient', async () => {
    const patientData = {
      fullName: 'Test Patient',
      sex: 'M' as const,
      dateOfBirth: '2020-01-01',
      district: 'Test District',
      facilityId: 'facility-1'
    };

    const created = await patientRepository.create(patientData);
    const updated = await patientRepository.update(created.id, {
      fullName: 'Updated Patient'
    });
    
    expect(updated.fullName).toBe('Updated Patient');
    expect(updated.version).toBe(2);
    expect(updated.isDirty).toBe(true);
  });

  it('should soft delete patient', async () => {
    const patientData = {
      fullName: 'Test Patient',
      sex: 'M' as const,
      dateOfBirth: '2020-01-01',
      district: 'Test District',
      facilityId: 'facility-1'
    };

    const created = await patientRepository.create(patientData);
    await patientRepository.delete(created.id);
    
    const found = await patientRepository.findById(created.id);
    expect(found).toBeNull();
  });

  it('should search patients by name', async () => {
    await patientRepository.create({
      fullName: 'John Doe',
      sex: 'M' as const,
      dateOfBirth: '2020-01-01',
      district: 'District 1',
      facilityId: 'facility-1'
    });

    await patientRepository.create({
      fullName: 'Jane Smith',
      sex: 'F' as const,
      dateOfBirth: '2020-01-01',
      district: 'District 1',
      facilityId: 'facility-1'
    });

    const results = await patientRepository.searchByName('John');
    expect(results.data.length).toBe(1);
    expect(results.data[0].fullName).toBe('John Doe');
  });
});
```

### Migration Testing
```typescript
// frontend/__tests__/database/migrations/MigrationManager.test.ts
import { migrationManager } from '../../../database/migrations/MigrationManager';
import { databaseManager } from '../../../database/config';

describe('MigrationManager', () => {
  beforeEach(async () => {
    await databaseManager.initialize();
  });

  afterEach(async () => {
    await databaseManager.close();
  });

  it('should run migrations in order', async () => {
    const testMigration = {
      version: 999,
      name: 'Test Migration',
      up: jest.fn().mockResolvedValue(undefined),
      down: jest.fn().mockResolvedValue(undefined)
    };

    migrationManager.registerMigration(testMigration);
    
    await migrationManager.migrate();
    
    expect(testMigration.up).toHaveBeenCalled();
    
    const currentVersion = await migrationManager.getCurrentVersion();
    expect(currentVersion).toBe(999);
  });
});
```

## Implementation Steps

### Phase 1: Database Setup (2 hours)
1. Install expo-sqlite and dependencies (`npx expo install expo-sqlite`)
2. Create database configuration and manager
3. Define database schemas for all entities
4. Implement table creation and indexing
5. Test basic database operations

### Phase 2: Repository Pattern (2 hours)
1. Create base repository class
2. Implement specific repositories for each entity
3. Add CRUD operations with sync metadata
4. Implement search and query functionality
5. Test repository operations

### Phase 3: Migration System (1 hour)
1. Create migration manager
2. Implement migration versioning
3. Add rollback functionality
4. Test migration system

### Phase 4: Advanced Features (2-3 hours)
1. Implement backup and restore
2. Add performance monitoring
3. Create database utilities and helpers
4. Implement data validation
5. Add error handling and logging

### Phase 5: Testing & Optimization (1 hour)
1. Write comprehensive tests
2. Performance testing and optimization
3. Memory usage optimization
4. Documentation and examples

## Success Metrics
- SQLite database successfully configured and operational
- All entity repositories implemented and tested
- CRUD operations working with proper sync metadata
- Migration system functional
- Backup and restore working correctly
- Performance monitoring providing useful insights
- All tests passing with good coverage
- Database operations performant on mobile devices

## Rollback Plan
- Keep existing data structures as fallback
- Implement gradual migration from current storage
- Maintain data export capabilities
- Document rollback procedures for each component

## Next Steps
After completion, this task enables:
- FE-AW-09: Data synchronization service implementation
- FE-AW-11: Patient services migration with offline support
- FE-AW-12: Immunization services migration with offline support
- FE-AW-13: Notification services migration with offline support