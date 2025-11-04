# Notification System Setup Guide

## Quick Start

The notification system provides **triple-channel delivery** (in-app + email + push) for all critical hospital events.

## Setup Steps

### 1. Gmail SMTP Configuration (Email Notifications)

**Cost:** FREE (up to 500 emails/day)

1. **Use or Create Gmail Account**
   - Use existing Gmail: https://mail.google.com
   - Or create new: https://accounts.google.com/signup

2. **Enable 2-Factor Authentication**
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification

3. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" → "Other (Custom name)" → Enter "Hospital System"
   - Copy the 16-character password (format: xxxx xxxx xxxx xxxx)

4. **Configure Environment**
   ```bash
   # Edit backend/.env
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

### 2. Push Notifications Configuration (Mobile Support)

**Cost:** FREE (unlimited notifications)

1. **Generate VAPID Keys**
   ```bash
   cd backend
   python scripts/generate_vapid_keys.py
   ```

   This will output:
   ```
   VAPID_PUBLIC_KEY=BNx7...
   VAPID_PRIVATE_KEY=aZ3...
   VAPID_EMAIL=noreply@yourhospital.com
   ```

2. **Add to Environment**
   ```bash
   # Edit backend/.env
   VAPID_PUBLIC_KEY=BNx7...  # From step 1
   VAPID_PRIVATE_KEY=aZ3...  # From step 1
   VAPID_EMAIL=noreply@yourhospital.com
   ```

3. **Restart Backend**
   ```bash
   docker-compose restart backend
   ```

4. **Test on Mobile**
   - Open app on mobile browser (Chrome, Firefox, Safari iOS 16.4+)
   - Login with any account
   - Browser will prompt: "Allow notifications?"
   - Click "Allow"
   - Push notifications now work even when app is closed!

### 3. Verify Setup

1. **Check Backend Logs**
   ```bash
   docker-compose logs backend | grep -i notification
   ```

2. **Test In-App Notifications**
   - Login to any account
   - Look for notification bell icon in header
   - Should show unread count badge

3. **Test Email**
   - Trigger any notification event
   - Check backend logs for email sending
   - Check recipient's email inbox

4. **Test Push (Mobile)**
   - Close the browser/app completely
   - Trigger notification from another device
   - Should receive native push notification
   - Click notification to open app

## Notification Triggers

All these events **automatically** send notifications to ALL channels:

### For Doctors
- ✅ Patient assigned to you
- ✅ Vitals recorded for your patient
- ✅ Lab result ready for your patient
- ✅ Emergency vitals alert
- ✅ Visit status changed

### For Nurses
- ✅ Patient assigned to you
- ✅ New prescription to administer
- ✅ Emergency vitals alert
- ✅ Visit status changed

### For Pharmacists
- ✅ New prescription to dispense

### For Patients
- ✅ Lab results ready
- ✅ Appointment reminder (24 hours before)

### For Admins
- ✅ Patient discharge completed
- ✅ EMR synchronization completed

## Configuration Options

### Without Gmail SMTP
- In-app notifications: ✅ Works
- Email notifications: ⚠️ Logged to console only
- Push notifications: ✅ Works

### Without VAPID Keys
- In-app notifications: ✅ Works
- Email notifications: ✅ Works
- Push notifications: ❌ Disabled

### Minimal Setup (No Config)
- In-app notifications: ✅ Works perfectly
- Email notifications: ⚠️ Logged only
- Push notifications: ❌ Disabled

**Recommendation:** Configure all three channels for best user experience.

## Testing Guide

### Test Patient Assignment
```bash
# As Manager/Doctor
1. Login to dashboard
2. Admit a new patient
3. Assign doctor/nurse
→ Assigned provider receives notification on ALL channels
```

### Test Emergency Alert
```bash
# As Nurse
1. Record vitals with abnormal values (e.g., BP: 200/120)
2. System auto-detects emergency
→ Doctor and Nurse receive URGENT notifications on ALL channels
→ Mobile notification requires interaction
→ Vibration on mobile device
```

### Test Lab Results
```bash
# As Lab Tech
1. Accept lab test request
2. Upload result PDF
3. Mark test as completed
→ Doctor and Patient receive notifications on ALL channels
```

### Test Appointment Reminder
```bash
# Via Celery scheduled task
1. Create appointment for tomorrow
2. Wait for scheduled task to run (or trigger manually)
→ Patient receives reminder on ALL channels
```

## Troubleshooting

### Emails Not Sending

**Check Configuration:**
```bash
docker-compose exec backend python
>>> import os
>>> print(os.getenv('SMTP_USER'))
>>> print(os.getenv('SMTP_PASSWORD'))
```

**Common Issues:**
- ❌ Using Gmail password instead of App Password
- ❌ 2FA not enabled on Gmail
- ❌ Spaces in password (remove spaces)
- ❌ Wrong SMTP host/port

**Solution:**
1. Regenerate App Password
2. Update .env with new password (no spaces)
3. Restart backend: `docker-compose restart backend`

### Push Notifications Not Working

**Check Browser Support:**
```javascript
// Open browser console
console.log('ServiceWorker' in navigator);  // Should be true
console.log('PushManager' in window);        // Should be true
console.log('Notification' in window);       // Should be true
```

**Common Issues:**
- ❌ VAPID keys not configured
- ❌ HTTP instead of HTTPS (push requires HTTPS in production)
- ❌ Permission denied by user
- ❌ Safari private browsing mode

**Solution:**
1. Verify VAPID keys in .env
2. Use HTTPS in production
3. Clear browser data and re-grant permission
4. Test in normal browsing mode

### In-App Notifications Not Appearing

**Check API:**
```bash
# Get auth token first
curl -X GET "http://localhost:8000/api/v1/notifications" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Common Issues:**
- ❌ NotificationProvider not wrapping app
- ❌ User not authenticated
- ❌ API endpoint returning error

**Solution:**
1. Verify `<NotificationProvider>` in layout
2. Check user authentication
3. Review backend logs for errors

### Service Worker Not Registering

**Check Registration:**
```javascript
// Browser console
navigator.serviceWorker.getRegistrations()
  .then(regs => console.log(regs));
```

**Common Issues:**
- ❌ sw.js not in public folder
- ❌ CORS issues
- ❌ Service worker blocked by browser

**Solution:**
1. Verify `/sw.js` is accessible
2. Check browser DevTools → Application → Service Workers
3. Unregister old workers and re-register

## Mobile Device Testing

### iOS Safari (16.4+)
1. Open Safari on iPhone/iPad
2. Navigate to app
3. Add to Home Screen (for best experience)
4. Grant notification permission
5. Lock device
6. Trigger notification from another device
7. Should receive push notification on lock screen

### Android Chrome
1. Open Chrome on Android
2. Navigate to app
3. Grant notification permission
4. Close Chrome completely
5. Trigger notification from another device
6. Should receive push notification

### Android Firefox
Same as Chrome above

## Performance

### Email Sending
- **Time:** ~1-2 seconds per email (async, non-blocking)
- **Limit:** 500 emails/day per Gmail account
- **Scale:** Use multiple Gmail accounts or upgrade to SendGrid

### Push Notifications
- **Time:** <100ms (instant)
- **Limit:** Unlimited (free)
- **Scale:** Handles thousands of subscriptions

### In-App Notifications
- **Time:** <50ms (database query)
- **Polling:** Every 30 seconds
- **Scale:** Efficient database indexes

## Cost Analysis

| Channel | Cost | Limit | Scale Option |
|---------|------|-------|--------------|
| In-App | **FREE** | Unlimited | Database scaling |
| Email (Gmail) | **FREE** | 500/day | Multiple accounts |
| Push (VAPID) | **FREE** | Unlimited | N/A |
| **TOTAL** | **$0/month** | 500 emails/day | Low cost upgrade |

### Scaling Email Beyond 500/day

**Option 1: Multiple Gmail Accounts** (FREE)
- Create 5 Gmail accounts = 2,500 emails/day
- Rotate accounts in code

**Option 2: SendGrid Free Tier** (FREE)
- 100 emails/day free forever
- Easy integration

**Option 3: AWS SES** (LOW COST)
- $0.10 per 1,000 emails
- 62,000 emails/month = $6.20/month

## Security Considerations

### Email
- ✅ Gmail App Passwords (more secure than password)
- ✅ Store in .env (not in code)
- ✅ Never commit .env to git
- ⚠️ Rotate passwords every 90 days

### Push Notifications
- ✅ VAPID private key kept secret
- ✅ Subscription validation
- ✅ User permission required
- ✅ Endpoint encryption

### In-App
- ✅ User authentication required
- ✅ Only see own notifications
- ✅ Audit trail in database

## Support

### Documentation
- Main docs: `/docs/NOTIFICATIONS.md`
- API docs: `http://localhost:8000/api/v1/docs`
- Push API: `http://localhost:8000/api/v1/push/`

### Common Commands
```bash
# View notification logs
docker-compose logs backend | grep -i notif

# Check pending notifications
docker-compose exec backend python
>>> from app.core.database import SessionLocal
>>> from app.models.notification import Notification
>>> db = SessionLocal()
>>> db.query(Notification).filter(Notification.status == 'pending').count()

# Clear all notifications for testing
docker-compose exec backend python
>>> db.query(Notification).delete()
>>> db.commit()
```

### Getting Help
1. Check backend logs: `docker-compose logs backend`
2. Check frontend console: Browser DevTools
3. Review notification database table
4. Test individual channels separately
5. Verify configuration in .env

## Best Practices

1. **Always configure all three channels** for redundancy
2. **Test on actual mobile devices** before production
3. **Monitor email sending limits** (500/day per account)
4. **Use HTTPS in production** (required for push)
5. **Set up error monitoring** (Sentry) for notification failures
6. **Keep VAPID keys secure** (never commit to git)
7. **Rotate Gmail App Passwords** periodically
8. **Test emergency notifications** with actual staff
9. **Monitor notification delivery rates**
10. **Have fallback plan** if Gmail hits limit

## Production Checklist

- [ ] Gmail SMTP configured with App Password
- [ ] VAPID keys generated and configured
- [ ] HTTPS enabled (required for push)
- [ ] Service worker accessible at `/sw.js`
- [ ] All .env variables set correctly
- [ ] Backend restarted after configuration
- [ ] Tested on iOS Safari
- [ ] Tested on Android Chrome
- [ ] Tested emergency alerts
- [ ] Tested all notification types
- [ ] Verified email delivery
- [ ] Verified push delivery
- [ ] Verified in-app delivery
- [ ] Error monitoring configured
- [ ] Backup email account ready
- [ ] Documentation updated with contact email

## Emergency Notifications Priority

Emergency alerts (`emergency_alert` type) have special handling:

- 🔴 **Highest Priority**
- 📱 **Requires user interaction on mobile** (can't dismiss automatically)
- 🔊 **Vibration pattern** on mobile devices
- ⏰ **Longer toast display** (10 seconds vs 5 seconds)
- 🚨 **Visual distinction** (red background, alert icon)
- ✅ **All three channels** triggered simultaneously

Test emergency notifications thoroughly before production!
