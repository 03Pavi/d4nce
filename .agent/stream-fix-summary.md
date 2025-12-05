# Fix: Streams Not Working When User Starts Call from Community

## Problem Summary
When users initiated video calls from the community chat, the call interface would load but video/audio streams would not be established between participants.

## Root Cause
The `LiveSession` component was passing a **conditional role** to the `useLiveStream` hook:

```typescript
// ❌ BEFORE (Incorrect)
const { localStream, remoteStreams, ... } = useLiveStream(
    isLive ? role : 'student',  // Role changes based on isLive state
    sessionId, 
    userName, 
    isLive
);
```

### Why This Caused Issues:

1. **Initial State**: When the component first renders, `isLive = false`
2. **Wrong Role**: The hook receives `'student'` as the role, even if the user is an admin
3. **Auto-Join**: When `autoJoin=true` (from community calls), `isLive` changes to `true`
4. **Hook Re-initialization**: The hook re-runs with the correct role, but this causes:
   - Stream acquisition to happen twice
   - Potential race conditions
   - Inconsistent peer connections
   - The role parameter changing mid-session

## Solution

### Fix 1: Remove Conditional Role Logic
Changed the `useLiveStream` call to always use the actual user role:

```typescript
// ✅ AFTER (Correct)
const { localStream, remoteStreams, ... } = useLiveStream(
    role,  // Always use the actual user role
    sessionId, 
    userName, 
    isLive  // This controls whether the hook is enabled
);
```

**File**: `/src/modules/classes/components/live-class/components/live-session.tsx`
**Line**: 49

### Fix 2: Added Debug Logging
Added comprehensive logging to track stream initialization:

```typescript
console.log('🎥 Initializing live stream:', { role, channelName, userName, enabled });
```

This helps identify when and how streams are being initialized, especially for community calls.

**File**: `/src/modules/classes/components/live-class/hooks/use-live-stream.ts`
**Line**: 27

### Fix 3: Added Stream Null Check
Added warning when attempting to call a peer without a local stream:

```typescript
if (!stream) {
    console.warn(`⚠️ Attempting to call peer ${targetPeerId} without local stream!`);
}
```

This helps identify cases where the stream hasn't been acquired yet when trying to connect to peers.

**File**: `/src/modules/classes/components/live-class/hooks/use-live-stream.ts`
**Line**: 156-158

## How It Works Now

### Community Call Flow:

1. **User starts call** from community chat
   ```typescript
   window.location.href = `/student?callId=${roomId}&autoJoin=true&tab=live`;
   ```

2. **Student page** receives parameters:
   - `callId`: The unique room ID for this call
   - `autoJoin=true`: Flag to automatically join the call
   - `tab=live`: Switch to the live session tab

3. **LiveSession component** initializes:
   - `isLive = false` initially
   - `autoJoin = true` from URL params
   - Hook is called with `enabled=false` (no stream acquisition yet)

4. **Auto-join effect** triggers:
   ```typescript
   useEffect(() => {
       if (autoJoin && !isLive) {
           setIsLive(true);  // Enable the stream
       }
   }, [autoJoin]);
   ```

5. **Hook re-runs** with `enabled=true`:
   - Now with the **correct role** from the start
   - Acquires local media stream (camera/microphone)
   - Connects to Socket.IO server
   - Initializes PeerJS with the correct role
   - Joins the room with `callId` as the channel name

6. **Peer connections** are established:
   - Existing users in the room are notified
   - New user calls existing users with their stream
   - Incoming calls are answered with local stream
   - Remote streams are received and displayed

## Testing

### Test Case 1: Admin Starts Call
1. Admin opens community chat
2. Clicks "Call" button
3. Selects members to invite
4. Clicks "Start Call"
5. **Expected**: Admin's stream should be visible immediately
6. **Check console** for:
   ```
   🎥 Initializing live stream: { role: 'admin', channelName: 'room-...', userName: '...', enabled: true }
   Requesting local stream...
   Local stream obtained
   Socket connected: ...
   PeerJS connected with ID: ...
   ```

### Test Case 2: Student Accepts Call
1. Student receives call notification
2. Clicks "Accept"
3. **Expected**: Redirects to call interface with both streams visible
4. **Check console** for same initialization logs with `role: 'student'`

### Test Case 3: Multiple Participants
1. Admin starts call with 3 students
2. All students accept
3. **Expected**: All 4 participants can see each other's streams
4. **Check console** for:
   ```
   Existing users: [...]
   Calling peer ...
   Received stream from called peer: ...
   ```

## Debug Console Logs

When everything works correctly, you should see:

```
🎥 Initializing live stream: { role: 'admin', channelName: 'room-community-xxx-1234567890', userName: 'John Doe', enabled: true }
Requesting local stream...
Local stream obtained
Socket connected: abc123
Initializing PeerJS with ID: def456-789-ghi as admin
PeerJS connected with ID: def456-789-ghi
Existing users: [{ userId: 'xyz789', userName: 'Jane Smith' }]
Calling peer xyz789...
Received stream from called peer: xyz789
```

If you see warnings like:
```
⚠️ Attempting to call peer xyz789 without local stream!
```

This indicates the stream hasn't been acquired yet, which could be due to:
- User denied camera/microphone permissions
- Browser doesn't support getUserMedia
- Stream acquisition is still in progress

## Files Modified

1. `/src/modules/classes/components/live-class/components/live-session.tsx`
   - Removed conditional role logic (line 49)

2. `/src/modules/classes/components/live-class/hooks/use-live-stream.ts`
   - Added initialization debug logging (line 27)
   - Added stream null check warning (lines 156-158)

3. `/.agent/stream-issue-analysis.md`
   - Created detailed analysis document

4. `/.agent/stream-fix-summary.md`
   - This document

## Next Steps

If streams still don't work after this fix:

1. **Check browser console** for errors or warnings
2. **Verify permissions**: Ensure camera/microphone permissions are granted
3. **Check network**: Ensure WebRTC can establish connections (not blocked by firewall)
4. **Test STUN servers**: The app uses Google's STUN servers - ensure they're accessible
5. **Check Socket.IO**: Verify the Socket.IO server is running and accessible
6. **Check PeerJS**: Verify PeerJS server is running (or using cloud PeerJS)

## Additional Notes

- The `enabled` parameter in `useLiveStream` controls whether the hook initializes
- When `enabled` changes from `false` to `true`, the hook completely re-initializes
- This is intentional and allows for lazy stream acquisition
- The role should **never** change during a session - it's a user property, not a session property
