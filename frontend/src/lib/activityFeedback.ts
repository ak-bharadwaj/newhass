/**
 * Activity Feedback System
 * Provides instant visual acknowledgment for all user actions
 */

import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

// Success feedback with custom icon
export const successFeedback = (message: string, icon?: string) => {
  toast.success(message, {
    icon: icon || '✅',
    duration: 2000,
    style: {
      borderRadius: '12px',
      background: '#10b981',
      color: '#fff',
      fontWeight: '500',
    },
  });

  // Optional: Haptic feedback for mobile
  if ('vibrate' in navigator) {
    navigator.vibrate(50);
  }
};

// Error feedback
export const errorFeedback = (message: string) => {
  toast.error(message, {
    icon: '❌',
    duration: 3000,
    style: {
      borderRadius: '12px',
      background: '#ef4444',
      color: '#fff',
      fontWeight: '500',
    },
  });

  if ('vibrate' in navigator) {
    navigator.vibrate([100, 50, 100]);
  }
};

// Info feedback
export const infoFeedback = (message: string, icon?: string) => {
  toast(message, {
    icon: icon || 'ℹ️',
    duration: 2000,
    style: {
      borderRadius: '12px',
      background: '#3b82f6',
      color: '#fff',
      fontWeight: '500',
    },
  });
};

// Loading feedback
export const loadingFeedback = (message: string) => {
  return toast.loading(message, {
    style: {
      borderRadius: '12px',
      background: '#6b7280',
      color: '#fff',
      fontWeight: '500',
    },
  });
};

// Warning feedback
export const warningFeedback = (message: string) => {
  toast(message, {
    icon: '⚠️',
    duration: 2500,
    style: {
      borderRadius: '12px',
      background: '#f59e0b',
      color: '#fff',
      fontWeight: '500',
    },
  });
};

// Promise feedback (for async operations)
export const promiseFeedback = async <T,>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string;
  }
): Promise<T> => {
  return toast.promise(
    promise,
    {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    },
    {
      style: {
        borderRadius: '12px',
        fontWeight: '500',
      },
      success: {
        icon: '✅',
        style: {
          background: '#10b981',
          color: '#fff',
        },
      },
      error: {
        icon: '❌',
        style: {
          background: '#ef4444',
          color: '#fff',
        },
      },
    }
  );
};

// Quick action feedback
export const quickActionFeedback = (action: string) => {
  toast.success(`${action} completed!`, {
    duration: 1500,
    icon: '⚡',
    style: {
      borderRadius: '12px',
      background: '#8b5cf6',
      color: '#fff',
      fontWeight: '500',
    },
  });
};

// Activity types with their feedback
export const activityFeedbacks = {
  // User actions
  userCreated: () => successFeedback('User created successfully', '👤'),
  userUpdated: () => successFeedback('User updated successfully', '✏️'),
  userDeleted: () => successFeedback('User deleted successfully', '🗑️'),

  // Patient actions
  patientAdmitted: () => successFeedback('Patient admitted successfully', '🏥'),
  patientDischarged: () => successFeedback('Patient discharged successfully', '✅'),
  patientUpdated: () => successFeedback('Patient information updated', '📝'),

  // Medical actions
  vitalsRecorded: () => successFeedback('Vitals recorded successfully', '💊'),
  prescriptionCreated: () => successFeedback('Prescription created', '💊'),
  labTestOrdered: () => successFeedback('Lab test ordered', '🔬'),
  labResultUploaded: () => successFeedback('Lab result uploaded', '📊'),

  // Clinical actions
  noteAdded: () => successFeedback('Note added successfully', '📝'),
  diagnosisUpdated: () => successFeedback('Diagnosis updated', '🩺'),
  medicationAdministered: () => successFeedback('Medication administered', '💉'),

  // Operational actions
  bedAssigned: () => successFeedback('Bed assigned successfully', '🛏️'),
  bedReleased: () => successFeedback('Bed released successfully', '✅'),
  appointmentBooked: () => successFeedback('Appointment booked', '📅'),
  appointmentCancelled: () => successFeedback('Appointment cancelled', '🚫'),

  // AI actions
  aiSuggestionReceived: () => successFeedback('AI suggestions generated', '🤖'),
  prescriptionValidated: () => successFeedback('Prescription validated', '✅'),

  // System actions
  dataExported: () => successFeedback('Data exported successfully', '📥'),
  reportGenerated: () => successFeedback('Report generated', '📄'),
  settingsSaved: () => successFeedback('Settings saved', '⚙️'),
  emailSent: () => successFeedback('Email sent successfully', '📧'),
  notificationSent: () => successFeedback('Notification sent', '🔔'),

  // File actions
  fileUploaded: () => successFeedback('File uploaded successfully', '📁'),
  imageUploaded: () => successFeedback('Image uploaded successfully', '🖼️'),
  documentSaved: () => successFeedback('Document saved', '💾'),

  // Generic
  saved: () => successFeedback('Saved successfully', '💾'),
  deleted: () => successFeedback('Deleted successfully', '🗑️'),
  updated: () => successFeedback('Updated successfully', '✏️'),
  copied: () => successFeedback('Copied to clipboard', '📋'),

  // Errors
  networkError: () => errorFeedback('Network error. Please try again'),
  permissionDenied: () => errorFeedback('Permission denied'),
  validationError: (message: string) => errorFeedback(message),
  serverError: () => errorFeedback('Server error. Please try again later'),
};

// Button click acknowledgment (subtle feedback)
export const buttonClickFeedback = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(10);
  }
};

// Optimistic UI helper
export const optimisticAction = async <T,>(
  optimisticUpdate: () => void,
  actualAction: () => Promise<T>,
  rollback: () => void,
  successMessage?: string
): Promise<T> => {
  // Apply optimistic update immediately
  optimisticUpdate();

  try {
    // Perform actual action
    const result = await actualAction();

    // Show success feedback
    if (successMessage) {
      successFeedback(successMessage);
    }

    return result;
  } catch (error) {
    // Rollback on error
    rollback();
    errorFeedback('Action failed. Changes reverted.');
    throw error;
  }
};
