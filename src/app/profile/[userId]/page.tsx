'use client'
import React, { useState, useEffect } from 'react'
import { 
  Box, 
  Typography, 
  Avatar, 
  Button, 
  Grid, 
  CircularProgress,
  IconButton,
  Chip
} from '@mui/material'
import { ArrowBack } from '@mui/icons-material'
import { useRouter, useParams } from 'next/navigation'

export default function UserProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [reels, setReels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const params = useParams()
  const userId = params.userId as string

  useEffect(() => {
    fetchUserProfile()
  }, [userId])

  const fetchUserProfile = async () => {
    setLoading(true)
    try {
      // Fetch user profile
      const profileRes = await fetch(`/api/users/profile?userId=${userId}`)
      if (!profileRes.ok) throw new Error('Failed to fetch profile')
      
      const profileData = await profileRes.json()
      setProfile(profileData)

      // Fetch user's reels
      const reelsRes = await fetch(`/api/reels?userId=${userId}`)
      if (reelsRes.ok) {
        const reelsData = await reelsRes.json()
        setReels(reelsData || [])
      }

    } catch (err) {
      console.error('Error fetching profile:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: 'black' }}>
        <CircularProgress color="secondary" />
      </Box>
    )
  }

  if (!profile) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: 'black', color: 'white' }}>
        <Typography variant="h5">Profile not found</Typography>
        <Button onClick={() => router.back()} sx={{ mt: 2, color: '#ff0055' }}>Go Back</Button>
      </Box>
    )
  }

  return (
    <Box sx={{ height: '100vh', overflowY: 'auto', bgcolor: 'black', color: 'white' }}>
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', bgcolor: '#111', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <IconButton onClick={() => router.back()} sx={{ color: 'white', mr: 1 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 'bold', background: 'linear-gradient(45deg, #ff0055, #ff00aa)', backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>
          Profile
        </Typography>
      </Box>

      {/* Profile Content */}
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* Avatar */}
        <Box sx={{ position: 'relative', mb: 2 }}>
          <Avatar 
            src={profile?.avatar_url} 
            sx={{ width: 100, height: 100, border: '3px solid var(--primary)' }}
          />
        </Box>

        <Typography variant="h5" fontWeight="bold" sx={{ mb: 0.5 }}>
          {profile?.full_name || 'User'}
        </Typography>
        <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 1 }}>
          @{profile?.username || 'username'}
        </Typography>

        {profile?.role && (
          <Chip 
            label={profile.role.toUpperCase()} 
            size="small" 
            sx={{ 
              mb: 3,
              bgcolor: profile.role === 'admin' ? '#ff0055' : 'rgba(255,255,255,0.1)',
              color: 'white'
            }} 
          />
        )}

        {/* Stats */}
        <Box sx={{ display: 'flex', gap: 4, mb: 3, width: '100%', justifyContent: 'center' }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography fontWeight="bold" variant="h6">{profile?.followers_count || 0}</Typography>
            <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>Followers</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography fontWeight="bold" variant="h6">{profile?.following_count || 0}</Typography>
            <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>Following</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography fontWeight="bold" variant="h6">{reels.length}</Typography>
            <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>Reels</Typography>
          </Box>
        </Box>

      </Box>

      {/* Reels Grid */}
      <Box sx={{ px: 1, pb: 4 }}>
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
                    border: '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer'
                }}
                onClick={() => router.push(`/student?tab=reels&reelId=${reel.id}`)}
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
              </Box>
            </Grid>
          ))}
        </Grid>
        {reels.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8, color: 'var(--text-secondary)' }}>
                <Typography>No reels yet.</Typography>
            </Box>
        )}
      </Box>
    </Box>
  )
}
