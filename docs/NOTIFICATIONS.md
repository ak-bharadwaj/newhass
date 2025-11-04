# Notification System Documentation

## Overview

The Hospital Automation System uses a **triple-channel notification system** to ensure all staff and patients receive critical notifications immediately:

1. **In-App Notifications** (Primary) - Real-time pop-up toasts in web application
2. **Email Notifications** (Secondary) - Email alerts via free Gmail SMTP  
3. **Push Notifications** (Mobile) - Mobile push notifications that work even when app is closed

**100% FREE** - No SMS or WhatsApp costs. All notification channels are completely free.

## Key Features

### Multi-Channel Delivery
- **Every important notification goes to ALL channels** (in-app + email + push)
- Ensures no missed notifications regardless of user location
- Works on desktop, mobile web, and mobile apps
- Continues working even when browser is closed

### In-App Notifications
- Real-time pop-up toasts in top-right corner
- Notification bell icon with unread count badge
- Dropdown panel with full notification history
- Auto-polling every 30 seconds for new notifications
- Mark as read, mark all as read, delete functionality
- Auto-dismiss toasts after 5 seconds (10 seconds for emergencies)
- Color-coded by notification type

### Email Notifications
- Free Gmail SMTP service (no cost, 500 emails/day limit per account)
- HTML and plain text email formats
- Professional email templates
- Automatic fallback to logging if SMTP not configured
- Async sending (non-blocking)

### Push Notifications (NEW!)
- **Works even when web app is closed**
- **Mobile browser support** (Chrome, Firefox, Edge, Safari iOS 16.4+)
- Native mobile notifications with sound and vibration
- Click notification to open app
- Emergency alerts require user interaction
- Multiple device support per user
- Completely FREE (no cost)

## Complete Notification Types

### 1. Patient Assignment
- **Type:** `patient_assigned`  
- **Recipients:** Doctor or Nurse being assigned
- **Trigger:** Patient assigned to healthcare provider
- **Channels:** In-app + Email + Push
- **Priority:** High

### 2. Visit Status Change
- **Type:** `visit_status_change`
- **Recipients:** Doctor, Nurse (if assigned)
- **Trigger:** Visit status updated (active → discharged, etc.)
- **Channels:** In-app + Email + Push
- **Priority:** Normal

### 3. Prescription Created
- **Type:** `prescription_created`
- **Recipients:** Nurse (for administration), Pharmacist (for dispensing)
- **Trigger:** New prescription ordered by doctor
- **Channels:** In-app + Email + Push
- **Priority:** High

### 4. Vitals Recorded
- **Type:** `vitals_recorded`
- **Recipients:** Doctor
- **Trigger:** Nurse records new vital signs
- **Channels:** In-app + Email + Push
- **Priority:** Normal

### 5. Emergency Vitals Alert
- **Type:** `emergency_alert`
- **Recipients:** Nurse, Doctor
- **Trigger:** Abnormal/critical vital signs detected
- **Channels:** In-app + Email + Push
- **Priority:** URGENT (requires immediate action)
- **Special:** Longer toast display (10 seconds), vibration on mobile

### 6. Lab Result Ready
- **Type:** `lab_result_ready`
- **Recipients:** Doctor, Patient
- **Trigger:** Lab test completed and results available
- **Channels:** In-app + Email + Push
- **Priority:** High

### 7. Discharge Complete
- **Type:** `discharge_complete`
- **Recipients:** Super Admin, Regional Admin
- **Trigger:** Patient discharge completed and EMR synced
- **Channels:** In-app + Email + Push
- **Priority:** Normal

### 8. Appointment Reminder
- **Type:** `appointment_reminder`
- **Recipients:** Patient
- **Trigger:** Scheduled task (24 hours before appointment)
- **Channels:** In-app + Email + Push (if patient has portal)
- **Priority:** Normal

## Setup Instructions

### Gmail SMTP Setup (Free)

1. **Use or Create a Gmail Account**
   - Use your existing Gmail account
   - Or create a new free Gmail account at https://accounts.google.com/signup

2. **Enable 2-Factor Authentication**
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification

3. **Generate App Password**
   - Go to https://myaccount.google.com/apppasswords
   - Create a new App Password for "Mail"
   - Copy the 16-character password (format: xxxx xxxx xxxx xxxx)

4. **Configure Environment Variables**
   Edit `backend/.env`:
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USE_TLS=true
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-16-char-app-password
   SMTP_FROM_EMAIL=your-email@gmail.com
   ```

5. **Restart Backend**
   ```bash
   docker-compose restart backend
   ```

### Without Gmail SMTP

If you don't configure Gmail SMTP:
- In-app notifications will still work perfectly
- Email notifications will be logged to console instead of sent
- No errors will occur - system degrades gracefully

## Architecture

### Backend Components

#### 1. Notification Model (`app/models/notification.py`)
Database table storing all notifications:
- `id` - UUID primary key
- `recipient_user_id` - User to notify (nullable for email-only)
- `notification_type` - Type: appointment_reminder, lab_result_ready, emergency_alert, discharge_complete
- `channel` - Channel: `in_app` or `email`
- `recipient_address` - Email address or user ID
- `subject` - Notification subject
- `message` - Notification body
- `status` - Status: pending, sent, delivered, failed
- `created_at`, `updated_at` - Timestamps

#### 2. Notification Service (`app/services/notification_service.py`)
Business logic for creating notifications:
- `_create_dual_notifications()` - Creates both in-app and email notifications
- `notify_discharge_complete()` - Discharge completion alerts
- `notify_lab_result_ready()` - Lab result ready alerts
- `notify_emergency_vitals()` - Emergency vital signs alerts
- `create_appointment_reminder()` - Appointment reminders

#### 3. Email Provider (`app/notifications/email_provider.py`)
Gmail SMTP email sending:
- Uses `aiosmtplib` for async SMTP
- Graceful fallback if SMTP not configured
- HTML and plain text email support

#### 4. In-App Provider (`app/notifications/in_app_provider.py`)
In-app notification handler:
- Marks notifications as ready for display
- No external sending needed (stored in database)

#### 5. Notification API (`app/api/routes/notifications.py`)
REST API endpoints:
- `GET /api/v1/notifications` - Get user's notifications
- `GET /api/v1/notifications/unread-count` - Get unread count
- `POST /api/v1/notifications/{id}/read` - Mark as read
- `POST /api/v1/notifications/read-all` - Mark all as read
- `DELETE /api/v1/notifications/{id}` - Delete notification

### Frontend Components

#### 1. Notification Service (`frontend/src/services/notificationService.ts`)
API client for notification operations:
- `getNotifications()` - Fetch notifications
- `getUnreadCount()` - Fetch unread count
- `markAsRead()` - Mark notification as read
- `markAllAsRead()` - Mark all as read
- `deleteNotification()` - Delete notification
- `pollNotifications()` - Poll for new notifications

#### 2. Notification Context (`frontend/src/contexts/NotificationContext.tsx`)
React context providing notification state:
- Manages notification list and unread count
- Polls for new notifications every 30 seconds
- Shows toast pop-ups for new notifications
- Provides notification operations

#### 3. Notification Bell (`frontend/src/components/notifications/NotificationBell.tsx`)
Header bell icon component:
- Shows unread count badge
- Dropdown panel with notification list
- Mark as read and delete actions
- Formatted timestamps (e.g., "2h ago")

#### 4. Notification Toast (`frontend/src/components/notifications/NotificationToast.tsx`)
Pop-up toast notification:
- Appears in top-right corner
- Color-coded by notification type
- Auto-dismisses after 5 seconds
- Animated entry/exit
- Icons for different notification types

## Usage

### Backend: Creating Notifications

```python
from app.services.notification_service import NotificationService
from app.core.database import get_db

# In your route or service
db = get_db()
notification_service = NotificationService(db)

# Send discharge notification
notification_service.notify_discharge_complete(
    visit_id=visit.id,
    patient_name="John Doe",
    hospital_name="City Hospital"
)

# Send lab result notification
notification_service.notify_lab_result_ready(
    test_id=test.id,
    patient_name="Jane Smith",
    test_type="Blood Test",
    doctor_id=doctor.id,
    patient_id=patient.id
)

# Send emergency alert
notification_service.notify_emergency_vitals(
    patient_id=patient.id,
    patient_name="John Doe",
    vital_type="Blood Pressure",
    vital_value="200/120",
    nurse_id=nurse.id,
    doctor_id=doctor.id
)

# Send appointment reminder
notification_service.create_appointment_reminder(
    appointment_id=appointment.id,
    patient_user_id=patient.user_id,
    patient_email=patient.email,
    patient_name=patient.full_name,
    appointment_date=appointment.scheduled_at,
    doctor_name=doctor.full_name,
    hospital_name=hospital.name
)
```

### Frontend: Using Notifications

#### Add Provider to Layout
```tsx
// In app/layout.tsx or dashboard layout
import { NotificationProvider } from '@/contexts/NotificationContext';
import { NotificationToastContainer } from '@/components/notifications/NotificationToast';

export default function Layout({ children }) {
  return (
    <NotificationProvider>
      {children}
      <NotificationToastContainer />
    </NotificationProvider>
  );
}
```

#### Add Bell to Header
```tsx
// In your header component
import { NotificationBell } from '@/components/notifications/NotificationBell';

export function Header() {
  return (
    <header>
      {/* Other header items */}
      <NotificationBell />
    </header>
  );
}
```

#### Use in Components
```tsx
import { useNotifications } from '@/contexts/NotificationContext';

function MyComponent() {
  const { notifications, unreadCount, markAsRead } = useNotifications();

  return (
    <div>
      <p>You have {unreadCount} unread notifications</p>
      {notifications.map(notif => (
        <div key={notif.id} onClick={() => markAsRead(notif.id)}>
          {notif.subject}
        </div>
      ))}
    </div>
  );
}
```

## Email Templates

All emails include:
- Professional subject line
- Clear message body
- Patient/doctor/hospital information
- Action items or next steps
- System signature

Example email:
```
Subject: 🚨 EMERGENCY: Abnormal Vitals - John Doe

🚨 EMERGENCY ALERT 🚨

Patient: John Doe
Abnormal Vital: Blood Pressure
Value: 200/120

Immediate attention required!

Patient ID: 123e4567-e89b-12d3-a456-426614174000
```

## Troubleshooting

### Email Not Sending

1. **Check SMTP Configuration**
   ```bash
   # View backend logs
   docker-compose logs backend | grep EMAIL
   ```

2. **Verify Gmail App Password**
   - Ensure 2FA is enabled on Gmail account
   - Regenerate App Password if needed
   - Remove spaces from password in .env

3. **Check Gmail Security**
   - Go to https://myaccount.google.com/lesssecureapps
   - Ensure "Less secure app access" is OFF (use App Passwords instead)

4. **Test Email Sending**
   ```bash
   # Execute in backend container
   docker-compose exec backend python

   >>> import aiosmtplib
   >>> # Run async test
   ```

### In-App Notifications Not Appearing

1. **Check API Endpoints**
   - Visit http://localhost:8000/api/v1/docs
   - Test `/api/v1/notifications` endpoint
   - Ensure authentication is working

2. **Check Frontend Console**
   - Open browser DevTools
   - Look for notification polling errors
   - Verify WebSocket/polling is active

3. **Check Notification Creation**
   ```sql
   -- Query database directly
   SELECT * FROM notifications
   WHERE channel = 'in_app'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

### Notifications Not Polling

1. **Check NotificationProvider**
   - Ensure `<NotificationProvider>` wraps the app
   - Check React DevTools for context presence

2. **Check Browser Console**
   - Look for JavaScript errors
   - Verify API calls are being made every 30 seconds

3. **Check User Authentication**
   - Polling only works when user is logged in
   - Verify `user` object exists in AuthContext

## Cost Information

**Total Cost: $0 (FREE)**

- **Gmail SMTP:** Free (up to 500 emails/day per account)
- **In-App Notifications:** Free (stored in database)
- **Infrastructure:** Included in Docker setup

**Scalability:**
- For production with >500 emails/day, consider:
  - Multiple Gmail accounts
  - SendGrid free tier (100 emails/day)
  - AWS SES ($0.10 per 1000 emails)

## Security Considerations

1. **Email Content**
   - Do not include sensitive medical details in email
   - Use generic messages with links to portal

2. **App Passwords**
   - Store in .env file (not in code)
   - Never commit .env to git
   - Rotate passwords regularly

3. **Database**
   - Notifications table includes audit trail
   - Soft delete for compliance
   - Retention policy recommended

4. **Rate Limiting**
   - API endpoints are rate-limited
   - Prevents notification spam
   - Gmail SMTP has 500/day limit

## Future Enhancements

Potential additions (not implemented):
- Push notifications for mobile
- SMS via Twilio (paid service)
- WhatsApp Business API (paid service)
- Notification preferences per user
- Notification templates
- Scheduled notification delivery
- Notification digests
- Rich media in notifications

## Support

For issues or questions:
1. Check this documentation
2. Review backend logs: `docker-compose logs backend`
3. Review frontend console errors
4. Check notification database records
5. Test email configuration
