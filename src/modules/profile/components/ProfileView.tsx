'use client'
import React, { useState, useEffect } from 'react'
import { 
  Box, 
  Typography, 
  Avatar, 
  Button, 
  Grid, 
  IconButton, 
  CircularProgress,
  Dialog,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  useTheme,
  useMediaQuery
} from '@mui/material'
import { Edit, Delete, Close, Settings } from '@mui/icons-material'
import { createClient } from '@/lib/supabase/client'
import { EditProfileDialog } from './EditProfileDialog'

// --- UserListDialog (Duplicated for now, should be shared) ---
interface UserListDialogProps {
    open: boolean;
    onClose: () => void;
    title: string;
    type: 'followers' | 'following';
    profileId: string;
}

const UserListDialog = ({ open, onClose, title, type, profileId }: UserListDialogProps) => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        if (open && profileId) {
            fetchUsers();
        }
    }, [open, profileId, type]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            let data: any = null;
            let error: any = null;

            if (type === 'followers') {
                const result = await supabase
                    .from('follows')
                    .select('follower_id, profiles!follows_follower_id_fkey(*)')
                    .eq('following_id', profileId);
                
                if (result.data) {
                    data = result.data.map((item: any) => item.profiles);
                }
                error = result.error;
            } else {
                const result = await supabase
                    .from('follows')
                    .select('following_id, profiles!follows_following_id_fkey(*)')
                    .eq('follower_id', profileId);
                
                if (result.data) {
                    data = result.data.map((item: any) => item.profiles);
                }
                error = result.error;
            }

            if (error) throw error;
            setUsers(data || []);
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { bgcolor: '#1a1a1a', color: 'white', height: '50vh' } }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <Typography variant="h6" fontWeight="bold">{title}</Typography>
                <IconButton onClick={onClose} sx={{ color: 'white' }}><Close /></IconButton>
            </Box>
            <Box sx={{ overflowY: 'auto', flex: 1 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress color="secondary" /></Box>
                ) : users.length === 0 ? (
                    <Typography sx={{ textAlign: 'center', color: 'var(--text-secondary)', mt: 4 }}>No users found.</Typography>
                ) : (
                    <List>
                        {users.map((user) => (
                            <ListItem key={user.id}>
                                <ListItemAvatar>
                                    <Avatar src={user.avatar_url}>{user.full_name?.[0]}</Avatar>
                                </ListItemAvatar>
                                <ListItemText 
                                    primary={<Typography color="white" fontWeight="bold">{user.full_name}</Typography>}
                                    secondary={<Typography color="var(--text-secondary)" variant="body2">@{user.username || 'user'}</Typography>}
                                />
                            </ListItem>
                        ))}
                    </List>
                )}
            </Box>
        </Dialog>
    );
};

export const ProfileView = () => {
  const [profile, setProfile] = useState<any>(null)
  const [reels, setReels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [userListOpen, setUserListOpen] = useState(false)
  const [userListType, setUserListType] = useState<'followers' | 'following'>('followers')
  
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

  const handleDeleteReel = async (reelId: string) => {
    if (!confirm('Are you sure you want to delete this reel?')) return

    try {
        await supabase.from('reels').delete().eq('id', reelId)
        setReels(prev => prev.filter(r => r.id !== reelId))
    } catch (err) {
        console.error('Error deleting reel:', err)
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
    </Box>
  )
}
