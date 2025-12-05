'use client'
import React, { useState, useEffect, useRef } from 'react'
import { Box, Typography, TextField, IconButton, List, ListItem, ListItemText, ListItemAvatar, Avatar, Paper, CircularProgress } from '@mui/material'
import { Send } from '@mui/icons-material'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id: string
  user_id: string
  content: string
  created_at: string
  profiles: {
    full_name: string
    avatar_url: string
  }
}

import { notifyNewMessage } from '@/app/actions/notifications';

interface CommunityChatProps {
  communityId: string
  communityName: string
  currentUserId: string
}

export const CommunityChat = ({ communityId, communityName, currentUserId }: CommunityChatProps) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const supabase = createClient()

  useEffect(() => {
    fetchMessages()
    
    // Subscribe to new messages
    const channel = supabase
      .channel(`community-chat-${communityId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_messages',
          filter: `community_id=eq.${communityId}`
        },
        async (payload) => {
          // Fetch user profile for the new message
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', payload.new.user_id)
            .single()
            
          if (profile) {
            const newMsg = {
              ...payload.new,
              profiles: profile
            } as Message
            setMessages(prev => [...prev, newMsg])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [communityId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('community_messages')
        .select(`
          id,
          user_id,
          content,
          created_at,
          profiles:profiles!community_messages_user_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .eq('community_id', communityId)
        .order('created_at', { ascending: true })

      if (error) throw error
      
      if (data) {
        // @ts-ignore
        setMessages(data)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!newMessage.trim()) return

    try {
      const { error } = await supabase
        .from('community_messages')
        .insert({
          community_id: communityId,
          user_id: currentUserId,
          content: newMessage.trim()
        })

      if (error) throw error
      
      // Send Notification
      // 1. Get sender name
      const { data: senderProfile } = await supabase.from('profiles').select('full_name').eq('id', currentUserId).single();
      const senderName = senderProfile?.full_name || 'Member';

      // 2. Get receiver IDs (all approved members except sender)
      const { data: members } = await supabase
        .from('community_members')
        .select('user_id')
        .eq('community_id', communityId)
        .eq('status', 'approved')
        .neq('user_id', currentUserId);
      
      const receiverIds = members?.map(m => m.user_id) || [];

      if (receiverIds.length > 0) {
        await notifyNewMessage(senderName, communityName, newMessage.trim(), receiverIds, communityId);
      }

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
                  <Avatar src={msg.profiles.avatar_url} sx={{ width: 32, height: 32, mt: 0.5 }} />
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
                      borderTopRightRadius: isMe ? 0 : 2
                    }}
                  >
                    <Typography variant="body2">{msg.content}</Typography>
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
