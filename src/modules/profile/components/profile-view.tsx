'use client'
import React, { useState, useEffect } from 'react'
import { 
  Box, 
  Typography, 
  Avatar, 
  Button, 
  Grid, 
  IconButton, 
  CircularProgress} from '@mui/material'
import { Edit, Delete } from '@mui/icons-material'
import { createClient } from '@/lib/supabase/client'
import { EditProfileDialog } from './edit-profile-dialog'

import { UserListDialog } from './user-list-dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'

export const ProfileView = () => {
  const [profile, setProfile] = useState<any>(null)
  const [reels, setReels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [userListOpen, setUserListOpen] = useState(false)
  const [userListType, setUserListType] = useState<'followers' | 'following'>('followers')
  
  // Delete Confirmation State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const supabase = createClient()

  useEffect(() => {
    fetchMyProfile()
  }, [])

  const fetchMyProfile = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. Fetch Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (profileError) throw profileError
      setProfile(profileData)

      // 2. Fetch My Reels
      const { data: reelsData, error: reelsError } = await supabase
        .from('reels')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (reelsError) throw reelsError
      setReels(reelsData || [])

    } catch (err) {
      console.error('Error fetching profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteReel = (reelId: string) => {
    setDeleteId(reelId);
    setConfirmOpen(true);
  }

  const handleConfirmDelete = async () => {
    if (!deleteId) return;

    try {
        await supabase.from('reels').delete().eq('id', deleteId)
        setReels(prev => prev.filter(r => r.id !== deleteId))
    } catch (err) {
        console.error('Error deleting reel:', err)
    } finally {
        setConfirmOpen(false);
        setDeleteId(null);
    }
  }

  const handleOpenUserList = (type: 'followers' | 'following') => {
      setUserListType(type);
      setUserListOpen(true);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress color="secondary" />
      </Box>
    )
  }

  return (
    <Box sx={{ height: '100%', overflowY: 'auto', bgcolor: 'black', color: 'white', pb: 10 }}>
      {/* Header / Cover Area (Optional, just using spacing for now) */}
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* Avatar & Edit */}
        <Box sx={{ position: 'relative', mb: 2 }}>
          <Avatar 
            src={profile?.avatar_url} 
            sx={{ width: 100, height: 100, border: '3px solid var(--primary)' }}
          />
        </Box>

        <Typography variant="h5" fontWeight="bold" sx={{ mb: 0.5 }}>
          {profile?.full_name || 'User'}
        </Typography>
        <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 3 }}>
          @{profile?.username || 'username'}
        </Typography>

        {/* Stats */}
        <Box sx={{ display: 'flex', gap: 4, mb: 3, width: '100%', justifyContent: 'center' }}>
          <Box 
              onClick={() => handleOpenUserList('followers')}
              sx={{ textAlign: 'center', cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
          >
            <Typography fontWeight="bold" variant="h6">{profile?.followers_count || 0}</Typography>
            <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>Followers</Typography>
          </Box>
          <Box 
              onClick={() => handleOpenUserList('following')}
              sx={{ textAlign: 'center', cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
          >
            <Typography fontWeight="bold" variant="h6">{profile?.following_count || 0}</Typography>
            <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>Following</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography fontWeight="bold" variant="h6">{reels.length}</Typography>
            <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>Reels</Typography>
          </Box>
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
          <Button 
            variant="outlined" 
            startIcon={<Edit />}
            onClick={() => setEditOpen(true)}
            sx={{ 
              borderRadius: 4, 
              borderColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              px: 4,
              '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.05)' }
            }}
          >
            Edit Profile
          </Button>
          {/* Settings button could go here */}
        </Box>

      </Box>

      {/* Reels Grid */}
      <Box sx={{ px: 1 }}>
        <Grid container spacing={1}>
          {reels.map((reel) => (
            <Grid item xs={4} key={reel.id} sx={{ aspectRatio: '9/16', position: 'relative' }}>
              <Box 
                sx={{ 
                    width: '100%', 
                    height: '100%', 
                    bgcolor: '#1a1a1a', 
                    borderRadius: 1, 
                    overflow: 'hidden', 
                    position: 'relative',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                <video 
                    src={reel.url} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    muted 
                    playsInline
                />
                
                <Box sx={{ position: 'absolute', bottom: 4, left: 4, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold', textShadow: '0 1px 2px black' }}>
                        {reel.likes_count} ❤️
                    </Typography>
                </Box>

                <IconButton 
                    size="small"
                    onClick={() => handleDeleteReel(reel.id)}
                    sx={{ 
                        position: 'absolute', 
                        top: 4, 
                        right: 4, 
                        bgcolor: 'rgba(0,0,0,0.5)', 
                        color: 'white',
                        '&:hover': { bgcolor: 'var(--primary)' }
                    }}
                >
                    <Delete fontSize="small" />
                </IconButton>
              </Box>
            </Grid>
          ))}
        </Grid>
        {reels.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8, color: 'var(--text-secondary)' }}>
                <Typography>No reels yet.</Typography>
                <Typography variant="caption">Upload your first dance video!</Typography>
            </Box>
        )}
      </Box>

      <EditProfileDialog 
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onUpdateSuccess={fetchMyProfile}
        currentProfile={profile}
      />

      {profile && (
        <UserListDialog 
            open={userListOpen}
            onClose={() => setUserListOpen(false)}
            title={userListType === 'followers' ? 'Followers' : 'Following'}
            type={userListType}
            profileId={profile.id}
        />
      )}

      <ConfirmDialog 
        open={confirmOpen} 
        title="Delete Reel" 
        message="Are you sure you want to delete this reel? This action cannot be undone." 
        onConfirm={handleConfirmDelete} 
        onCancel={() => setConfirmOpen(false)} 
      />
    </Box>
  )
}
