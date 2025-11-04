/**
 * Push notification service for mobile notifications
 * Manages service worker registration and push subscriptions
 */

import { apiClient } from '@/lib/api';

// Check if push notifications are supported
export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

// Convert VAPID key from base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Get VAPID public key from backend
async function getVapidPublicKey(): Promise<string> {
  try {
    const response = await apiClient.get<{ public_key: string }>('/api/v1/push/vapid-public-key');
    return response.public_key;
  } catch (error) {
    console.error('Failed to get VAPID public key:', error);
    throw error;
  }
}

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Push notifications are not supported in this browser');
    }
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    // console.log('Service Worker registered successfully:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('This browser does not support notifications');
    }
    return 'denied';
  }

  const permission = await Notification.requestPermission();
    // console.log('Notification permission:', permission);
  return permission;
}

// Subscribe to push notifications
export async function subscribeToPush(
  registration: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
  try {
    // Get VAPID public key
    const vapidPublicKey = await getVapidPublicKey();
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey as unknown as BufferSource
    });

    // console.log('Push subscription successful:', subscription);

    // Send subscription to backend
    await sendSubscriptionToBackend(subscription);

    return subscription;
  } catch (error) {
    console.error('Failed to subscribe to push:', error);
    return null;
  }
}

// Send subscription to backend
async function sendSubscriptionToBackend(subscription: PushSubscription): Promise<void> {
  try {
    const subscriptionJson = subscription.toJSON();
    const deviceInfo = `${navigator.userAgent.substring(0, 100)}`;

    await apiClient.post('/api/v1/push/subscribe', {
      subscription: subscriptionJson,
      device_info: deviceInfo
    });

    // console.log('Subscription sent to backend successfully');
  } catch (error) {
    console.error('Failed to send subscription to backend:', error);
    throw error;
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPush(
  registration: ServiceWorkerRegistration
): Promise<boolean> {
  try {
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Unsubscribe from push manager
      await subscription.unsubscribe();

      // Notify backend
      try {
        await apiClient.post('/api/v1/push/unsubscribe', {
          endpoint: subscription.endpoint
        });
      } catch (error) {
        console.error('Failed to notify backend about unsubscription:', error);
      }

    // console.log('Unsubscribed from push notifications');
      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to unsubscribe from push:', error);
    return false;
  }
}

// Check if user is subscribed
export async function isSubscribed(
  registration: ServiceWorkerRegistration
): Promise<boolean> {
  try {
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch (error) {
    console.error('Failed to check subscription status:', error);
    return false;
  }
}

// Initialize push notifications
export async function initializePushNotifications(): Promise<boolean> {
  if (!isPushSupported()) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Push notifications not supported');
    }
    return false;
  }

  try {
    // Register service worker
    const registration = await registerServiceWorker();
    if (!registration) {
      return false;
    }

    // Check if already subscribed
    const alreadySubscribed = await isSubscribed(registration);
    if (alreadySubscribed) {
    // console.log('Already subscribed to push notifications');
      return true;
    }

    // Request permission
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
    // console.log('Notification permission not granted');
      return false;
    }

    // Subscribe to push
    const subscription = await subscribeToPush(registration);
    return subscription !== null;
  } catch (error) {
    console.error('Failed to initialize push notifications:', error);
    return false;
  }
}
