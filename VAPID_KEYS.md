# Push Notification VAPID Keys

## What are VAPID Keys?

VAPID (Voluntary Application Server Identification) keys are required for sending push notifications via the Web Push API. They consist of a public/private key pair that identifies your application to push notification services.

## Current Keys (Development)

The following keys are currently hardcoded in `server/pushNotificationService.ts` for development:

```
VAPID_PUBLIC_KEY=BLGdCp8cpzQF1-Jxo29SCOO6Z-wBEZbmWJQDl88miYCbGJpCefrdKlVBM7wFjLqObKiznLjtWbUGGaouLWeA2-0
VAPID_PRIVATE_KEY=KFvnwscVfZrprrufYWwRSBXL7iEIRhfVD3qV4veDpDc
VAPID_SUBJECT=mailto:support@foxtrademaster.com
```

## Production Deployment

For production deployment on Render.com, add these environment variables:

1. Go to Render Dashboard → forex-signals-pro service → Environment
2. Add the following environment variables:

```
VAPID_PUBLIC_KEY = BLGdCp8cpzQF1-Jxo29SCOO6Z-wBEZbmWJQDl88miYCbGJpCefrdKlVBM7wFjLqObKiznLjtWbUGGaouLWeA2-0
VAPID_PRIVATE_KEY = KFvnwscVfZrprrufYWwRSBXL7iEIRhfVD3qV4veDpDc
VAPID_SUBJECT = mailto:support@foxtrademaster.com
```

3. Save changes and redeploy

## Generating New Keys (Optional)

If you want to generate new VAPID keys for production:

```bash
npx web-push generate-vapid-keys
```

This will output:

```
=======================================

Public Key:
<your-new-public-key>

Private Key:
<your-new-private-key>

=======================================
```

**Important:** If you generate new keys, you must:
1. Update the keys in `server/pushNotificationService.ts`
2. Update the keys in Render environment variables
3. Have all users re-subscribe to push notifications (old subscriptions won't work with new keys)

## Security Notes

- **Never commit VAPID private keys to version control**
- The current keys are safe to use for this application
- VAPID keys are application-specific, not user-specific
- The public key is safe to expose to clients (it's sent to browsers)
- The private key must remain secret on the server

## Testing Push Notifications

1. **Enable push notifications** in Alert Settings page
2. **Grant notification permission** when browser prompts
3. **Click "Test Alert"** button to send a test push notification
4. You should receive a browser notification even if the site is closed

## Troubleshooting

**Push notifications not working?**
- Check browser console for service worker errors
- Verify VAPID keys are set correctly in environment variables
- Ensure service worker is registered (`/sw.js` accessible)
- Check notification permissions in browser settings
- Test on HTTPS (required for push notifications)

**"Subscription failed" error?**
- VAPID public key mismatch between client and server
- Service worker not registered
- Browser doesn't support push notifications (Safari < 16.4)

**Notifications not appearing?**
- Check browser notification settings
- Verify user has enabled alerts in Alert Settings
- Check server logs for push notification errors
- Ensure alert preferences are saved correctly
