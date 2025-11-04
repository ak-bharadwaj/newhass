# Testing Notifications (Even When Website is Closed)

## Quick Test Guide

This guide helps you verify that notifications work **even when the website is completely closed**.

## Prerequisites

Before testing, ensure:
- ✅ Docker containers are running
- ✅ Celery worker is running
- ✅ Celery beat is running
- ✅ Redis is running

```bash
docker-compose up -d
docker-compose ps  # Verify all services are running
```

## Test 1: Email Notifications (Website Closed)

**Goal:** Verify emails are sent even when no one is using the website

### Setup
1. Configure Gmail SMTP in `backend/.env`:
   ```bash
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   ```

2. Restart backend and Celery:
   ```bash
   docker-compose restart backend celery-worker celery-beat
   ```

### Test Steps
1. **Close ALL browser windows** (website completely closed)
2. **Trigger notification via API:**
   ```bash
   # Login and get token
   curl -X POST http://localhost:8000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"doctor@example.com","password":"password"}'

   # Extract token from response
   TOKEN="your-token-here"

   # Trigger patient assignment (creates notification)
   curl -X POST http://localhost:8000/api/v1/patients/assign \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"patient_id":"patient-uuid","doctor_id":"doctor-uuid"}'
   ```

3. **Check email inbox** (should receive email within 2 seconds)
4. **Verify in logs:**
   ```bash
   docker-compose logs celery-worker | grep -i "sent email"
   ```

### Expected Result
✅ Email received in inbox (even though website was closed)
✅ Log shows: "✓ Sent email notification"

---

## Test 2: Push Notifications (Mobile, App Closed)

**Goal:** Verify push notifications arrive on mobile even when browser is closed

### Setup
1. Configure VAPID in `backend/.env`:
   ```bash
   python backend/scripts/generate_vapid_keys.py
   # Copy keys to .env
   ```

2. Restart services:
   ```bash
   docker-compose restart backend celery-worker celery-beat
   ```

### Test Steps
1. **On mobile browser** (Chrome, Firefox, or Safari):
   - Open app: `https://yourdomain.com`
   - Login with any account
   - Grant notification permission when prompted
   - **Note the device in push subscriptions**

2. **Close browser completely** (not just minimize):
   - iOS: Swipe up to close
   - Android: Close from recent apps

3. **From another device**, trigger notification:
   ```bash
   # Use API or admin panel to assign patient to the mobile user
   # This creates notification across all channels
   ```

4. **Check mobile device** (should receive push notification)

### Expected Result
✅ Push notification appears on lock screen
✅ Notification shows title and message
✅ Clicking notification opens app

---

## Test 3: Emergency Alert (All Channels)

**Goal:** Verify emergency alerts go to all channels immediately

### Test Steps
1. **Close website completely**
2. **Trigger emergency alert:**
   ```python
   # In backend shell
   from app.core.database import SessionLocal
   from app.services.notification_service import NotificationService
   import uuid

   db = SessionLocal()
   service = NotificationService(db)

   service.notify_emergency_vitals(
       patient_id=uuid.uuid4(),
       patient_name="Test Patient",
       vital_type="Blood Pressure",
       vital_value="200/120",
       nurse_id=nurse_user_id,
       doctor_id=doctor_user_id
   )
   ```

3. **Check within 10 seconds:**
   - Doctor's email inbox ✓
   - Doctor's mobile (push) ✓
   - Nurse's email inbox ✓
   - Nurse's mobile (push) ✓

### Expected Result
✅ All recipients receive notification on ALL channels
✅ Email subject includes "🚨 URGENT"
✅ Push notification requires interaction
✅ Notification appears in under 2 seconds

---

## Test 4: Periodic Processing (Backup)

**Goal:** Verify periodic task picks up any missed notifications

### Test Steps
1. **Stop Celery worker temporarily:**
   ```bash
   docker-compose stop celery-worker
   ```

2. **Create notification** (will be pending, not sent):
   ```bash
   # Use API to create notification while worker is down
   ```

3. **Verify notification is pending:**
   ```bash
   docker-compose exec backend python
   >>> from app.core.database import SessionLocal
   >>> from app.models.notification import Notification
   >>> db = SessionLocal()
   >>> pending = db.query(Notification).filter(Notification.status == 'pending').count()
   >>> print(f"Pending: {pending}")
   ```

4. **Start Celery worker:**
   ```bash
   docker-compose start celery-worker
   ```

5. **Wait 1 minute** (periodic task runs every minute)

6. **Check notification sent:**
   ```bash
   docker-compose logs celery-worker | tail -20
   # Should see: "✓ Sent email notification"
   ```

### Expected Result
✅ Pending notification picked up by periodic task
✅ Notification sent within 1 minute
✅ Status changed from "pending" to "sent"

---

## Test 5: Multiple Devices

**Goal:** Verify push goes to all subscribed devices

### Test Steps
1. **Subscribe from multiple devices:**
   - Desktop Chrome: Login, grant permission
   - Mobile Chrome: Login, grant permission
   - Mobile Firefox: Login, grant permission

2. **Close ALL devices/browsers completely**

3. **Trigger notification** from admin panel or API

4. **Check ALL devices** receive push notification

### Expected Result
✅ Push notification on desktop
✅ Push notification on mobile Chrome
✅ Push notification on mobile Firefox
✅ All arrive within 2 seconds

---

## Troubleshooting Tests

### If Email Not Sent

**Check Configuration:**
```bash
docker-compose exec backend python
>>> import os
>>> print(f"SMTP User: {os.getenv('SMTP_USER')}")
>>> print(f"SMTP Password: {'***' if os.getenv('SMTP_PASSWORD') else 'NOT SET'}")
```

**Check Celery Worker Logs:**
```bash
docker-compose logs celery-worker | grep -i email
```

**Common Issues:**
- ❌ App Password not set → Generate at myaccount.google.com/apppasswords
- ❌ Worker not running → `docker-compose up -d celery-worker`
- ❌ Gmail daily limit (500) → Use multiple accounts

### If Push Not Working

**Check VAPID Configuration:**
```bash
docker-compose exec backend python
>>> import os
>>> vapid_public = os.getenv('VAPID_PUBLIC_KEY')
>>> print(f"VAPID configured: {bool(vapid_public)}")
```

**Check Subscriptions:**
```bash
docker-compose exec backend python
>>> from app.core.database import SessionLocal
>>> from app.models.push_subscription import PushSubscription
>>> db = SessionLocal()
>>> subs = db.query(PushSubscription).filter(PushSubscription.is_active == True).count()
>>> print(f"Active subscriptions: {subs}")
```

**Common Issues:**
- ❌ VAPID keys not set → Run `python backend/scripts/generate_vapid_keys.py`
- ❌ User didn't grant permission → Re-login and grant
- ❌ HTTP instead of HTTPS (prod) → Push requires HTTPS in production

### If Celery Not Processing

**Check Worker Status:**
```bash
docker-compose ps celery-worker
# Should show "Up"
```

**Check Redis Connection:**
```bash
docker-compose exec redis redis-cli ping
# Should return: PONG
```

**Check Task Queue:**
```bash
docker-compose exec redis redis-cli llen celery
# Shows number of pending tasks
```

**Restart Workers:**
```bash
docker-compose restart celery-worker celery-beat
```

---

## Performance Tests

### Test: High Volume (100 Notifications)

```python
# Create 100 notifications rapidly
from app.services.notification_service import NotificationService
from app.core.database import SessionLocal

db = SessionLocal()
service = NotificationService(db)

import time
start = time.time()

for i in range(100):
    service.notify_patient_assigned(
        patient_id=uuid.uuid4(),
        patient_name=f"Patient {i}",
        assigned_to_id=doctor_id,
        assigned_to_type="doctor",
        visit_id=uuid.uuid4()
    )

elapsed = time.time() - start
print(f"Created 100 notifications in {elapsed:.2f} seconds")
```

**Expected:**
- ✅ All created in <10 seconds
- ✅ All sent within 30 seconds
- ✅ No failures

### Test: Concurrent Sending

```bash
# Monitor Celery workers processing notifications
docker-compose logs -f celery-worker
```

**Expected:**
- ✅ Multiple notifications processed simultaneously
- ✅ No deadlocks
- ✅ Clean error handling

---

## Integration Tests

### Test Full Patient Assignment Flow

1. **Manager assigns patient to doctor** (website open)
2. **Doctor closes browser completely**
3. **Within 2 seconds:**
   - ✅ Doctor receives email
   - ✅ Doctor receives push on mobile
4. **Doctor opens app:**
   - ✅ In-app notification visible
   - ✅ Bell icon shows unread count

### Test Lab Result Flow

1. **Lab tech uploads result**
2. **Doctor and patient have website closed**
3. **Both receive:**
   - ✅ Email notification
   - ✅ Push notification
4. **Both open app:**
   - ✅ In-app notification visible

### Test Emergency Alert Flow

1. **Nurse records critical vitals**
2. **Doctor has browser closed**
3. **Immediately (within 2 seconds):**
   - ✅ Email with 🚨 in subject
   - ✅ Push with vibration
   - ✅ Requires interaction (can't auto-dismiss)

---

## Monitoring Tests

### Check Notification Stats

```bash
docker-compose exec backend python
>>> from app.core.database import SessionLocal
>>> from app.models.notification import Notification
>>> from datetime import datetime, timedelta
>>>
>>> db = SessionLocal()
>>> today = datetime.utcnow().date()
>>>
>>> # Today's stats
>>> pending = db.query(Notification).filter(Notification.status == 'pending').count()
>>> sent = db.query(Notification).filter(
...     Notification.status == 'sent',
...     Notification.sent_at >= today
... ).count()
>>> failed = db.query(Notification).filter(Notification.status == 'failed').count()
>>>
>>> print(f"Pending: {pending}")
>>> print(f"Sent today: {sent}")
>>> print(f"Failed: {failed}")
```

### Check Worker Health

```bash
# Worker active tasks
celery -A app.celery_app inspect active

# Worker stats
celery -A app.celery_app inspect stats
```

---

## Automated Test Script

Save as `test_notifications.sh`:

```bash
#!/bin/bash

echo "=== Testing Notification System ==="

# 1. Check services
echo "1. Checking services..."
docker-compose ps | grep -E "(celery|redis)"

# 2. Check configuration
echo "2. Checking configuration..."
docker-compose exec backend python -c "
import os
print('SMTP:', 'Configured' if os.getenv('SMTP_USER') else 'NOT SET')
print('VAPID:', 'Configured' if os.getenv('VAPID_PUBLIC_KEY') else 'NOT SET')
"

# 3. Check pending notifications
echo "3. Checking pending notifications..."
docker-compose exec backend python -c "
from app.core.database import SessionLocal
from app.models.notification import Notification
db = SessionLocal()
pending = db.query(Notification).filter(Notification.status == 'pending').count()
print(f'Pending notifications: {pending}')
"

# 4. Check worker logs
echo "4. Checking recent worker activity..."
docker-compose logs celery-worker | tail -10

echo "=== Test Complete ==="
```

Run with:
```bash
chmod +x test_notifications.sh
./test_notifications.sh
```

---

## Production Readiness Checklist

Before deploying to production:

- [ ] Gmail SMTP configured and tested
- [ ] VAPID keys generated and configured
- [ ] Celery worker running and healthy
- [ ] Celery beat running and healthy
- [ ] Redis persistent volume configured
- [ ] All test scenarios pass
- [ ] Email delivery confirmed (multiple recipients)
- [ ] Push delivery confirmed (iOS and Android)
- [ ] Emergency alerts tested end-to-end
- [ ] Monitoring/alerting configured
- [ ] Backup email account configured
- [ ] Documentation updated with on-call procedures
- [ ] Rate limits tested (Gmail 500/day)
- [ ] Failure scenarios tested
- [ ] Recovery procedures documented

---

## Quick Reference

**Restart notification system:**
```bash
docker-compose restart backend celery-worker celery-beat
```

**View notification logs:**
```bash
docker-compose logs -f celery-worker
```

**Check pending count:**
```bash
docker-compose exec backend python -c "from app.core.database import SessionLocal; from app.models.notification import Notification; db = SessionLocal(); print(db.query(Notification).filter(Notification.status == 'pending').count())"
```

**Trigger manual processing:**
```bash
docker-compose exec backend python -c "from app.tasks.send_notifications import send_pending_notifications; send_pending_notifications.delay()"
```

**Generate VAPID keys:**
```bash
python backend/scripts/generate_vapid_keys.py
```

---

## Summary

The notification system is fully tested when:
- ✅ Emails arrive with website closed
- ✅ Push notifications arrive on mobile with app closed
- ✅ Emergency alerts arrive in <2 seconds
- ✅ Periodic backup processing works
- ✅ Multiple devices receive notifications
- ✅ Failed notifications are retried
- ✅ All channels work independently

**Test regularly** to ensure the system remains operational!
