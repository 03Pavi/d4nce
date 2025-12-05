# Message Sync Flow Diagram

## Message Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER SENDS MESSAGE                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. Store in IndexedDB (synced: false)                          │
│  2. Broadcast via Socket.IO (real-time to other users)          │
│  3. Display in UI immediately                                   │
│  4. Reset idle timer                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Message Stored │
                    │  (Unsynced)     │
                    └─────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
        ┌──────────────────┐  ┌──────────────────┐
        │  SYNC TRIGGERS   │  │  USER CONTINUES  │
        │                  │  │    CHATTING      │
        └──────────────────┘  └──────────────────┘
                    │                   │
                    │                   └──► Idle timer resets
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌──────────────┐      ┌──────────────────┐
│ IDLE TIMER   │      │  USER EXITS      │
│ (2 minutes)  │      │                  │
└──────────────┘      └──────────────────┘
        │                       │
        │              ┌────────┴────────┐
        │              │                 │
        │              ▼                 ▼
        │      ┌──────────────┐  ┌──────────────┐
        │      │ Navigate     │  │ Close/Switch │
        │      │ Away         │  │ Tab          │
        │      └──────────────┘  └──────────────┘
        │              │                 │
        └──────────────┴─────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │   SYNC TO SUPABASE           │
        │                              │
        │ 1. Fetch unsynced messages   │
        │ 2. POST to /api/.../sync     │
        │ 3. Mark as synced in DB      │
        └──────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │   Messages Persisted ✅       │
        │   (synced: true)             │
        └──────────────────────────────┘
```

## Sync Trigger Details

### 1. Idle Timer (2 minutes)
```javascript
// Timer starts/resets on message activity
setTimeout(() => {
  if (idleTime >= 2 minutes) {
    syncMessages() // Auto-sync
  }
}, 2 * 60 * 1000)
```

### 2. Component Unmount
```javascript
useEffect(() => {
  return () => {
    syncMessages() // Sync on cleanup
  }
}, [])
```

### 3. Browser Close/Refresh
```javascript
window.addEventListener('beforeunload', () => {
  syncMessages() // Sync before page unloads
})
```

### 4. Tab Switch/Minimize
```javascript
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    syncMessages() // Sync when tab hidden
  }
})
```

## Message States

| State | Description | Indicator |
|-------|-------------|-----------|
| **Sent** | Message sent, stored in IndexedDB | Yellow dot 🟡 |
| **Syncing** | Being uploaded to Supabase | Loading... |
| **Synced** | Saved in Supabase | No indicator |

## Real-Time Flow (Multiple Users)

```
User A                          Server                      User B
  │                               │                           │
  │─── Send Message ─────────────▶│                           │
  │    (IndexedDB)                │                           │
  │                               │                           │
  │                               │─── Socket.IO Broadcast ──▶│
  │                               │                           │
  │                               │                           │─── Receive
  │                               │                           │    (IndexedDB)
  │                               │                           │
  │                               │                           │
  ├─── (2 min idle) ──────────────┤                           │
  │                               │                           │
  │─── Sync to Supabase ─────────▶│                           │
  │                               │                           │
  │◀── Sync Complete ─────────────│                           │
  │    (synced: true)             │                           │
```

## Console Logs Timeline

```
✅ Socket.IO connected: abc123
📡 Joined community chat: b1f1fa9f-...
📤 Sending message via Socket.IO: {connected: true}
⏱️  Idle timer started (2 minutes)
...
(2 minutes pass)
...
⏰ Community idle for 2 minutes, syncing messages to Supabase...
📊 Syncing 5 messages to Supabase...
✅ Successfully synced 5 messages
```

OR

```
✅ Socket.IO connected: abc123
📡 Joined community chat: b1f1fa9f-...
📤 Sending message via Socket.IO: {connected: true}
...
(User switches tab)
...
👁️ Tab hidden, syncing messages...
📊 Syncing 3 messages to Supabase...
✅ Successfully synced 3 messages
```

## Benefits Summary

✅ **Zero Message Loss** - All scenarios covered
✅ **Reduced Server Load** - Batch syncing
✅ **Better UX** - No sync delays during chat
✅ **Offline Ready** - IndexedDB persistence
✅ **Real-time** - Socket.IO for instant delivery
