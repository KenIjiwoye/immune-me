import { DatabaseService } from './appwriteDatabase';
import { COLLECTION_IDS } from './appwrite';
import { Query } from 'react-native-appwrite';
import type { Notification } from '../types/appwrite';

/**
 * Notifications Service
 * Handles all notification-related database operations
 */
export class NotificationsService extends DatabaseService<Notification> {
  constructor() {
    super(COLLECTION_IDS.NOTIFICATIONS);
  }

  /**
   * Get notifications by recipient
   */
  async getByRecipient(recipientId: string, limit: number = 50): Promise<Notification[]> {
    const result = await this.list({
      queries: [
        Query.equal('recipient_id', recipientId),
        Query.orderDesc('$createdAt'),
      ],
      limit,
    });
    return result.documents;
  }

  /**
   * Get unread notifications for recipient
   */
  async getUnread(recipientId: string): Promise<Notification[]> {
    const result = await this.list({
      queries: [
        Query.equal('recipient_id', recipientId),
        Query.equal('is_read', false),
        Query.orderDesc('$createdAt'),
      ],
    });
    return result.documents;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<Notification> {
    return this.update(notificationId, { is_read: true });
  }

  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(notificationIds: string[]): Promise<Notification[]> {
    const results = await Promise.allSettled(
      notificationIds.map(id => this.markAsRead(id))
    );

    return results
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<Notification>).value);
  }

  /**
   * Get notifications by facility
   */
  async getByFacility(facilityId: string, limit: number = 50): Promise<Notification[]> {
    const result = await this.list({
      queries: [
        Query.equal('facility_id', facilityId),
        Query.orderDesc('$createdAt'),
      ],
      limit,
    });
    return result.documents;
  }

  /**
   * Get notifications by priority
   */
  async getByPriority(priority: string, limit: number = 25): Promise<Notification[]> {
    const result = await this.list({
      queries: [
        Query.equal('priority', priority),
        Query.orderDesc('$createdAt'),
      ],
      limit,
    });
    return result.documents;
  }

  /**
   * Get notifications by type
   */
  async getByType(type: string, limit: number = 50): Promise<Notification[]> {
    const result = await this.list({
      queries: [
        Query.equal('type', type),
        Query.orderDesc('$createdAt'),
      ],
      limit,
    });
    return result.documents;
  }

  /**
   * Get notifications by date range
   */
  async getByDateRange(startDate: string, endDate: string, recipientId?: string): Promise<Notification[]> {
    const queries = [
      Query.greaterThanEqual('$createdAt', startDate),
      Query.lessThanEqual('$createdAt', endDate),
      Query.orderDesc('$createdAt'),
    ];

    if (recipientId) {
      queries.push(Query.equal('recipient_id', recipientId));
    }

    const result = await this.list({ queries });
    return result.documents;
  }

  /**
   * Get unread count for recipient
   */
  async getUnreadCount(recipientId: string): Promise<number> {
    return this.count([
      Query.equal('recipient_id', recipientId),
      Query.equal('is_read', false),
    ]);
  }
}

// Export service instance
export const notificationsService = new NotificationsService();