'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationService, Notification } from '@/services/notificationService';
import { initializePushNotifications, isPushSupported } from '@/services/pushService';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  pushEnabled: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  showToast: (notification: Notification) => void;
  dismissToast: (notificationId: string) => void;
  enablePushNotifications: () => Promise<boolean>;
  toasts: Notification[];
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [toasts, setToasts] = useState<Notification[]>([]);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushInitialized, setPushInitialized] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const response = await notificationService.getNotifications(false, 50, 0);
      setNotifications(response.notifications);
      setUnreadCount(response.unread_count);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const enablePushNotifications = useCallback(async () => {
    if (!isPushSupported()) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Push notifications not supported');
      }
      return false;
    }

    try {
      const success = await initializePushNotifications();
      setPushEnabled(success);
      return success;
    } catch (error) {
      console.error('Failed to enable push notifications:', error);
      return false;
    }
  }, []);

  const pollForNewNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const response = await notificationService.pollNotifications();

      // Check if there are any new unread notifications
      const newNotifications = response.notifications.filter(
        (notif) => !notifications.find((n) => n.id === notif.id)
      );

      if (newNotifications.length > 0) {
        // Show toast for new notifications
        newNotifications.forEach((notif) => showToast(notif));

        // Update notifications list
        setNotifications((prev) => [...newNotifications, ...prev]);
        setUnreadCount(response.unread_count);
      } else if (response.unread_count !== unreadCount) {
        // Just update the count if it changed
        setUnreadCount(response.unread_count);
      }
    } catch (error) {
      console.error('Failed to poll notifications:', error);
    }
  }, [user, notifications, unreadCount]);

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, status: 'delivered' } : notif
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, status: 'delivered' }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
      setUnreadCount((prev) => {
        const notif = notifications.find((n) => n.id === notificationId);
        return notif?.status === 'pending' ? Math.max(0, prev - 1) : prev;
      });
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const showToast = (notification: Notification) => {
    setToasts((prev) => [...prev, notification]);

    // Auto-dismiss after 5 seconds (10 seconds for emergencies)
    const dismissTime = notification.notification_type === 'emergency_alert' ? 10000 : 5000;
    setTimeout(() => {
      dismissToast(notification.id);
    }, dismissTime);
  };

  const dismissToast = (notificationId: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== notificationId));
  };

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  // Initialize push notifications when user logs in
  useEffect(() => {
    if (user && !pushInitialized && isPushSupported()) {
      setPushInitialized(true);
      
      // Delay push prompt by 3 seconds to not overwhelm user
      setTimeout(async () => {
        const success = await enablePushNotifications();
        if (success) {
    // console.log('Push notifications enabled successfully');
        }
      }, 3000);
    }
  }, [user, enablePushNotifications]); // Removed pushInitialized from deps to prevent loop

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      pollForNewNotifications();
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [user, pollForNewNotifications]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    pushEnabled,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    showToast,
    dismissToast,
    enablePushNotifications,
    toasts,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
