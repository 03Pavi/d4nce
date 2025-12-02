'use client'
import React, { useState, useEffect } from 'react'
import { 
  Dialog, 
  Box, 
  Typography, 
  Avatar, 
  Button, 
  Grid, 
  IconButton, 
  CircularProgress,
  AppBar,
  Toolbar,
  Slide,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText
} from '@mui/material'
import { ArrowBack, Delete, Close } from '@mui/icons-material'
import { TransitionProps } from '@mui/material/transitions'
import { createClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false })

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="left" ref={ref} {...props} />;
});

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
                // Get users who follow this profile
                const result = await supabase
                    .from('follows')
                    .select('follower_id, profiles!follows_follower_id_fkey(*)')
                    .eq('following_id', profileId);
                
                if (result.data) {
                    data = result.data.map((item: any) => item.profiles);
                }
                error = result.error;
            } else {
                // Get users this profile follows
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
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333' }}>
                <Typography variant="h6" fontWeight="bold">{title}</Typography>
                <IconButton onClick={onClose} sx={{ color: 'white' }}><Close /></IconButton>
            </Box>
            <Box sx={{ overflowY: 'auto', flex: 1 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress color="secondary" /></Box>
                ) : users.length === 0 ? (
                    <Typography sx={{ textAlign: 'center', color: '#666', mt: 4 }}>No users found.</Typography>
                ) : (
                    <List>
                        {users.map((user) => (
                            <ListItem key={user.id}>
                                <ListItemAvatar>
                                    <Avatar src={user.avatar_url}>{user.full_name?.[0]}</Avatar>
                                </ListItemAvatar>
                                <ListItemText 
                                    primary={<Typography color="white" fontWeight="bold">{user.full_name}</Typography>}
                                    secondary={<Typography color="#888" variant="body2">@{user.username || 'user'}</Typography>}
                                />
                            </ListItem>
                        ))}
                    </List>
                )}
            </Box>
        </Dialog>
    );
};

interface ProfileDialogProps {
  open: boolean
  onClose: () => void
  profileId: string // The user ID to show
  currentUserId: string | null // The logged-in user
  onReelClick?: (reelId: string) => void
}

export const ProfileDialog = ({ open, onClose, profileId, currentUserId, onReelClick }: ProfileDialogProps) => {
  const [profile, setProfile] = useState<any>(null)
  const [reels, setReels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  
  // User List State
  const [userListOpen, setUserListOpen] = useState(false);
  const [userListType, setUserListType] = useState<'followers' | 'following'>('followers');

  const supabase = createClient()

  useEffect(() => {
    if (open && profileId) {
      fetchProfileData()
    }
  }, [open, profileId])

  const fetchProfileData = async () => {
    setLoading(true)
    try {
      // 1. Fetch Profile Info
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single()
      
      if (profileError) throw profileError
      setProfile(profileData)

      // 2. Fetch User's Reels
      const { data: reelsData, error: reelsError } = await supabase
        .from('reels')
        .select('*')
        .eq('user_id', profileId)
        .order('created_at', { ascending: false })
      
      if (reelsError) throw reelsError
      setReels(reelsData || [])

      // 3. Check Follow Status
      if (currentUserId && currentUserId !== profileId) {
        const { data: followData } = await supabase
          .from('follows')
          .select('*')
          .eq('follower_id', currentUserId)
          .eq('following_id', profileId)
          .single()
        
        setIsFollowing(!!followData)
      }

    } catch (err) {
      console.error('Error fetching profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFollowToggle = async () => {
    if (!currentUserId) return
    setFollowLoading(true)
    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .match({ follower_id: currentUserId, following_id: profileId })
        setIsFollowing(false)
        setProfile((prev: any) => ({ ...prev, followers_count: Math.max(0, prev.followers_count - 1) }))
      } else {
        await supabase
          .from('follows')
          .insert({ follower_id: currentUserId, following_id: profileId })
        setIsFollowing(true)
        setProfile((prev: any) => ({ ...prev, followers_count: prev.followers_count + 1 }))
      }
    } catch (err) {
      console.error('Error toggling follow:', err)
    } finally {
      setFollowLoading(false)
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

  if (!open) return null

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
      PaperProps={{
        sx: { bgcolor: 'black', color: 'white' }
      }}
    >
      <AppBar sx={{ position: 'relative', bgcolor: 'black', borderBottom: '1px solid #333' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={onClose} aria-label="close">
            <ArrowBack />
          </IconButton>
          <Typography sx={{ ml: 2, flex: 1, fontWeight: 'bold' }} variant="h6" component="div">
            {profile?.full_name || 'Profile'}
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 2, overflowY: 'auto', height: '100%' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
            <CircularProgress color="secondary" />
          </Box>
        ) : (
          <>
            {/* Profile Header */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
              <Avatar 
                src={profile?.avatar_url} 
                sx={{ width: 100, height: 100, mb: 2, border: '3px solid #ff0055' }}
              />
              <Typography variant="h5" fontWeight="bold">{profile?.full_name}</Typography>
              <Typography variant="body2" sx={{ color: '#888', mb: 2 }}>@{profile?.username || 'user'}</Typography>
              
              <Box sx={{ display: 'flex', gap: 4, mb: 3 }}>
                <Box 
                    onClick={() => handleOpenUserList('followers')}
                    sx={{ textAlign: 'center', cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
                >
                  <Typography fontWeight="bold" variant="h6">{profile?.followers_count || 0}</Typography>
                  <Typography variant="caption" sx={{ color: '#888' }}>Followers</Typography>
                </Box>
                <Box 
                    onClick={() => handleOpenUserList('following')}
                    sx={{ textAlign: 'center', cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
                >
                  <Typography fontWeight="bold" variant="h6">{profile?.following_count || 0}</Typography>
                  <Typography variant="caption" sx={{ color: '#888' }}>Following</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography fontWeight="bold" variant="h6">{reels.length}</Typography>
                  <Typography variant="caption" sx={{ color: '#888' }}>Reels</Typography>
                </Box>
              </Box>

              {currentUserId && currentUserId !== profileId && (
                <Button 
                  variant={isFollowing ? "outlined" : "contained"}
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                  sx={{ 
                    px: 4, 
                    borderRadius: 4,
                    borderColor: isFollowing ? '#666' : 'transparent',
                    color: isFollowing ? 'white' : 'white',
                    bgcolor: isFollowing ? 'transparent' : '#ff0055',
                    '&:hover': {
                        bgcolor: isFollowing ? 'rgba(255,255,255,0.1)' : '#d40047',
                        borderColor: isFollowing ? 'white' : 'transparent'
                    }
                  }}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>
              )}
            </Box>

            {/* Reels Grid */}
            <Grid container spacing={1}>
              {reels.map((reel) => (
                <Grid item xs={4} key={reel.id} sx={{ aspectRatio: '9/16', position: 'relative' }}>
                  <Box 
                    onClick={() => onReelClick && onReelClick(reel.id)}
                    sx={{ 
                        width: '100%', 
                        height: '100%', 
                        bgcolor: '#111', 
                        borderRadius: 1, 
                        overflow: 'hidden', 
                        position: 'relative',
                        cursor: 'pointer',
                        border: '1px solid #333'
                    }}
                  >
                    {/* Simple video preview - muted, no controls */}
                    <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                        {/* Using video tag for thumbnail/preview to avoid heavy ReactPlayer instances in grid */}
                        <video 
                            src={reel.url} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            muted 
                            playsInline
                        />
                    </Box>
                    
                    {/* View Count Overlay */}
                    <Box sx={{ position: 'absolute', bottom: 4, left: 4, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold', textShadow: '0 1px 2px black' }}>
                            {reel.likes_count} ❤️
                        </Typography>
                    </Box>

                    {/* Delete Button for Owner */}
                    {currentUserId === profileId && (
                        <IconButton 
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteReel(reel.id);
                            }}
                            sx={{ 
                                position: 'absolute', 
                                top: 4, 
                                right: 4, 
                                bgcolor: 'rgba(0,0,0,0.5)', 
                                color: 'white',
                                '&:hover': { bgcolor: '#ff0055' }
                            }}
                        >
                            <Delete fontSize="small" />
                        </IconButton>
                    )}
                  </Box>
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </Box>

      <UserListDialog 
        open={userListOpen}
        onClose={() => setUserListOpen(false)}
        title={userListType === 'followers' ? 'Followers' : 'Following'}
        type={userListType}
        profileId={profileId}
      />
    </Dialog>
  )
}
