# Notification Not Working on Vercel - Diagnosis & Fix

## Problem
Push notifications are not working after deploying to Vercel, but they work fine locally.

## Root Causes

### 1. **Missing Environment Variable on Vercel** ⚠️
The `ONESIGNAL_API_KEY` environment variable is likely not set in Vercel's environment variables.

**File**: `src/lib/notifications.ts` (line 4)
```typescript
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY;
```

If this is missing, the notification function returns early:
```typescript
if (!ONESIGNAL_API_KEY) {
    console.warn("OneSignal API Key not found...");
    return; // ❌ Notifications silently fail
}
```

### 2. **Server-Side vs Edge Runtime**
Next.js on Vercel can run functions in different runtimes:
- **Node.js Runtime**: Full Node.js environment (default)
- **Edge Runtime**: Limited environment, faster cold starts

The `sendNotification` function uses `axios` which requires Node.js runtime.

### 3. **Service Worker Path Issues**
The PWA service worker configuration might not work correctly on Vercel due to path differences.

**File**: `src/app/layout.tsx` (line 74)
```typescript
serviceWorkerPath: '/sw.js',
```

On Vercel, the service worker might be served from a different path or might not be accessible.

### 4. **HTTPS Requirement**
OneSignal requires HTTPS for push notifications. While Vercel provides HTTPS by default, the `allowLocalhostAsSecureOrigin` setting should be removed in production.

## Solutions

### Solution 1: Set Environment Variable in Vercel ✅

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variable:
   - **Name**: `ONESIGNAL_API_KEY`
   - **Value**: Your OneSignal REST API Key (found in OneSignal Dashboard → Settings → Keys & IDs)
   - **Environment**: Production, Preview, Development (check all)
4. Click **Save**
5. **Redeploy** your application

### Solution 2: Update OneSignal Initialization for Production

Update the OneSignal initialization to handle production environment correctly:

**File**: `src/app/layout.tsx`

```typescript
<Script id="onesignal-init" strategy="afterInteractive">
  {`
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    OneSignalDeferred.push(async function(OneSignal) {
      await OneSignal.init({
        appId: "af9c3011-df39-423c-a2fa-832d24775f98",
        // Only allow localhost in development
        allowLocalhostAsSecureOrigin: ${process.env.NODE_ENV === 'development'},
        serviceWorkerPath: '/sw.js',
        serviceWorkerParam: { scope: '/' },
      });
    });
  `}
</Script>
```

### Solution 3: Add Better Error Logging

Update the notification function to provide better error feedback:

**File**: `src/lib/notifications.ts`

```typescript
export const sendNotification = async (message: string, options: NotificationOptions = {}) => {
  if (!ONESIGNAL_API_KEY) {
    const errorMsg = "OneSignal API Key not found. Please set ONESIGNAL_API_KEY in environment variables.";
    console.error("❌ NOTIFICATION ERROR:", errorMsg);
    throw new Error(errorMsg); // ✅ Throw error instead of silent return
  }
  
  // ... rest of the code
  
  try {
    const response = await axios.post('https://onesignal.com/api/v1/notifications', payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`
      }
    });
    console.log("✅ Notification sent successfully:", response.data);
    return response.data;
  } catch (error: any) {
    console.error("❌ Error sending notification:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};
```

### Solution 4: Verify OneSignal Configuration

Ensure your OneSignal app is configured correctly:

1. **Go to OneSignal Dashboard** → Your App → Settings → Platforms
2. **Web Push**:
   - Site URL: Add your Vercel domain (e.g., `https://your-app.vercel.app`)
   - Auto Resubscribe: Enabled
   - Default Notification Icon: Set an icon URL
3. **Safari Web Push** (if supporting Safari):
   - Configure Safari Web ID
   - Add your Vercel domain

### Solution 5: Add Vercel Domain to Allowed Origins

**File**: `next.config.js`

Ensure your Vercel domain is in the allowed domains:

```javascript
images: {
  domains: [
    'localhost', 
    '127.0.0.1', 
    'commondatastorage.googleapis.com',
    'jpltcratljaypnbdywac.supabase.co',
    'your-app.vercel.app', // ✅ Add your Vercel domain
  ],
},
```

### Solution 6: Check Service Worker Registration

The PWA service worker needs to be properly registered on Vercel. Check if the service worker is accessible:

1. Visit: `https://your-app.vercel.app/sw.js`
2. You should see the service worker code
3. If you get a 404, the service worker isn't being deployed

**Fix**: Ensure `public/sw.js` exists or is generated during build.

## Debugging Steps

### Step 1: Check Environment Variables
```bash
# In Vercel dashboard, verify ONESIGNAL_API_KEY is set
# Or use Vercel CLI:
vercel env ls
```

### Step 2: Check Vercel Logs
```bash
# View deployment logs
vercel logs your-deployment-url

# Look for errors like:
# "OneSignal API Key not found"
# "Error sending notification"
```

### Step 3: Test Notification API Directly

Create a test API route to verify notifications work:

**File**: `src/app/api/test-notification/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { sendNotification } from '@/lib/notifications';

export async function GET() {
  try {
    const result = await sendNotification('Test notification from Vercel', {
      headings: { en: 'Test' },
    });
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      details: error.response?.data 
    }, { status: 500 });
  }
}
```

Then visit: `https://your-app.vercel.app/api/test-notification`

### Step 4: Check Browser Console

On the deployed site, open browser console and check for:
```
OneSignal: Auth change - Logging in user [user-id]
✅ Notification sent successfully: {...}
```

Or errors like:
```
❌ NOTIFICATION ERROR: OneSignal API Key not found
❌ Error sending notification: {...}
```

### Step 5: Verify OneSignal SDK Loading

In browser console:
```javascript
// Check if OneSignal is loaded
console.log(window.OneSignal);

// Check if user is subscribed
OneSignal.User.PushSubscription.id;
```

## Common Issues & Fixes

### Issue 1: "OneSignal API Key not found"
**Fix**: Set `ONESIGNAL_API_KEY` in Vercel environment variables and redeploy.

### Issue 2: Service Worker Not Found (404)
**Fix**: 
1. Check if `public/sw.js` exists
2. Ensure PWA build is working: `npm run build`
3. Check Vercel build logs for PWA generation errors

### Issue 3: Notifications Work Locally But Not on Vercel
**Fix**:
1. Verify environment variables are set in Vercel
2. Check Vercel domain is added to OneSignal allowed origins
3. Ensure HTTPS is working (Vercel provides this by default)

### Issue 4: "Failed to register service worker"
**Fix**:
1. Check service worker path in `layout.tsx`
2. Ensure service worker scope is correct
3. Check for service worker conflicts (multiple PWA libraries)

### Issue 5: User Not Receiving Notifications
**Fix**:
1. Verify user is logged in with OneSignal: `OneSignal.User.PushSubscription.id`
2. Check user has granted notification permission
3. Verify `OneSignal.login(userId)` is being called
4. Check OneSignal dashboard for delivery status

## Verification Checklist

- [ ] `ONESIGNAL_API_KEY` is set in Vercel environment variables
- [ ] Vercel domain is added to OneSignal allowed origins
- [ ] Service worker is accessible at `/sw.js`
- [ ] OneSignal SDK loads without errors
- [ ] User is logged in with OneSignal
- [ ] Notification permission is granted
- [ ] Test notification API route works
- [ ] Browser console shows no errors
- [ ] OneSignal dashboard shows notifications sent

## Next Steps

1. **Set environment variable** in Vercel
2. **Redeploy** the application
3. **Test** with the test API route
4. **Check** browser console and Vercel logs
5. **Verify** in OneSignal dashboard

If issues persist after following these steps, check:
- OneSignal dashboard for delivery errors
- Vercel function logs for runtime errors
- Browser network tab for failed API calls
