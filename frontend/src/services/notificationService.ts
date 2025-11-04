/**
 * Notification service for in-app notifications
 */

import { apiClient } from '@/lib/api';

export interface Notification {
  id: string;
  recipient_user_id: string;
  notification_type: string;
  channel: string;
  recipient_address: string;
  subject: string | null;
  message: string;
  status: string;
  sent_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  retry_count: number;
  max_retries: number;
  created_at: string;
  updated_at: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unread_count: number;
}

class NotificationService {
  /**
   * Get current user's notifications
   */
  async getNotifications(unreadOnly: boolean = false, limit: number = 50, offset: number = 0): Promise<NotificationListResponse> {
    const params = new URLSearchParams({
      unread_only: unreadOnly.toString(),
      limit: limit.toString(),
      offset: offset.toString(),
    });

    const response = await apiClient.get<NotificationListResponse>(`/notifications?${params.toString()}`);
    return response;
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<{ unread_count: number }>('/notifications/unread-count');
    return response.unread_count;
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    await apiClient.post(`/notifications/${notificationId}/read`);
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    await apiClient.post('/notifications/read-all');
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    await apiClient.delete(`/notifications/${notificationId}`);
  }

  /**
   * Poll for new notifications (called periodically)
   */
  async pollNotifications(): Promise<NotificationListResponse> {
    return this.getNotifications(true, 10, 0);
  }
}

export const notificationService = new NotificationService();
