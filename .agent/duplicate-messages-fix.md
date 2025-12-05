# Duplicate Messages on Refresh - Fix

## Problem
When refreshing the chat page, duplicate messages were appearing. This happened because:

1. **Initial Load**: Messages are fetched from the API and stored in IndexedDB
2. **Socket.IO Reconnection**: After refresh, Socket.IO reconnects and may re-emit recent messages
3. **No Duplicate Check**: The code was adding these re-emitted messages to the state without checking if they already existed
4. **IndexedDB Errors**: Using `add()` instead of `put()` caused silent failures when duplicate IDs were encountered

## Solution

### 1. State-Level Duplicate Prevention (`community-chat.tsx`)
Added a check in the Socket.IO message handler to prevent adding messages that already exist in the React state:

```tsx
socketRef.current.on('new-community-message', async (message: CommunityMessage) => {
  // Check if message already exists in state
  setMessages(prev => {
    const exists = prev.some(m => m.id === message.id)
    if (exists) {
      console.log('⚠️ Message already exists, skipping:', message.id)
      return prev
    }
    
    // Add new message
    return [...prev, message]
  })
})
```

### 2. Database-Level Duplicate Handling (`message-db.ts`)
Changed from `add()` to `put()` in IndexedDB operations:

- **`add()`**: Throws an error if a record with the same key already exists
- **`put()`**: Updates the existing record if the key exists, or creates a new one

This change was applied to:
- `addMessage()` - Single message insert
- `addMessages()` - Bulk message insert

## Benefits

1. **No More Duplicates**: Messages are only added to the UI once, even if Socket.IO re-emits them
2. **Graceful Error Handling**: IndexedDB operations won't fail when encountering duplicate IDs
3. **Better Performance**: Prevents unnecessary re-renders and state updates
4. **Cleaner Logs**: Console warnings help debug message flow

## Testing

To verify the fix:
1. Open a community chat
2. Send a few messages
3. Refresh the page (F5 or Ctrl+R)
4. Check that messages appear only once
5. Check browser console for "Message already exists" warnings (if Socket.IO re-emits)

## Related Files
- `/src/modules/communities/components/community-chat.tsx`
- `/src/lib/message-db.ts`
