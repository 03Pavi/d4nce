# Community Chat Idle Sync Implementation

## Overview
Implemented an intelligent message syncing system that stores messages in IndexedDB and syncs to Supabase based on community activity and user behavior.

## Key Features

### 1. **Smart Sync System**
Messages are automatically synced to Supabase in the following scenarios:

#### a) **Idle Detection** (2 minutes)
- When the community chat is idle for 2 minutes, all unsynced messages sync to Supabase
- Timer resets whenever a user sends or receives a message

#### b) **User Leaves Chat** ⭐ NEW
Messages sync immediately when:
- **Component unmounts** - User navigates to another page
- **Browser closes** - User closes the browser/tab
- **Tab switches** - User switches to another tab or minimizes browser
- **Page refresh** - User refreshes the page

This ensures **zero message loss** regardless of how the user exits the chat.

### 2. **Message Storage Strategy**
- **Immediate**: Messages are stored in IndexedDB immediately when sent
- **Real-time**: Messages are broadcast via Socket.IO for instant delivery
- **Smart Sync**: Messages are synced to Supabase based on the triggers above

### 3. **Bug Fixes**
- **Fixed Empty Messages**: Ensured `community_id` is properly set when storing messages from API
- **Proper Cleanup**: All timers and event listeners are cleaned up on component unmount

## Configuration

```typescript
// Idle time constants (in milliseconds)
const IDLE_TIME_MIN = 1 * 60 * 1000 // 1 minute
const IDLE_TIME_MAX = 3 * 60 * 1000 // 3 minutes
const IDLE_SYNC_TIME = 2 * 60 * 1000 // 2 minutes (current setting)
```

## How It Works

### Scenario 1: Active Chatting
1. User sends message → Stored in IndexedDB with `synced: false`
2. Message broadcast via Socket.IO
3. Idle timer resets
4. User continues chatting...
5. After 2 minutes of no activity → Auto-sync to Supabase

### Scenario 2: User Leaves Chat
1. User has unsynced messages in IndexedDB
2. User navigates away / closes tab / switches tab
3. **Immediate sync triggered** → All unsynced messages saved to Supabase
4. No messages lost!

### Scenario 3: New Message Received
1. Message received via Socket.IO
2. Stored in IndexedDB with `synced: true` (already in Supabase)
3. Idle timer resets

## Sync Triggers Summary

| Trigger | When | Priority |
|---------|------|----------|
| **Idle Timer** | 2 minutes of inactivity | Normal |
| **Component Unmount** | User navigates away | Immediate |
| **Browser Close** | User closes browser/tab | Immediate |
| **Tab Hidden** | User switches tabs | Immediate |

## Benefits

- **Zero Message Loss**: Messages saved even if user suddenly leaves
- **Reduced API Calls**: Batch sync instead of individual saves
- **Better Performance**: Less network traffic during active conversations
- **Offline Support**: Messages stored locally first, synced when possible
- **User Experience**: No interruption during active chatting

## Visual Indicators

- **Yellow dot**: Appears on unsynced messages (visible only to sender)
- **Console logs**: Track sync operations for debugging
  - 🚪 `User leaving, syncing messages...`
  - 👁️ `Tab hidden, syncing messages...`
  - 🚪 `Component unmounting, syncing messages...`

## Event Listeners

The component uses these browser events:
- `beforeunload` - Triggered when browser/tab closes
- `visibilitychange` - Triggered when tab visibility changes
- Component cleanup - Triggered on React unmount
