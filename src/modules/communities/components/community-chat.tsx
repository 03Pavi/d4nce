'use client'
import React, { useState, useEffect, useRef } from 'react'
import { Box, Typography, TextField, IconButton, Avatar, Paper, CircularProgress } from '@mui/material'
import { Send } from '@mui/icons-material'
import { io, Socket } from 'socket.io-client'
import { messageDB, CommunityMessage } from '@/lib/message-db'
import { useRouter } from 'next/navigation'

interface CommunityChatProps {
  communityId: string
  communityName: string
  currentUserId: string
}

// Idle time in milliseconds (1-3 minutes configurable)
const IDLE_TIME_MIN = 1 * 60 * 1000 // 1 minute
const IDLE_TIME_MAX = 3 * 60 * 1000 // 3 minutes
const IDLE_SYNC_TIME = 2 * 60 * 1000 // 2 minutes (middle value)

export const CommunityChat = ({ communityId, communityName, currentUserId }: CommunityChatProps) => {
  const [messages, setMessages] = useState<CommunityMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<Socket | null>(null)
  const unsyncedCountRef = useRef(0)
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  const router = useRouter()

  useEffect(() => {
    initChat()
    
    // Sync messages when user leaves the page/tab
    const handleBeforeUnload = async () => {
      console.log('🚪 User leaving, syncing messages...')
      await syncMessages()
    }

    // Sync messages when user switches tabs or minimizes browser
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        console.log('👁️ Tab hidden, syncing messages...')
        await syncMessages()
      }
    }

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      // Sync messages when component unmounts (user navigates away)
      console.log('🚪 Component unmounting, syncing messages...')
      syncMessages()
      
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
      // Clear idle timer on unmount
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
      
      // Remove event listeners
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [communityId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Start idle timer for syncing
  const startIdleTimer = () => {
    // Clear existing timer
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
    }
    
    // Set new timer
    lastActivityRef.current = Date.now()
    idleTimerRef.current = setTimeout(async () => {
      const idleTime = Date.now() - lastActivityRef.current
      
      // If idle for the configured time, sync to Supabase
      if (idleTime >= IDLE_SYNC_TIME) {
        console.log('Community idle for 2 minutes, syncing messages to Supabase...')
        await syncMessages()
      }
    }, IDLE_SYNC_TIME)
  }

  const initChat = async () => {
    try {
      setLoading(true)
      
      // Initialize IndexedDB
      await messageDB.init()
      
      // Fetch user profile
      const profileRes = await fetch('/api/profile')
      if (profileRes.ok) {
        const profile = await profileRes.json()
        setUserProfile(profile)
      }
      
      // Load messages from IndexedDB
      const localMessages = await messageDB.getMessages(communityId)
      setMessages(localMessages)
      
      // If no local messages, fetch from API
      if (localMessages.length === 0) {
        const res = await fetch(`/api/communities/messages?communityId=${communityId}`)
        if (res.ok) {
          const serverMessages = await res.json()
          // Store in IndexedDB with community_id and update state
          const messagesWithCommunityId = []
          for (const msg of serverMessages) {
            const messageWithId = { 
              ...msg, 
              community_id: communityId, // Ensure community_id is set
              synced: true 
            }
            await messageDB.addMessage(messageWithId)
            messagesWithCommunityId.push(messageWithId)
          }
          setMessages(messagesWithCommunityId)
        }
      }
      
      // Connect to Socket.IO
      socketRef.current = io({ path: '/socket.io' })
      
      // Add connection event listeners for debugging
      socketRef.current.on('connect', () => {
        console.log('✅ Socket.IO connected:', socketRef.current?.id)
      })
      
      socketRef.current.on('connect_error', (error) => {
        console.error('❌ Socket.IO connection error:', error)
      })
      
      socketRef.current.on('disconnect', (reason) => {
        console.log('🔌 Socket.IO disconnected:', reason)
      })
      
      socketRef.current.emit('join-community-chat', { communityId, userId: currentUserId })
      console.log(`📡 Joined community chat: ${communityId}`)
      
      socketRef.current.on('new-community-message', async (message: CommunityMessage) => {
        console.log('📨 Received new message:', message)
        // Add to IndexedDB
        await messageDB.addMessage({ ...message, synced: true })
        setMessages(prev => [...prev, message])
        // Reset idle timer on new message
        startIdleTimer()
      })
      
      // Start idle timer
      startIdleTimer()
      
    } catch (error) {
      console.error('Error initializing chat:', error)
    } finally {
      setLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const syncMessages = async () => {
    try {
      const unsyncedMessages = await messageDB.getUnsyncedMessages(communityId)
      
      if (unsyncedMessages.length > 0) {
        console.log(`Syncing ${unsyncedMessages.length} messages to Supabase...`)
        
        const messagesToSync = unsyncedMessages.map(msg => ({
          community_id: msg.community_id,
          user_id: msg.user_id,
          content: msg.content,
          created_at: msg.created_at
        }))
        
        const res = await fetch('/api/communities/messages/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: messagesToSync })
        })
        
        if (res.ok) {
          const messageIds = unsyncedMessages.map(m => m.id)
          await messageDB.markAsSynced(messageIds)
          console.log(`Successfully synced ${unsyncedMessages.length} messages`)
        } else {
          console.error('Failed to sync messages:', await res.text())
        }
      }
    } catch (error) {
      console.error('Error syncing messages:', error)
    }
  }

  const handleSend = async () => {
    if (!newMessage.trim() || !userProfile) return

    try {
      const message: CommunityMessage = {
        id: `${Date.now()}-${Math.random()}`,
        community_id: communityId,
        user_id: currentUserId,
        content: newMessage.trim(),
        created_at: new Date().toISOString(),
        profiles: {
          full_name: userProfile.full_name,
          avatar_url: userProfile.avatar_url
        },
        synced: false
      }
      
      // Add to IndexedDB immediately
      await messageDB.addMessage(message)
      setMessages(prev => [...prev, message])
      
      // Emit via Socket.IO for real-time
      if (socketRef.current) {
        console.log('📤 Sending message via Socket.IO:', {
          communityId,
          messageId: message.id,
          connected: socketRef.current.connected
        })
        socketRef.current.emit('send-community-message', {
          communityId,
          message
        })
      } else {
        console.error('❌ Socket not connected, message not sent in real-time')
      }
      
      // Reset idle timer - will sync to Supabase if idle for 2 minutes
      startIdleTimer()
      
      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleAvatarClick = (userId: string) => {
    // Navigate to profile (you can create a profile view page)
    router.push(`/profile/${userId}`)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#1a1a1a', borderRadius: 2, overflow: 'hidden' }}>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress size={30} sx={{ color: '#ff0055' }} />
          </Box>
        ) : messages.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#666' }}>
            <Typography>No messages yet. Start the conversation!</Typography>
          </Box>
        ) : (
          messages.map((msg) => {
            const isMe = msg.user_id === currentUserId
            return (
              <Box 
                key={msg.id} 
                sx={{ 
                  display: 'flex', 
                  justifyContent: isMe ? 'flex-end' : 'flex-start',
                  gap: 1
                }}
              >
                {!isMe && (
                  <Avatar 
                    src={msg.profiles.avatar_url} 
                    sx={{ 
                      width: 32, 
                      height: 32, 
                      mt: 0.5,
                      cursor: 'pointer',
                      '&:hover': { opacity: 0.8 }
                    }}
                    onClick={() => handleAvatarClick(msg.user_id)}
                  />
                )}
                <Box sx={{ maxWidth: '70%' }}>
                  {!isMe && (
                    <Typography variant="caption" sx={{ color: '#888', ml: 1 }}>
                      {msg.profiles.full_name}
                    </Typography>
                  )}
                  <Paper 
                    sx={{ 
                      p: 1.5, 
                      bgcolor: isMe ? '#ff0055' : '#333', 
                      color: 'white',
                      borderRadius: 2,
                      borderTopLeftRadius: !isMe ? 0 : 2,
                      borderTopRightRadius: isMe ? 0 : 2,
                      position: 'relative'
                    }}
                  >
                    <Typography variant="body2">{msg.content}</Typography>
                    {!msg.synced && isMe && (
                      <Box sx={{ 
                        position: 'absolute', 
                        bottom: 2, 
                        right: 2, 
                        width: 6, 
                        height: 6, 
                        bgcolor: '#ffd700', 
                        borderRadius: '50%' 
                      }} />
                    )}
                  </Paper>
                  <Typography variant="caption" sx={{ color: '#666', display: 'block', textAlign: isMe ? 'right' : 'left', mt: 0.5, fontSize: '0.7rem' }}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Box>
              </Box>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </Box>

      <Box sx={{ p: 2, bgcolor: '#111', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          size="small"
          sx={{ 
            '& .MuiOutlinedInput-root': {
              bgcolor: 'rgba(255,255,255,0.05)',
              color: 'white',
              '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
              '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
              '&.Mui-focused fieldset': { borderColor: '#ff0055' },
            }
          }}
        />
        <IconButton 
          onClick={handleSend} 
          disabled={!newMessage.trim()}
          sx={{ 
            bgcolor: '#ff0055', 
            color: 'white', 
            '&:hover': { bgcolor: '#cc0044' },
            '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.1)', color: '#666' }
          }}
        >
          <Send />
        </IconButton>
      </Box>
    </Box>
  )
}
