# Socket.IO Real-Time Messaging Troubleshooting

## Current Status
✅ Socket.IO server is configured in `server.js`
✅ Client-side Socket.IO connection code is in place
✅ Added comprehensive debugging logs

## How to Debug

### 1. Check if Server is Running with Socket.IO
Make sure you're running the dev server with:
```bash
npm run dev
```

**NOT** with `next dev` (this won't include Socket.IO)

### 2. Open Browser Console
Open the browser console (F12) and look for these logs:

**On page load:**
- ✅ `Socket.IO connected: <socket-id>` - Connection successful
- 📡 `Joined community chat: <community-id>` - Joined chat room

**When sending a message:**
- 📤 `Sending message via Socket.IO: {communityId, messageId, connected: true}`

**When receiving a message (on other user's browser):**
- 📨 `Received new message: <message-object>`

### 3. Common Issues

#### Issue: "Socket not connected"
**Symptoms:** Console shows `❌ Socket not connected, message not sent in real-time`
**Solution:** 
- Restart the dev server with `npm run dev`
- Make sure you're not using `next dev`

#### Issue: "Connection error"
**Symptoms:** Console shows `❌ Socket.IO connection error`
**Solution:**
- Check if port 3000 is available
- Check server.js is running without errors

#### Issue: Messages not received by other users
**Symptoms:** 
- Sender sees: `📤 Sending message via Socket.IO: {connected: true}`
- Receiver doesn't see: `📨 Received new message`

**Solution:**
- Both users must be in the same community
- Check server console for: `Message sent to community <id>`
- Verify both users joined the chat (server logs: `User <id> joined community chat <id>`)

## Server-Side Logs
Check your terminal running `npm run dev` for:
- `Client connected: <socket-id>`
- `User <user-id> joined community chat <community-id>`
- `Message sent to community <community-id>`

## Testing Steps
1. Open two browser windows (or one normal + one incognito)
2. Login as different users in each window
3. Both join the same community chat
4. Send a message from User A
5. User B should receive it instantly

## Expected Console Output

**User A (Sender):**
```
✅ Socket.IO connected: abc123
📡 Joined community chat: b1f1fa9f-93f1-4bb7-a9eb-af4ba2957526
📤 Sending message via Socket.IO: {communityId: "b1f1...", messageId: "...", connected: true}
```

**User B (Receiver):**
```
✅ Socket.IO connected: xyz789
📡 Joined community chat: b1f1fa9f-93f1-4bb7-a9eb-af4ba2957526
📨 Received new message: {id: "...", content: "hello", ...}
```
