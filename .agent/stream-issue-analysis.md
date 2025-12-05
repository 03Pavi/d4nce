# Stream Issue Analysis: Community Calls Not Working

## Problem
When a user starts a call from the community, the video streams are not working. The call interface loads, but no video/audio streams are established.

## Root Cause

### Flow Analysis

1. **Call Initiation** (`communities-list.tsx` line 159):
   ```typescript
   window.location.href = `/student?callId=${roomId}&autoJoin=true&tab=live`;
   ```

2. **Student Page** (`student/page.tsx` lines 64-71):
   ```typescript
   const callId = searchParams.get('callId');
   const autoJoinParam = searchParams.get('autoJoin');
   setAutoJoin(autoJoinParam === 'true');
   
   if (callId) {
       setCurrentSessionId(callId);
       setValue(0); // Switch to Live tab
   }
   ```

3. **LiveSession Component** (`live-session.tsx` line 20):
   ```typescript
   export const LiveSession = ({ autoJoin = false, ... }) => {
       const [isLive, setIsLive] = useState(false); // ❌ Starts as FALSE
       
       // Hook is called with enabled=false initially
       const { localStream, remoteStreams, ... } = useLiveStream(
           isLive ? role : 'student',  // ❌ role is 'student' when isLive=false
           sessionId, 
           userName, 
           isLive  // ❌ enabled=false initially
       );
   ```

4. **Auto-Join Effect** (`live-session.tsx` lines 62-67):
   ```typescript
   useEffect(() => {
       if (autoJoin && !isLive) {
           setIsLive(true);  // ✅ Sets isLive to true
       }
   }, [autoJoin]);
   ```

5. **The Problem**:
   - The `useLiveStream` hook is initialized with `enabled=false`
   - When `isLive` changes to `true`, the hook **DOES** re-run because `enabled` is in the dependency array
   - However, there's a timing issue: the hook initializes, but the stream acquisition happens asynchronously
   - The real issue is that when `isLive=false`, the role passed is `'student'` instead of the actual role

## The Real Issue

Looking more carefully at line 49:
```typescript
const { localStream, remoteStreams, ... } = useLiveStream(
    isLive ? role : 'student',  // ❌ This is the problem!
    sessionId, 
    userName, 
    isLive
);
```

When `isLive=false` initially:
- Role passed to hook: `'student'` (even if user is admin)
- Enabled: `false`

When `isLive` changes to `true`:
- Role passed to hook: actual `role` value
- Enabled: `true`
- **The hook re-initializes because dependencies changed**

But there's another issue: **The role shouldn't change based on isLive state**. The user's role is fixed.

## Additional Issues Found

### Issue 1: Conditional Role
The role parameter should always be the user's actual role, not conditionally set based on `isLive`.

### Issue 2: Stream Initialization Timing
When `autoJoin=true`, the component:
1. Renders with `isLive=false`
2. Hook initializes with `enabled=false` (no stream requested)
3. Effect runs, sets `isLive=true`
4. Hook re-runs with `enabled=true`
5. Stream acquisition starts

This should work, but there might be race conditions or cleanup issues.

### Issue 3: Socket Room Joining
Looking at `use-live-stream.ts` line 92:
```typescript
socket.emit('join-room', channelName, id, userName);
```

The `channelName` is the `sessionId` which is the `callId` from the community call. This should be correct.

## Solution

### Fix 1: Remove Conditional Role
The role should always be the actual user role, not conditional on `isLive`:

```typescript
const { localStream, remoteStreams, ... } = useLiveStream(
    role,  // ✅ Always use actual role
    sessionId, 
    userName, 
    isLive  // This controls whether the hook is enabled
);
```

### Fix 2: Ensure Proper Cleanup
Make sure the hook properly cleans up and re-initializes when `enabled` changes from `false` to `true`.

### Fix 3: Add Debug Logging
Add console logs to track the stream initialization process when joining from community calls.

## Testing Steps

1. Start a call from community as admin
2. Check console for:
   - "Requesting local stream..."
   - "Local stream obtained"
   - "Socket connected: [socket-id]"
   - "Initializing PeerJS with ID: [peer-id] as admin"
   - "PeerJS connected with ID: [peer-id]"
   - "Existing users: [...]"

3. Accept call as student
4. Check console for same logs
5. Verify streams are exchanged

## Files to Modify

1. `/src/modules/classes/components/live-class/components/live-session.tsx`
   - Line 49: Remove conditional role logic

2. `/src/modules/classes/components/live-class/hooks/use-live-stream.ts`
   - Add debug logging for community calls
   - Ensure proper cleanup on `enabled` state change
