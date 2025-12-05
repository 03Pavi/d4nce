# Quick Fix: Notifications Not Working on Vercel

## The Main Issue
**Missing Environment Variable**: `ONESIGNAL_API_KEY` is not set in Vercel.

## Quick Fix Steps

### Step 1: Set Environment Variable in Vercel ⚡

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Set:
   - **Key**: `ONESIGNAL_API_KEY`
   - **Value**: Your OneSignal REST API Key
   - **Environments**: Check all (Production, Preview, Development)
6. Click **Save**

#### How to Get Your OneSignal REST API Key:
1. Go to [OneSignal Dashboard](https://onesignal.com/)
2. Select your app
3. Go to **Settings** → **Keys & IDs**
4. Copy the **REST API Key** (not the App ID)

### Step 2: Redeploy Your Application

After setting the environment variable, you MUST redeploy:

```bash
# Option 1: Push a new commit
git add .
git commit -m "Add notification fixes"
git push

# Option 2: Redeploy from Vercel dashboard
# Go to Deployments → Click "..." → Redeploy
```

### Step 3: Test Notifications

Visit this URL to test if notifications are working:
```
https://your-app.vercel.app/api/test-notification
```

You should see:
```json
{
  "success": true,
  "message": "Notification sent successfully",
  "result": {
    "id": "...",
    "recipients": 1
  }
}
```

If you see an error, check the response for details.

## What We Fixed

### 1. Better Error Handling ✅
**File**: `src/lib/notifications.ts`

Changed from silent failure to throwing errors:
```typescript
// ❌ Before: Silent failure
if (!ONESIGNAL_API_KEY) {
    console.warn("...");
    return; // Silently fails
}

// ✅ After: Throws error
if (!ONESIGNAL_API_KEY) {
    throw new Error("API Key not found");
}
```

### 2. Enhanced Logging ✅
**File**: `src/lib/notifications.ts`

Added detailed logging for debugging:
```typescript
console.log("✅ Notification sent successfully:", {
  id: response.data.id,
  recipients: response.data.recipients,
  message: message.substring(0, 50)
});
```

### 3. Production-Ready OneSignal Init ✅
**File**: `src/app/layout.tsx`

Only allows localhost in development:
```typescript
const isLocalhost = window.location.hostname === 'localhost';
allowLocalhostAsSecureOrigin: isLocalhost, // Only true on localhost
```

### 4. Test API Route ✅
**File**: `src/app/api/test-notification/route.ts`

Created test endpoint to verify notifications work.

## Verification Checklist

After deploying, verify these:

- [ ] Environment variable `ONESIGNAL_API_KEY` is set in Vercel
- [ ] Application has been redeployed after setting the variable
- [ ] Test API route returns success: `/api/test-notification`
- [ ] Browser console shows: `✅ OneSignal initialized successfully`
- [ ] No errors in Vercel function logs
- [ ] Notifications appear in OneSignal dashboard

## Common Issues

### Issue: "API Key not found" Error
**Solution**: 
1. Verify `ONESIGNAL_API_KEY` is set in Vercel
2. Ensure you redeployed after setting it
3. Check you're using the REST API Key, not the App ID

### Issue: Test API Returns 500 Error
**Solution**:
1. Check Vercel function logs for detailed error
2. Verify OneSignal REST API Key is correct
3. Ensure OneSignal app is active

### Issue: Notifications Send But Users Don't Receive
**Solution**:
1. Check users have granted notification permission
2. Verify users are logged in with OneSignal: `OneSignal.User.PushSubscription.id`
3. Check OneSignal dashboard for delivery status
4. Ensure users' browsers support push notifications

### Issue: Service Worker Not Loading
**Solution**:
1. Check `/sw.js` is accessible
2. Verify PWA build completed successfully
3. Check browser console for service worker errors

## Testing Commands

### Test with cURL:
```bash
curl https://your-app.vercel.app/api/test-notification
```

### Test with specific users:
```bash
curl -X POST https://your-app.vercel.app/api/test-notification \
  -H "Content-Type: application/json" \
  -d '{"message": "Test to specific user", "userIds": ["user-id-here"]}'
```

## Debugging

### Check Vercel Logs:
```bash
vercel logs your-deployment-url --follow
```

### Check Browser Console:
Look for these messages:
```
🔔 Initializing OneSignal... { hostname: "...", isLocalhost: false }
✅ OneSignal initialized successfully
OneSignal: Auth change - Logging in user [user-id]
✅ Notification sent successfully: { id: "...", recipients: 1 }
```

### Check OneSignal Dashboard:
1. Go to **Delivery** → **All Messages**
2. Check if notifications are being sent
3. Look for delivery errors or warnings

## Need More Help?

If notifications still don't work after following these steps:

1. **Check Vercel Logs**: Look for error messages
2. **Check OneSignal Dashboard**: Verify notifications are being sent
3. **Test API Route**: Use `/api/test-notification` to isolate the issue
4. **Browser Console**: Look for JavaScript errors
5. **Service Worker**: Verify it's registered and active

## Files Modified

1. `src/lib/notifications.ts` - Better error handling and logging
2. `src/app/layout.tsx` - Production-ready OneSignal initialization
3. `src/app/api/test-notification/route.ts` - Test endpoint (NEW)
4. `.agent/vercel-notification-fix.md` - Detailed documentation

## Summary

The main issue is **missing `ONESIGNAL_API_KEY` environment variable in Vercel**. 

**Quick Fix**:
1. Set `ONESIGNAL_API_KEY` in Vercel environment variables
2. Redeploy the application
3. Test with `/api/test-notification`

That's it! 🎉
