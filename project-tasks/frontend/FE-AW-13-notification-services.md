# FE-AW-13: Migrate Notification Services to Appwrite with Offline Support

## Title
Migrate Notification Services to Appwrite with Offline Support

## Priority
Medium

## Estimated Time
5-7 hours

## Dependencies
- FE-AW-07: Appwrite SDK configuration completed
- FE-AW-08: Local SQLite database implemented
- FE-AW-09: Data synchronization service created
- FE-AW-10: Appwrite authentication context implemented
- FE-AW-11: Patient services migrated to Appwrite
- FE-AW-12: Immunization services migrated to Appwrite

## Description
Migrate the notification system to use Appwrite as the backend while maintaining full offline-first capabilities. This includes creating, reading, updating, and managing notifications with automatic synchronization, push notification integration, and comprehensive notification management features.

The migration will ensure healthcare workers can receive and manage notifications even without internet connectivity, with all data automatically syncing when connection is restored.

## Acceptance Criteria
- [ ] Notification service migrated to use Appwrite backend
- [ ] Full CRUD operations working offline and online
- [ ] Push notification integration with Appwrite messaging
- [ ] Local notification scheduling and management
- [ ] Notification categories and priority levels
- [ ] Read/unread status tracking
- [ ] Bulk notification operations
- [ ] Search and filtering capabilities
- [ ] Notification templates and customization
- [ ] Due immunization reminder notifications
- [ ] System and user-generated notifications
- [ ] Conflict resolution for notification states
- [ ] Performance optimization for large notification lists
- [ ] Comprehensive error handling and user feedback

## Technical Implementation

### Enhanced Notification Service with Appwrite Integration
```typescript
// frontend/services/notification/NotificationService.ts
import { Databases, Messaging, ID, Query } from 'react-native-appwrite';
import { appwriteClient } from '../../config/appwrite';
import { syncService } from '../sync/SyncService';
import { notificationRepository } from '../../database/repository/NotificationRepository';
import { patientService } from '../patient/PatientService';
import { immunizationService } from '../immunization/ImmunizationService';
import NetInfo from '@react-native-community/netinfo';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationRecord {
  id: string;
  appwriteId?: string;
  type: 'immunization_due' | 'immunization_overdue' | 'system' | 'reminder' | 'alert';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  patientId?: string;
  patientName?: string;
  vaccineId?: string;
  vaccineName?: string;
  facilityId: string;
  userId?: string;
  isRead: boolean;
  isArchived: boolean;
  scheduledFor?: string;
  expiresAt?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
  lastModified: number;
  version: number;
  isDirty: boolean;
  isDeleted: boolean;
}

export interface NotificationTemplate {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  variables: string[];
  isActive: boolean;
}

export interface NotificationSearchFilters {
  type?: string;
  priority?: string;
  isRead?: boolean;
  isArchived?: boolean;
  patientId?: string;
  facilityId?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface NotificationListOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  filters?: NotificationSearchFilters;
}

export interface NotificationListResult {
  notifications: NotificationRecord[];
  total: number;
  hasMore: boolean;
  unreadCount: number;
}

export interface BulkNotificationOperation {
  notificationIds: string[];
  operation: 'mark_read' | 'mark_unread' | 'archive' | 'delete';
}

class NotificationService {
  private databases: Databases;
  private messaging: Messaging;
  private readonly collectionId = 'notifications';
  private readonly templatesCollectionId = 'notification_templates';
  private notificationListeners: ((notification: NotificationRecord) => void)[] = [];

  constructor() {
    this.databases = appwriteClient.databases;
    this.messaging = appwriteClient.messaging;
    this.setupNotificationHandlers();
  }

  async initialize(): Promise<void> {
    try {
      // Configure local notifications
      await Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // Request notification permissions
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Notification permissions not granted');
      }

      // Register for push notifications if online
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected) {
        await this.registerForPushNotifications();
      }

      console.log('Notification service initialized');
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  async createNotification(notificationData: Omit<NotificationRecord, 'id' | 'createdAt' | 'updatedAt' | 'lastModified' | 'version' | 'isDirty' | 'isDeleted' | 'appwriteId'>): Promise<NotificationRecord> {
    const id = ID.unique();
    const now = Date.now();
    
    const notification: NotificationRecord = {
      id,
      ...notificationData,
      isRead: false,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      lastModified: now,
      version: 1,
      isDirty: true,
      isDeleted: false
    };

    try {
      // Always save to local database first (offline-first approach)
      const localNotification = await notificationRepository.create(notification);

      // Schedule local notification if needed
      if (notification.scheduledFor) {
        await this.scheduleLocalNotification(localNotification);
      }

      // Try to sync to Appwrite if online
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected) {
        try {
          await this.syncNotificationToAppwrite(localNotification);
        } catch (error) {
          console.warn('Failed to sync notification to Appwrite, will retry later:', error);
        }
      }

      // Notify listeners
      this.notifyListeners(localNotification);

      return localNotification;
    } catch (error) {
      console.error('Failed to create notification:', error);
      throw new Error('Failed to create notification. Please try again.');
    }
  }

  async getNotification(id: string): Promise<NotificationRecord | null> {
    try {
      // Always try local database first
      const localNotification = await notificationRepository.findById(id);
      
      if (localNotification) {
        return localNotification;
      }

      // If not found locally and we're online, try Appwrite
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected) {
        try {
          const appwriteNotification = await this.getNotificationFromAppwrite(id);
          if (appwriteNotification) {
            // Save to local database for offline access
            await notificationRepository.create(appwriteNotification);
            return appwriteNotification;
          }
        } catch (error) {
          console.warn('Failed to fetch notification from Appwrite:', error);
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to get notification:', error);
      throw new Error('Failed to retrieve notification.');
    }
  }

  async updateNotification(id: string, updates: Partial<NotificationRecord>): Promise<NotificationRecord> {
    try {
      // Update local database first (optimistic update)
      const updatedNotification = await notificationRepository.update(id, {
        ...updates,
        lastModified: Date.now(),
        isDirty: true
      });

      // Try to sync to Appwrite if online
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected) {
        try {
          await this.syncNotificationToAppwrite(updatedNotification);
        } catch (error) {
          console.warn('Failed to sync notification update to Appwrite, will retry later:', error);
        }
      }

      // Notify listeners
      this.notifyListeners(updatedNotification);

      return updatedNotification;
    } catch (error) {
      console.error('Failed to update notification:', error);
      throw new Error('Failed to update notification. Please try again.');
    }
  }

  async deleteNotification(id: string): Promise<void> {
    try {
      // Soft delete in local database
      await notificationRepository.delete(id);

      // Cancel local notification if scheduled
      await this.cancelLocalNotification(id);

      // Try to sync deletion to Appwrite if online
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected) {
        try {
          const notification = await notificationRepository.findById(id);
          if (notification?.appwriteId) {
            await this.databases.deleteDocument(
              appwriteClient.getConfig().databaseId,
              this.collectionId,
              notification.appwriteId
            );
          }
        } catch (error) {
          console.warn('Failed to sync notification deletion to Appwrite, will retry later:', error);
        }
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw new Error('Failed to delete notification. Please try again.');
    }
  }

  async getNotifications(options: NotificationListOptions = {}): Promise<NotificationListResult> {
    const { limit = 50, offset = 0, orderBy = 'createdAt', orderDirection = 'DESC', filters } = options;

    try {
      // Get from local database first
      const localResult = await this.getNotificationsFromLocal(options);

      // Calculate unread count
      const unreadCount = await this.getUnreadCount(filters?.facilityId, filters?.userId);

      // If we have local data or we're offline, return it
      const netInfo = await NetInfo.fetch();
      if (localResult.notifications.length > 0 || !netInfo.isConnected) {
        return {
          ...localResult,
          unreadCount
        };
      }

      // If no local data and we're online, try to fetch from Appwrite
      try {
        const appwriteResult = await this.getNotificationsFromAppwrite(options);
        
        // Save fetched notifications to local database
        for (const notification of appwriteResult.notifications) {
          try {
            await notificationRepository.create(notification);
          } catch (error) {
            // Notification might already exist, try to update
            if (notification.id) {
              await notificationRepository.update(notification.id, notification);
            }
          }
        }

        return {
          ...appwriteResult,
          unreadCount
        };
      } catch (error) {
        console.warn('Failed to fetch notifications from Appwrite:', error);
        return {
          ...localResult,
          unreadCount
        };
      }
    } catch (error) {
      console.error('Failed to get notifications:', error);
      throw new Error('Failed to retrieve notifications.');
    }
  }

  async markAsRead(id: string): Promise<NotificationRecord> {
    return await this.updateNotification(id, { isRead: true });
  }

  async markAsUnread(id: string): Promise<NotificationRecord> {
    return await this.updateNotification(id, { isRead: false });
  }

  async archiveNotification(id: string): Promise<NotificationRecord> {
    return await this.updateNotification(id, { isArchived: true });
  }

  async unarchiveNotification(id: string): Promise<NotificationRecord> {
    return await this.updateNotification(id, { isArchived: false });
  }

  async performBulkOperation(operation: BulkNotificationOperation): Promise<void> {
    const { notificationIds, operation: op } = operation;

    try {
      const updates: Partial<NotificationRecord> = {};
      
      switch (op) {
        case 'mark_read':
          updates.isRead = true;
          break;
        case 'mark_unread':
          updates.isRead = false;
          break;
        case 'archive':
          updates.isArchived = true;
          break;
        case 'delete':
          // Handle deletion separately
          for (const id of notificationIds) {
            await this.deleteNotification(id);
          }
          return;
      }

      // Update all notifications
      for (const id of notificationIds) {
        await this.updateNotification(id, updates);
      }
    } catch (error) {
      console.error('Failed to perform bulk operation:', error);
      throw new Error('Failed to perform bulk operation. Please try again.');
    }
  }

  async searchNotifications(query: string, filters: NotificationSearchFilters = {}): Promise<NotificationRecord[]> {
    try {
      // Search in local database first
      const searchFields = ['title', 'message', 'patientName', 'vaccineName'];
      const localResults = await notificationRepository.search(query, searchFields, {
        limit: 100,
        where: this.buildWhereClause(filters)
      });

      // If we have results or we're offline, return them
      const netInfo = await NetInfo.fetch();
      if (localResults.data.length > 0 || !netInfo.isConnected) {
        return localResults.data;
      }

      // If no local results and we're online, search Appwrite
      try {
        const appwriteResults = await this.searchNotificationsInAppwrite(query, filters);
        
        // Save search results to local database
        for (const notification of appwriteResults) {
          try {
            await notificationRepository.create(notification);
          } catch (error) {
            // Notification might already exist
            if (notification.id) {
              await notificationRepository.update(notification.id, notification);
            }
          }
        }

        return appwriteResults;
      } catch (error) {
        console.warn('Failed to search notifications in Appwrite:', error);
        return localResults.data;
      }
    } catch (error) {
      console.error('Failed to search notifications:', error);
      throw new Error('Failed to search notifications.');
    }
  }

  async createDueImmunizationNotifications(facilityId: string): Promise<NotificationRecord[]> {
    try {
      const dueImmunizations = await immunizationService.getDueImmunizations(facilityId);
      const createdNotifications: NotificationRecord[] = [];

      for (const due of dueImmunizations) {
        // Check if notification already exists
        const existingNotifications = await this.getNotifications({
          filters: {
            type: due.isOverdue ? 'immunization_overdue' : 'immunization_due',
            patientId: due.patientId,
            vaccineId: due.vaccineId
          }
        });

        if (existingNotifications.notifications.length === 0) {
          const notification = await this.createNotification({
            type: due.isOverdue ? 'immunization_overdue' : 'immunization_due',
            priority: due.isOverdue ? 'high' : 'medium',
            title: due.isOverdue ? 'Overdue Immunization' : 'Due Immunization',
            message: `${due.patientName} is ${due.isOverdue ? 'overdue' : 'due'} for ${due.vaccineName} (Dose ${due.doseNumber})`,
            patientId: due.patientId,
            patientName: due.patientName,
            vaccineId: due.vaccineId,
            vaccineName: due.vaccineName,
            facilityId,
            scheduledFor: due.dueDate,
            metadata: {
              doseNumber: due.doseNumber,
              daysPastDue: due.daysPastDue
            }
          });

          createdNotifications.push(notification);
        }
      }

      return createdNotifications;
    } catch (error) {
      console.error('Failed to create due immunization notifications:', error);
      throw new Error('Failed to create due immunization notifications.');
    }
  }

  async sendPushNotification(notification: NotificationRecord): Promise<void> {
    try {
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        console.warn('Cannot send push notification while offline');
        return;
      }

      // Send via Appwrite messaging
      await this.messaging.createPush(
        ID.unique(),
        notification.title,
        notification.message,
        [], // topics
        [], // users - would need to be populated based on facility/user targeting
        [], // targets
        notification.actionUrl,
        undefined, // icon
        undefined, // sound
        undefined, // color
        undefined, // tag
        undefined, // badge
        notification.scheduledFor ? new Date(notification.scheduledFor) : undefined
      );
    } catch (error) {
      console.error('Failed to send push notification:', error);
      // Don't throw here as this is a secondary operation
    }
  }

  private async scheduleLocalNotification(notification: NotificationRecord): Promise<void> {
    try {
      if (!notification.scheduledFor) return;

      const scheduledDate = new Date(notification.scheduledFor);
      const now = new Date();

      if (scheduledDate <= now) {
        // Show immediately
        await Notifications.scheduleNotificationAsync({
          content: {
            title: notification.title,
            body: notification.message,
            data: {
              notificationId: notification.id,
              actionUrl: notification.actionUrl
            },
          },
          trigger: null, // Show immediately
        });
      } else {
        // Schedule for later
        await Notifications.scheduleNotificationAsync({
          content: {
            title: notification.title,
            body: notification.message,
            data: {
              notificationId: notification.id,
              actionUrl: notification.actionUrl
            },
          },
          trigger: {
            date: scheduledDate,
          },
          identifier: notification.id,
        });
      }
    } catch (error) {
      console.error('Failed to schedule local notification:', error);
    }
  }

  private async cancelLocalNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Failed to cancel local notification:', error);
    }
  }

  private async registerForPushNotifications(): Promise<void> {
    try {
      const token = await Notifications.getExpoPushTokenAsync();
      
      // Store token for user targeting
      await AsyncStorage.setItem('expo_push_token', token.data);
      
      console.log('Push notification token:', token.data);
    } catch (error) {
      console.error('Failed to register for push notifications:', error);
    }
  }

  private setupNotificationHandlers(): void {
    // Handle notification received while app is in foreground
    Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Handle notification response (user tapped notification)
    Notifications.addNotificationResponseReceivedListener(response => {
      const notificationId = response.notification.request.content.data?.notificationId;
      const actionUrl = response.notification.request.content.data?.actionUrl;
      
      if (notificationId) {
        // Mark as read
        this.markAsRead(notificationId).catch(console.error);
      }
      
      if (actionUrl) {
        // Handle navigation to specific screen
        console.log('Navigate to:', actionUrl);
      }
    });
  }

  private async syncNotificationToAppwrite(notification: NotificationRecord): Promise<void> {
    try {
      const appwriteData = this.transformToAppwriteFormat(notification);

      if (notification.appwriteId) {
        // Update existing document
        await this.databases.updateDocument(
          appwriteClient.getConfig().databaseId,
          this.collectionId,
          notification.appwriteId,
          appwriteData
        );
      } else {
        // Create new document
        const result = await this.databases.createDocument(
          appwriteClient.getConfig().databaseId,
          this.collectionId,
          notification.id,
          appwriteData
        );

        // Update local record with Appwrite ID
        await notificationRepository.markAsSynced(notification.id, result.$id);
      }
    } catch (error) {
      console.error('Failed to sync notification to Appwrite:', error);
      throw error;
    }
  }

  private async getNotificationFromAppwrite(id: string): Promise<NotificationRecord | null> {
    try {
      const document = await this.databases.getDocument(
        appwriteClient.getConfig().databaseId,
        this.collectionId,
        id
      );

      return this.transformFromAppwriteFormat(document);
    } catch (error) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  private async getNotificationsFromLocal(options: NotificationListOptions): Promise<Omit<NotificationListResult, 'unreadCount'>> {
    const { limit = 50, offset = 0, orderBy = 'createdAt', orderDirection = 'DESC', filters } = options;

    const result = await notificationRepository.findAll({
      limit,
      offset,
      orderBy,
      orderDirection,
      where: this.buildWhereClause(filters)
    });

    return {
      notifications: result.data,
      total: result.total,
      hasMore: result.hasMore
    };
  }

  private async getNotificationsFromAppwrite(options: NotificationListOptions): Promise<Omit<NotificationListResult, 'unreadCount'>> {
    const { limit = 50, offset = 0, orderBy = 'createdAt', orderDirection = 'DESC', filters } = options;

    const queries = [
      Query.limit(limit),
      Query.offset(offset),
      Query.orderAsc(orderBy)
    ];

    if (orderDirection === 'DESC') {
      queries[queries.length - 1] = Query.orderDesc(orderBy);
    }

    // Add filters
    if (filters) {
      if (filters.type) {
        queries.push(Query.equal('type', filters.type));
      }
      if (filters.priority) {
        queries.push(Query.equal('priority', filters.priority));
      }
      if (filters.facilityId) {
        queries.push(Query.equal('facilityId', filters.facilityId));
      }
      if (filters.userId) {
        queries.push(Query.equal('userId', filters.userId));
      }
      if (filters.isRead !== undefined) {
        queries.push(Query.equal('isRead', filters.isRead));
      }
      if (filters.isArchived !== undefined) {
        queries.push(Query.equal('isArchived', filters.isArchived));
      }
    }

    const response = await this.databases.listDocuments(
      appwriteClient.getConfig().databaseId,
      this.collectionId,
      queries
    );

    const notifications = response.documents.map(doc => this.transformFromAppwriteFormat(doc));

    return {
      notifications,
      total: response.total,
      hasMore: offset + notifications.length < response.total
    };
  }

  private async searchNotificationsInAppwrite(query: string, filters: NotificationSearchFilters): Promise<NotificationRecord[]> {
    const queries = [
      Query.search('title', query),
      Query.limit(100)
    ];

    // Add filters
    if (filters.type) {
      queries.push(Query.equal('type', filters.type));
    }
    if (filters.facilityId) {
      queries.push(Query.equal('facilityId', filters.facilityId));
    }

    const response = await this.databases.listDocuments(
      appwriteClient.getConfig().databaseId,
      this.collectionId,
      queries
    );

    return response.documents.map(doc => this.transformFromAppwriteFormat(doc));
  }

  private async getUnreadCount(facilityId?: string, userId?: string): Promise<number> {
    try {
      const filters: Record<string, any> = { isRead: 0, isArchived: 0 };
      
      if (facilityId) {
        filters.facilityId = facilityId;
      }
      if (userId) {
        filters.userId = userId;
      }

      const result = await notificationRepository.findAll({
        limit: 1,
        where: filters
      });

      return result.total;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  private buildWhereClause(filters?: NotificationSearchFilters): Record<string, any> {
    const where: Record<string, any> = {};

    if (filters) {
      if (filters.type) {
        where.type = filters.type;
      }
      if (filters.priority) {
        where.priority = filters.priority;
      }
      if (filters.facilityId) {
        where.facilityId = filters.facilityId;
      }
      if (filters.userId) {
        where.userId = filters.userId;
      }
      if (filters.patientId) {
        where.patientId = filters.patientId;
      }
      if (filters.isRead !== undefined) {
        where.isRead = filters.isRead ? 1 : 0;
      }
      if (filters.isArchived !== undefined) {
        where.isArchived = filters.isArchived ? 1 : 0;
      }
    }

    return where;
  }

  private transformToAppwriteFormat(notification: NotificationRecord): any {
    return {
      type: notification.type,
      priority: notification.priority,
      title: notification.title,
      message: notification.message,
      patientId: notification.patientId,
      patientName: notification.patientName,
      vaccineId: notification.vaccineId,
      vaccineName: notification.vaccineName,
      facilityId: notification.facilityId,
      userId: notification.userId,
      isRead: notification.isRead,
      isArchived: notification.isArchived,
      scheduledFor: notification.scheduledFor,
      expiresAt: notification.expiresAt,
      actionUrl: notification.actionUrl,
      metadata: notification.metadata ? JSON.stringify(notification.metadata) : null
    };
  }

  private transformFromAppwriteFormat(document: any): NotificationRecord {
    return {
      id: document.$id,
      appwriteId: document.$id,
      type: document.type,
      priority: document.priority,
      title: document.title,
      message: document.message,
      patientId: document.patientId,
      patientName: document.patientName,
      vaccineId: document.vaccineId,
      vaccineName: document.vaccineName,
      facilityId: document.facilityId,
      userId: document.userId,
      isRead: document.isRead,
      isArchived: document.isArchived,
      scheduledFor: document.scheduledFor,
      expiresAt: document.expiresAt,
      actionUrl: document.actionUrl,
      metadata: document.metadata ? JSON.parse(document.metadata) : undefined,
      createdAt: new Date(document.$createdAt).getTime(),
      updatedAt: new Date(document.$updatedAt).getTime(),
      lastModified: new Date(document.$updatedAt).getTime(),
      version: 1,
      isDirty: false,
      isDeleted: false
    };
  }

  private notifyListeners(notification: NotificationRecord): void {
    this.notificationListeners.forEach(listener => {
      try {
        listener(notification);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  public onNotificationReceived(listener: (notification: NotificationRecord) => void): () => void {
    this.notificationListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.notificationListeners.indexOf(listener);
      if (index > -1) {
        this.notificationListeners.splice(index, 1);
      }
    };
  }
}

export const notificationService = new NotificationService();
```

### Notification Hook with Offline Support
```typescript
// frontend/hooks/useNotifications.ts
import { useState, useEffect } from 'react';
import { 
  notificationService, 
  NotificationRecord, 
  NotificationListOptions, 
  NotificationSearchFilters,
  BulkNotificationOperation
} from '../services/notification/NotificationService';
import { useAuth } from '../context/auth';
import NetInfo from '@react-native-community/netinfo';

export const useNotifications = (options: NotificationListOptions = {}) => {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [options.filters, options.orderBy, options.orderDirection]);

  useEffect(() => {
    // Listen for new notifications
    const unsubscribe = notificationService.onNotificationReceived((notification) => {
      setNotifications(prev => [notification, ...prev]);
      setTotal(prev => prev + 1);
      if (!notification.isRead) {
        setUnreadCount(prev => prev + 1);
      }
    });

    return unsubscribe;
  }, []);

  const loadNotifications = async (reset = true) => {
    try {
      setLoading(true);
      setError(null);

      const currentOptions = reset ? options : {
        ...options,
        offset: notifications.length
      };

      const result = await notificationService.getNotifications(currentOptions);
      
      if (reset) {
        setNotifications(result.notifications);
      } else {
        setNotifications(prev => [...prev, ...result.notifications]);
      }
      
      setHasMore(result.hasMore);
      setTotal(result.total);
      setUnreadCount(result.unreadCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false
backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: '#dc3545',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  offlineText: {
    color: '#dc3545',
    fontSize: 12,
    marginLeft: 4,
  },
  refreshButton: {
    padding: 8,
  },
  selectionToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  toolbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  toolbarButtonText: {
    marginLeft: 4,
    color: '#6c757d',
  },
  selectionCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  toolbarActions: {
    flexDirection: 'row',
  },
  listContainer: {
    paddingBottom: 16,
  },
  notificationItem: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  selectedItem: {
    backgroundColor: '#e3f2fd',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  notificationType: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  notificationActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007bff',
    marginRight: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: 'bold',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
    lineHeight: 20,
  },
  patientName: {
    fontSize: 12,
    color: '#007bff',
    marginBottom: 8,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 12,
    color: '#6c757d',
  },
  quickActions: {
    flexDirection: 'row',
  },
  quickAction: {
    padding: 4,
    marginLeft: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 16,
  },
});
```

## Files to Create/Modify
- `frontend/services/notification/NotificationService.ts` - Enhanced notification service with Appwrite integration
- `frontend/hooks/useNotifications.ts` - React hooks for notification operations
- `frontend/components/notification/EnhancedNotificationList.tsx` - Enhanced notification list component
- `frontend/components/notification/NotificationBadge.tsx` - Notification badge component
- `frontend/utils/notificationHelpers.ts` - Notification utility functions
- `frontend/types/notification.ts` - Updated TypeScript types

## Testing Requirements

### Notification Service Testing
```typescript
// frontend/__tests__/services/notification/NotificationService.test.ts
import { notificationService } from '../../../services/notification/NotificationService';
import { notificationRepository } from '../../../database/repository/NotificationRepository';

describe('NotificationService', () => {
  beforeEach(async () => {
    await notificationRepository.clearAll();
  });

  it('should create notification offline-first', async () => {
    const notificationData = {
      type: 'immunization_due' as const,
      priority: 'medium' as const,
      title: 'Immunization Due',
      message: 'Patient needs BCG vaccine',
      patientId: 'patient-1',
      facilityId: 'facility-1'
    };

    const notification = await notificationService.createNotification(notificationData);
    
    expect(notification).toBeDefined();
    expect(notification.type).toBe('immunization_due');
    expect(notification.isDirty).toBe(true);
  });

  it('should mark notification as read', async () => {
    const notification = await notificationService.createNotification({
      type: 'system' as const,
      priority: 'low' as const,
      title: 'Test Notification',
      message: 'Test message',
      facilityId: 'facility-1'
    });

    const updatedNotification = await notificationService.markAsRead(notification.id);
    
    expect(updatedNotification.isRead).toBe(true);
  });

  it('should perform bulk operations', async () => {
    const notifications = await Promise.all([
      notificationService.createNotification({
        type: 'system' as const,
        priority: 'low' as const,
        title: 'Test 1',
        message: 'Message 1',
        facilityId: 'facility-1'
      }),
      notificationService.createNotification({
        type: 'system' as const,
        priority: 'low' as const,
        title: 'Test 2',
        message: 'Message 2',
        facilityId: 'facility-1'
      })
    ]);

    await notificationService.performBulkOperation({
      notificationIds: notifications.map(n => n.id),
      operation: 'mark_read'
    });

    const result = await notificationService.getNotifications();
    expect(result.notifications.every(n => n.isRead)).toBe(true);
  });
});
```

### Push Notification Testing
```typescript
// frontend/__tests__/services/notification/PushNotification.test.ts
describe('Push Notifications', () => {
  it('should schedule local notification', async () => {
    const notification = await notificationService.createNotification({
      type: 'reminder' as const,
      priority: 'medium' as const,
      title: 'Reminder',
      message: 'Don\'t forget your appointment',
      facilityId: 'facility-1',
      scheduledFor: new Date(Date.now() + 60000).toISOString() // 1 minute from now
    });

    expect(notification.scheduledFor).toBeDefined();
  });

  it('should handle notification permissions', async () => {
    await notificationService.initialize();
    
    // Test would verify permission request was made
    expect(true).toBe(true); // Placeholder
  });
});
```

### Notification Hook Testing
```typescript
// frontend/__tests__/hooks/useNotifications.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { useNotifications } from '../../../hooks/useNotifications';

describe('useNotifications', () => {
  it('should load notifications', async () => {
    const { result } = renderHook(() => useNotifications());
    
    expect(result.current.loading).toBe(true);
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    expect(result.current.loading).toBe(false);
    expect(result.current.notifications).toBeDefined();
  });

  it('should update unread count when marking as read', async () => {
    const { result } = renderHook(() => useNotifications());
    
    // Create unread notification
    await act(async () => {
      await notificationService.createNotification({
        type: 'system' as const,
        priority: 'low' as const,
        title: 'Test',
        message: 'Test message',
        facilityId: 'facility-1'
      });
    });
    
    const initialUnreadCount = result.current.unreadCount;
    
    // Mark as read
    await act(async () => {
      if (result.current.notifications.length > 0) {
        await result.current.markAsRead(result.current.notifications[0].id);
      }
    });
    
    expect(result.current.unreadCount).toBe(initialUnreadCount - 1);
  });
});
```

## Implementation Steps

### Phase 1: Core Service Migration (2.5 hours)
1. Implement NotificationService with Appwrite integration
2. Add offline-first CRUD operations
3. Implement push notification setup
4. Test basic notification operations

### Phase 2: Advanced Features (2 hours)
1. Add bulk operations and search functionality
2. Implement due immunization notification generation
3. Add local notification scheduling
4. Test advanced features

### Phase 3: React Integration (1.5 hours)
1. Create notification hooks
2. Update existing components to use new service
3. Add enhanced notification list component
4. Test React integration

### Phase 4: Testing & Optimization (1 hour)
1. Write comprehensive tests
2. Optimize performance for large notification lists
3. Add error handling and user feedback
4. Test offline scenarios and push notifications

## Success Metrics
- Notification CRUD operations working offline and online
- Push notifications functioning correctly
- Local notification scheduling working
- Bulk operations performing efficiently
- Search and filtering working correctly
- Due immunization notifications generating automatically
- All tests passing
- Performance acceptable on mobile devices
- User experience seamless during network transitions

## Rollback Plan
- Keep existing notification service as fallback
- Implement feature flags for gradual migration
- Maintain data compatibility between old and new systems
- Document rollback procedures

## Next Steps
After completion, this task enables:
- FE-AW-14: Offline indicators and conflict resolution UI
- Full notification management with offline-first capabilities
- Enhanced user engagement through push notifications
- Automated immunization reminder system