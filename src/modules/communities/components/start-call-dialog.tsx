'use client'
import React, { useState, useEffect } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, List, ListItem, ListItemButton, ListItemAvatar, Avatar, ListItemText, Checkbox, Typography, Box, CircularProgress } from '@mui/material'
import { VideoCall } from '@mui/icons-material'

interface Member {
  id: string
  user_id: string
  profiles: {
    full_name: string
    avatar_url: string
  }
}

interface StartCallDialogProps {
  open: boolean
  onClose: () => void
  communityId: string
  currentUserId: string
  onStartCall: (selectedUserIds: string[]) => void
}

export const StartCallDialog = ({ open, onClose, communityId, currentUserId, onStartCall }: StartCallDialogProps) => {
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (open) {
      fetchMembers()
      setSelectedMembers(new Set())
    }
  }, [open, communityId])

  const fetchMembers = async () => {
    try {
      setLoading(true)
      
      const res = await fetch(`/api/communities/members?communityId=${communityId}`);
      if (!res.ok) throw new Error('Failed to fetch members');
      
      const allMembers = await res.json();
      setMembers(allMembers);

    } catch (error) {
      console.error('Error fetching members for call:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleMember = (userId: string) => {
    const newSelected = new Set(selectedMembers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedMembers(newSelected)
  }

  const handleStart = () => {
    onStartCall(Array.from(selectedMembers))
    onClose()
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      PaperProps={{
        sx: { bgcolor: '#1a1a1a', color: 'white', minWidth: 350 }
      }}
    >
      <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        Start Video Call
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Typography variant="body2" sx={{ color: '#888', mb: 2 }}>
          Select members to invite to the call:
        </Typography>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress sx={{ color: '#ff0055' }} />
          </Box>
        ) : (
          <List sx={{ maxHeight: 300, overflow: 'auto' }}>
            {members.map((member) => (
              <ListItem 
                key={member.id}
                disablePadding
                secondaryAction={
                  <Checkbox
                    edge="end"
                    checked={selectedMembers.has(member.user_id)}
                    onChange={() => handleToggleMember(member.user_id)}
                    sx={{ 
                      color: '#666',
                      '&.Mui-checked': { color: '#ff0055' }
                    }}
                  />
                }
              >
                <ListItemButton onClick={() => handleToggleMember(member.user_id)}>
                  <ListItemAvatar>
                    <Avatar src={member.profiles.avatar_url} />
                  </ListItemAvatar>
                  <ListItemText 
                    primary={member.profiles.full_name} 
                    primaryTypographyProps={{ color: 'white' }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
            {members.length === 0 && (
              <Typography sx={{ color: '#666', textAlign: 'center', py: 2 }}>
                No other members available to call.
              </Typography>
            )}
          </List>
        )}
      </DialogContent>
      <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', p: 2 }}>
        <Button onClick={onClose} sx={{ color: '#888' }}>Cancel</Button>
        <Button 
          variant="contained" 
          onClick={handleStart}
          disabled={selectedMembers.size === 0}
          startIcon={<VideoCall />}
          sx={{ bgcolor: '#ff0055', '&:hover': { bgcolor: '#cc0044' } }}
        >
          Start Call
        </Button>
      </DialogActions>
    </Dialog>
  )
}
