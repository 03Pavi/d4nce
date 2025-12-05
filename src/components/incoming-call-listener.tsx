'use client'
import React, { useEffect, useState } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Avatar, Box } from '@mui/material'
import { Videocam, CallEnd } from '@mui/icons-material'
import { io, Socket } from 'socket.io-client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface IncomingCall {
  roomId: string
  callerId: string
  callerName: string
  communityName: string
}

export const IncomingCallListener = () => {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const [userRole, setUserRole] = useState<'admin' | 'student' | null>(null)

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io({
      path: '/socket.io',
    })
    setSocket(newSocket)

    const setupListener = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch profile to know role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      
      if (profile) {
        setUserRole(profile.role as 'admin' | 'student')
      }

      // Join a personal room to receive calls
      newSocket.emit('join-personal-room', user.id)

      newSocket.on('incoming-call', (data: IncomingCall) => {
        console.log('Incoming call received:', data)
        setIncomingCall(data)
        // Play ringtone?
        const audio = new Audio('/sounds/ringtone.mp3') 
        audio.play().catch(e => console.log('Audio play failed', e))
      })
    }

    setupListener()

    return () => {
      newSocket.disconnect()
    }
  }, [])

  const handleAccept = async () => {
    if (!incomingCall) return
    
    try {
      // Get current user info
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      // Emit Socket.IO event to notify caller
      if (socket) {
        socket.emit('call-response', {
          roomId: incomingCall.roomId,
          callerId: incomingCall.callerId,
          responderId: user.id,
          responderName: profile?.full_name || 'User',
          communityName: incomingCall.communityName,
          response: 'accepted'
        })
      }

      // Send push notification to caller
      const { notifyCallAccepted } = await import('@/app/actions/notifications')
      await notifyCallAccepted(
        profile?.full_name || 'User',
        incomingCall.communityName,
        incomingCall.callerId,
        incomingCall.roomId
      )

      // Navigate to call
      const targetPage = userRole === 'admin' ? '/admin' : '/student'
      router.push(`${targetPage}?callId=${incomingCall.roomId}&autoJoin=true&tab=live`)
    } catch (error) {
      console.error('Error accepting call:', error)
    } finally {
      setIncomingCall(null)
    }
  }

  const handleDecline = async () => {
    if (!incomingCall) return

    try {
      // Get current user info
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      // Emit Socket.IO event to notify caller
      if (socket) {
        socket.emit('call-response', {
          roomId: incomingCall.roomId,
          callerId: incomingCall.callerId,
          responderId: user.id,
          responderName: profile?.full_name || 'User',
          communityName: incomingCall.communityName,
          response: 'declined'
        })
      }

      // Send push notification to caller
      const { notifyCallDeclined } = await import('@/app/actions/notifications')
      await notifyCallDeclined(
        profile?.full_name || 'User',
        incomingCall.communityName,
        incomingCall.callerId,
        incomingCall.roomId
      )
    } catch (error) {
      console.error('Error declining call:', error)
    } finally {
      setIncomingCall(null)
    }
  }

  if (!incomingCall) return null

  return (
    <Dialog 
      open={!!incomingCall} 
      onClose={handleDecline}
      PaperProps={{
        sx: { 
          bgcolor: '#1a1a1a', 
          color: 'white', 
          minWidth: 300,
          border: '1px solid #ff0055',
          boxShadow: '0 0 20px rgba(255, 0, 85, 0.3)'
        }
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pt: 4 }}>
        <Avatar 
          sx={{ 
            width: 80, 
            height: 80, 
            bgcolor: '#ff0055', 
            margin: '0 auto',
            mb: 2,
            animation: 'pulse 1.5s infinite'
          }}
        >
          <Videocam sx={{ fontSize: 40 }} />
        </Avatar>
        <Typography variant="h6" fontWeight="bold">
          Incoming Video Call
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ textAlign: 'center' }}>
        <Typography variant="body1" sx={{ mb: 1 }}>
          {incomingCall.callerName} is inviting you to a call
        </Typography>
        <Typography variant="caption" sx={{ color: '#888' }}>
          Community: {incomingCall.communityName}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 4, gap: 2 }}>
        <Button 
          variant="contained" 
          color="error" 
          startIcon={<CallEnd />}
          onClick={handleDecline}
          sx={{ borderRadius: 50, px: 3 }}
        >
          Decline
        </Button>
        <Button 
          variant="contained" 
          color="success" 
          startIcon={<Videocam />}
          onClick={handleAccept}
          sx={{ borderRadius: 50, px: 3, bgcolor: '#00e676', '&:hover': { bgcolor: '#00c853' } }}
        >
          Accept
        </Button>
      </DialogActions>
    </Dialog>
  )
}
