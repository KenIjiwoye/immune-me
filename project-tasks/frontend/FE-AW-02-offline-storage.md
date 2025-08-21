# FE-AW-02: Implement Offline-First Data Storage and Caching

## Title
Implement Offline-First Data Storage and Caching

## Priority
High

## Estimated Time
8-10 hours

## Dependencies
- FE-AW-01: Appwrite SDK integrated
- BE-AW-06: Data sync functions created

## Description
Implement comprehensive offline-first data storage and caching system for the React Native application. This includes local database setup using SQLite, data synchronization queues, conflict resolution on the client side, and intelligent caching strategies to ensure the app functions seamlessly even without internet connectivity.

The implementation will provide a robust offline experience for healthcare workers in areas with poor connectivity while maintaining data integrity and synchronization when connectivity is restored.

## Acceptance Criteria
- [ ] SQLite database configured for offline storage
- [ ] Local data models and schemas implemented
- [ ] Offline CRUD operations functional for all entities
- [ ] Data synchronization queue implemented
- [ ] Conflict resolution logic on client side
- [ ] Cache management and invalidation strategies
- [ ] Offline indicators and status management
- [ ] Data compression and optimization
- [ ] Background sync when connectivity restored
- [ ] Offline data persistence across app restarts

## Technical Notes

### Local Database Setup

#### SQLite Configuration
```typescript
// frontend/services/database/sqlite.ts
import SQLite from 'react-native-sqlite-storage';
import { Patient, ImmunizationRecord, Notification, Facility, Vaccine } from '../types/appwrite';

SQLite.DEBUG(true);
SQLite.enablePromise(true);

export interface LocalDatabase {
  db: SQLite.SQLiteDatabase;
  isReady: boolean;
}

class SQLiteService {
  private database: SQLite.SQLiteDatabase | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.database = await SQLite.openDatabase({
        name: 'immune_me_offline.db',
        location: 'default',
        createFromLocation: '~immune_me_offline.db'
      });

      await this.createTables();
      this.isInitialized = true;
      console.log('SQLite database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SQLite database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.database) throw new Error('Database not initialized');

    const tables = [
      // Patients table
      `CREATE TABLE IF NOT EXISTS patients (
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
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'conflict')),
        last_sync_at TEXT,
        is_deleted INTEGER DEFAULT 0
      )`,

      // Immunization records table
      `CREATE TABLE IF NOT EXISTS immunization_records (
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
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sync_status TEXT DEFAULT 'synced',
        last_sync_at TEXT,
        is_deleted INTEGER DEFAULT 0,
        FOREIGN KEY (patient_id) REFERENCES patients (id)
      )`,

      // Notifications table
      `CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        vaccine_id TEXT NOT NULL,
        facility_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('due', 'overdue', 'reminder')),
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'completed')),
        due_date TEXT NOT NULL,
        message TEXT,
        priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sync_status TEXT DEFAULT 'synced',
        last_sync_at TEXT,
        is_deleted INTEGER DEFAULT 0,
        FOREIGN KEY (patient_id) REFERENCES patients (id)
      )`,

      // Facilities table
      `CREATE TABLE IF NOT EXISTS facilities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('hospital', 'clinic', 'health_center', 'outreach_post')),
        district TEXT NOT NULL,