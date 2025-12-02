'use client'
import React, { useState, useRef, useEffect } from 'react'
import ReactPlayer from 'react-player'
import { Favorite, FavoriteBorder, Comment, Share, MusicNote, Send, Close } from '@mui/icons-material'
import { Box, Typography, Avatar, IconButton, CircularProgress, Drawer, TextField, List, ListItem, ListItemAvatar, ListItemText, Divider } from '@mui/material'
import { createClient } from '@/lib/supabase/client'

// Mock Data as fallback
const MOCK_REELS = [
  {
    id: '1',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    user: 'DanceMaster',
    user_avatar: null,
    description: 'Learning the new choreography! 💃 #dance #class',
    likes_count: 1200,
    comments_count: 342,
  },
  {
    id: '2',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    user: 'GrooveStudio',
    user_avatar: null,
    description: 'Live session highlights from yesterday 🔥',
    likes_count: 856,
    comments_count: 120,
  },
   {
    id: '3',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    user: 'UrbanBeats',
    user_avatar: null,
    description: 'Hip hop basics 101. Join our live class!',
    likes_count: 2500,
    comments_count: 500,
  },
]

import { Menu, MenuItem, ListItemIcon } from '@mui/material'
import { MoreVert, Edit, Delete } from '@mui/icons-material'

const CommentsDrawer = ({ open, onClose, reelId, userId }: { open: boolean; onClose: () => void; reelId: string; userId: string | null }) => {
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Editing state
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    
    // Menu state
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
    
    const supabase = createClient();

    useEffect(() => {
        if (open && reelId) {
            fetchComments();

            // Realtime subscription for new comments
            const channel = supabase
                .channel(`comments:${reelId}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
                        schema: 'public',
                        table: 'comments',
                        filter: `reel_id=eq.${reelId}`
                    },
                    (payload) => {
                        fetchComments();
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [open, reelId]);

    const fetchComments = async () => {
        if (comments.length === 0) setLoading(true);
        
        const { data, error } = await supabase
            .from('comments')
            .select('*, profiles(full_name, avatar_url)')
            .eq('reel_id', reelId)
            .order('created_at', { ascending: false });
        
        if (!error && data) {
            setComments(data);
        }
        setLoading(false);
    };

    const handlePostComment = async () => {
        if (!newComment.trim() || !userId) return;

        const { error } = await supabase
            .from('comments')
            .insert({
                user_id: userId,
                reel_id: reelId,
                content: newComment.trim()
            });

        if (!error) {
            setNewComment('');
            fetchComments(); 
        }
    };

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, commentId: string, content: string) => {
        setAnchorEl(event.currentTarget);
        setSelectedCommentId(commentId);
        setEditContent(content);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedCommentId(null);
    };

    const handleEditClick = () => {
        setEditingCommentId(selectedCommentId);
        handleMenuClose();
    };

    const handleDeleteClick = async () => {
        if (selectedCommentId) {
            await supabase.from('comments').delete().eq('id', selectedCommentId);
            fetchComments();
        }
        handleMenuClose();
    };

    const handleUpdateComment = async () => {
        if (editingCommentId && editContent.trim()) {
            await supabase
                .from('comments')
                .update({ content: editContent.trim() })
                .eq('id', editingCommentId);
            
            setEditingCommentId(null);
            setEditContent('');
            fetchComments();
        }
    };

    const handleCancelEdit = () => {
        setEditingCommentId(null);
        setEditContent('');
    };

    return (
        <Drawer
            anchor="bottom"
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    height: '70vh',
                    bgcolor: '#1a1a1a',
                    color: 'white',
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16
                }
            }}
        >
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <Typography variant="h6" fontWeight="bold">Comments</Typography>
                <IconButton onClick={onClose} sx={{ color: 'white' }}><Close /></IconButton>
            </Box>
            
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress color="secondary" /></Box>
                ) : comments.length === 0 ? (
                    <Typography sx={{ textAlign: 'center', color: 'var(--text-secondary)', mt: 4 }}>No comments yet. Be the first!</Typography>
                ) : (
                    <List>
                        {comments.map((comment) => (
                            <ListItem 
                                key={comment.id} 
                                alignItems="flex-start" 
                                sx={{ px: 0 }}
                                secondaryAction={
                                    userId === comment.user_id && !editingCommentId && (
                                        <IconButton 
                                            edge="end" 
                                            size="small" 
                                            onClick={(e) => handleMenuOpen(e, comment.id, comment.content)}
                                            sx={{ color: 'var(--text-secondary)' }}
                                        >
                                            <MoreVert fontSize="small" />
                                        </IconButton>
                                    )
                                }
                            >
                                <ListItemAvatar>
                                    <Avatar src={comment.profiles?.avatar_url} sx={{ width: 32, height: 32 }}>
                                        {comment.profiles?.full_name?.[0] || '?'}
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={
                                        <Typography variant="subtitle2" fontWeight="bold" color="white">
                                            {comment.profiles?.full_name || 'Unknown User'}
                                            <Typography component="span" variant="caption" sx={{ ml: 1, color: 'var(--text-secondary)' }}>
                                                {new Date(comment.created_at).toLocaleDateString()}
                                            </Typography>
                                        </Typography>
                                    }
                                    secondary={
                                        editingCommentId === comment.id ? (
                                            <Box sx={{ mt: 1 }}>
                                                <TextField
                                                    fullWidth
                                                    size="small"
                                                    value={editContent}
                                                    onChange={(e) => setEditContent(e.target.value)}
                                                    sx={{
                                                        '& .MuiOutlinedInput-root': {
                                                            color: 'white',
                                                            bgcolor: 'rgba(255,255,255,0.05)',
                                                            '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                                                        }
                                                    }}
                                                />
                                                <Box sx={{ display: 'flex', gap: 1, mt: 1, justifyContent: 'flex-end' }}>
                                                    <Typography 
                                                        variant="caption" 
                                                        onClick={handleCancelEdit}
                                                        sx={{ color: 'var(--text-secondary)', cursor: 'pointer', '&:hover': { color: 'white' } }}
                                                    >
                                                        Cancel
                                                    </Typography>
                                                    <Typography 
                                                        variant="caption" 
                                                        onClick={handleUpdateComment}
                                                        sx={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold' }}
                                                    >
                                                        Save
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        ) : (
                                            <Typography variant="body2" color="#ccc">
                                                {comment.content}
                                                {comment.updated_at && comment.updated_at !== comment.created_at && (
                                                    <Typography component="span" variant="caption" sx={{ ml: 1, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                                        (edited)
                                                    </Typography>
                                                )}
                                            </Typography>
                                        )
                                    }
                                />
                            </ListItem>
                        ))}
                    </List>
                )}
            </Box>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{
                    sx: {
                        bgcolor: 'var(--surface)',
                        color: 'white',
                    }
                }}
            >
                <MenuItem onClick={handleEditClick}>
                    <ListItemIcon><Edit fontSize="small" sx={{ color: 'white' }} /></ListItemIcon>
                    <ListItemText>Edit</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleDeleteClick}>
                    <ListItemIcon><Delete fontSize="small" sx={{ color: 'var(--primary)' }} /></ListItemIcon>
                    <ListItemText sx={{ color: 'var(--primary)' }}>Delete</ListItemText>
                </MenuItem>
            </Menu>

            <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: 1 }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            color: 'white',
                            bgcolor: 'rgba(255,255,255,0.05)',
                            borderRadius: 4,
                            '& fieldset': { border: 'none' },
                        }
                    }}
                />
                <IconButton 
                    onClick={handlePostComment} 
                    disabled={!newComment.trim() || !userId}
                    sx={{ color: 'var(--primary)', bgcolor: 'rgba(255,0,85,0.1)', '&:hover': { bgcolor: 'rgba(255,0,85,0.2)' } }}
                >
                    <Send />
                </IconButton>
            </Box>
        </Drawer>
    );
};

import { ProfileDialog } from '@/modules/profile/components/ProfileDialog'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material'

const EditReelDialog = ({ open, onClose, reel, onUpdate }: any) => {
    const [description, setDescription] = useState(reel?.description || '');
    const [updating, setUpdating] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        if (reel) setDescription(reel.description);
    }, [reel]);

    const handleUpdate = async () => {
        setUpdating(true);
        const { error } = await supabase
            .from('reels')
            .update({ description })
            .eq('id', reel.id);
        
        if (!error) {
            onUpdate(reel.id, description);
            onClose();
        }
        setUpdating(false);
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { bgcolor: 'var(--surface)', color: 'white' } }}>
            <DialogTitle>Edit Caption</DialogTitle>
            <DialogContent>
                <TextField
                    fullWidth
                    multiline
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    sx={{
                        mt: 1,
                        '& .MuiOutlinedInput-root': {
                            color: 'white',
                            bgcolor: 'rgba(255,255,255,0.05)',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                        }
                    }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} sx={{ color: 'var(--text-secondary)' }}>Cancel</Button>
                <Button onClick={handleUpdate} variant="contained" sx={{ bgcolor: 'var(--primary)' }}>Save</Button>
            </DialogActions>
        </Dialog>
    );
};

const ReelItem = ({ reel, isActive, userId, likedReels, onToggleLike, onOpenComments, onOpenProfile, onDeleteReel, onEditReel }: any) => {
  const Player = ReactPlayer as any;
  const isLiked = likedReels.has(reel.id);
  const [optimisticLike, setOptimisticLike] = useState(isLiked);
  const [optimisticCount, setOptimisticCount] = useState(reel.likes_count);
  const [commentCount, setCommentCount] = useState(reel.comments_count);
  
  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const supabase = createClient();

  useEffect(() => {
      setOptimisticLike(isLiked);
  }, [isLiked]);

  useEffect(() => {
      setOptimisticCount(reel.likes_count);
      setCommentCount(reel.comments_count);
  }, [reel.likes_count, reel.comments_count]);

  // Realtime updates for counts
  useEffect(() => {
      const channel = supabase
        .channel(`reel_updates:${reel.id}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'reels',
                filter: `id=eq.${reel.id}`
            },
            (payload: any) => {
                if (payload.new) {
                    setOptimisticCount(payload.new.likes_count);
                    setCommentCount(payload.new.comments_count);
                }
            }
        )
        .subscribe();

      return () => {
          supabase.removeChannel(channel);
      };
  }, [reel.id]);

  const handleLike = () => {
      if (!userId) return; // Prompt login?
      const newLiked = !optimisticLike;
      setOptimisticLike(newLiked);
      // Optimistic update
      setOptimisticCount((prev: number) => newLiked ? prev + 1 : prev - 1);
      onToggleLike(reel.id, newLiked);
  };

  const handleShare = async () => {
      if (navigator.share) {
          try {
              await navigator.share({
                  title: 'Check out this reel on D4NCE!',
                  text: reel.description,
                  url: window.location.href, // Ideally deep link to reel
              });
          } catch (err) {
              console.log('Error sharing:', err);
          }
      } else {
          // Fallback
          navigator.clipboard.writeText(window.location.href);
          alert('Link copied to clipboard!');
      }
  };
  
  return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        position: 'relative',
        scrollSnapAlign: 'start',
        bgcolor: 'var(--background)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
      }}
    >
      {/* Video Background */}
      <Box sx={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
         <Player
            src={reel.url}
            playing={isActive}
            loop
            muted={true}
            width="100%"
            height="100%"
            style={{ objectFit: 'cover' }}
            onError={(e: any) => console.log('Video Error:', e)}
        />
      </Box>
      
      {/* Overlay Content */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
          p: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          zIndex: 10
        }}
      >
        <Box sx={{ color: 'white', maxWidth: '80%' }}>
            <Box 
                onClick={() => onOpenProfile(reel.user_id)}
                sx={{ display: 'flex', alignItems: 'center', mb: 2, cursor: 'pointer' }}
            >
                <Avatar src={reel.user_avatar} sx={{ width: 40, height: 40, mr: 1.5, border: '2px solid var(--primary)' }}>
                  {reel.user ? reel.user[0]?.toUpperCase() : '?'}
                </Avatar>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                  {reel.user || 'Unknown User'}
                </Typography>
                <Box sx={{ ml: 1, px: 1, py: 0.2, border: '1px solid white', borderRadius: 1, fontSize: '0.6rem' }}>Follow</Box>
            </Box>
            <Typography variant="body1" sx={{ mb: 2, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{reel.description}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', opacity: 0.9 }}>
                <MusicNote sx={{ fontSize: 18, mr: 0.5 }} />
                <Typography variant="body2">Original Audio - {reel.user || 'Unknown'}</Typography>
            </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            {userId === reel.user_id && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ color: 'white', p: 0, mb: 0.5 }}>
                        <MoreVert sx={{ fontSize: 32 }} />
                    </IconButton>
                    <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={() => setAnchorEl(null)}
                        PaperProps={{ sx: { bgcolor: 'var(--surface)', color: 'white' } }}
                        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
                        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    >
                        <MenuItem onClick={() => { onEditReel(reel); setAnchorEl(null); }}>
                            <ListItemIcon><Edit fontSize="small" sx={{ color: 'white' }} /></ListItemIcon>
                            <ListItemText>Edit Caption</ListItemText>
                        </MenuItem>
                        <MenuItem onClick={() => { onDeleteReel(reel.id); setAnchorEl(null); }}>
                            <ListItemIcon><Delete fontSize="small" sx={{ color: 'var(--primary)' }} /></ListItemIcon>
                            <ListItemText sx={{ color: 'var(--primary)' }}>Delete Reel</ListItemText>
                        </MenuItem>
                    </Menu>
                </Box>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <IconButton onClick={handleLike} sx={{ color: optimisticLike ? 'var(--primary)' : 'white', p: 0, mb: 0.5 }}>
                    {optimisticLike ? <Favorite sx={{ fontSize: 32 }} /> : <FavoriteBorder sx={{ fontSize: 32 }} />}
                </IconButton>
                <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold' }}>{optimisticCount}</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <IconButton onClick={() => onOpenComments(reel.id)} sx={{ color: 'white', p: 0, mb: 0.5 }}>
                    <Comment sx={{ fontSize: 32 }} />
                </IconButton>
                <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold' }}>{commentCount}</Typography>
            </Box>
             <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <IconButton onClick={handleShare} sx={{ color: 'white', p: 0, mb: 0.5 }}>
                    <Share sx={{ fontSize: 32 }} />
                </IconButton>
                <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold' }}>Share</Typography>
            </Box>
        </Box>
      </Box>
    </Box>
  )
}

export const ReelsFeed = () => {
    const [activeIndex, setActiveIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const [reels, setReels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [likedReels, setLikedReels] = useState<Set<string>>(new Set());
    
    // Comments state
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [activeReelId, setActiveReelId] = useState<string | null>(null);

    // Profile state
    const [profileOpen, setProfileOpen] = useState(false);
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

    // Edit state
    const [editReelOpen, setEditReelOpen] = useState(false);
    const [editingReel, setEditingReel] = useState<any>(null);

    const supabase = createClient()

    useEffect(() => {
      fetchUserAndReels();
    }, []);

    const fetchUserAndReels = async () => {
        setLoading(true);
        try {
            // 1. Get User
            const { data: { user } } = await supabase.auth.getUser();
            setUserId(user?.id || null);

            // 2. Get Reels
            const { data: reelsData, error: reelsError } = await supabase
              .from('reels')
              .select(`
                *,
                profiles:profiles!reels_user_id_fkey (
                  full_name,
                  avatar_url
                )
              `)
              .order('created_at', { ascending: false });

            if (reelsError) throw reelsError;

            if (reelsData) {
                const formattedReels = reelsData.map(reel => ({
                    ...reel,
                    user: reel.profiles?.full_name || 'Unknown User',
                    user_avatar: reel.profiles?.avatar_url
                }));
                setReels(formattedReels);

                // 3. Get Likes for this user if logged in
                if (user) {
                    const { data: likesData } = await supabase
                        .from('likes')
                        .select('reel_id')
                        .eq('user_id', user.id);
                    
                    if (likesData) {
                        setLikedReels(new Set(likesData.map(l => l.reel_id)));
                    }
                }
            } else {
                setReels(MOCK_REELS);
            }
        } catch (err) {
            console.error('Error fetching data:', err);
            setReels(MOCK_REELS);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleLike = async (reelId: string, isLiked: boolean) => {
        if (!userId) return;

        if (isLiked) {
            // Add like
            setLikedReels(prev => new Set(prev).add(reelId));
            await supabase.from('likes').insert({ user_id: userId, reel_id: reelId });
        } else {
            // Remove like
            setLikedReels(prev => {
                const newSet = new Set(prev);
                newSet.delete(reelId);
                return newSet;
            });
            await supabase.from('likes').delete().match({ user_id: userId, reel_id: reelId });
        }
    };

    const handleOpenComments = (reelId: string) => {
        setActiveReelId(reelId);
        setCommentsOpen(true);
    };

    const handleOpenProfile = (profileId: string) => {
        setSelectedProfileId(profileId);
        setProfileOpen(true);
    };

    const handleDeleteReel = async (reelId: string) => {
        if (!confirm('Are you sure you want to delete this reel?')) return;

        const { error } = await supabase.from('reels').delete().eq('id', reelId);
        if (!error) {
            setReels(prev => prev.filter(r => r.id !== reelId));
        } else {
            alert('Failed to delete reel.');
        }
    };

    const handleEditReel = (reel: any) => {
        setEditingReel(reel);
        setEditReelOpen(true);
    };

    const handleReelUpdated = (reelId: string, newDescription: string) => {
        setReels(prev => prev.map(r => r.id === reelId ? { ...r, description: newDescription } : r));
    };

    const handleScroll = () => {
        if (containerRef.current) {
            const index = Math.round(containerRef.current.scrollTop / containerRef.current.clientHeight);
            if (index !== activeIndex) {
                setActiveIndex(index);
                // Update URL without reload
                const reel = reels[index];
                if (reel) {
                    const newUrl = new URL(window.location.href);
                    newUrl.searchParams.set('reelId', reel.id);
                    window.history.replaceState({}, '', newUrl.toString());
                }
            }
        }
    };

    const handleReelClickFromProfile = (reelId: string) => {
        setProfileOpen(false);
        const index = reels.findIndex(r => r.id === reelId);
        if (index !== -1) {
            setActiveIndex(index);
            if (containerRef.current) {
                containerRef.current.scrollTop = index * containerRef.current.clientHeight;
            }
            // Update URL
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set('reelId', reelId);
            window.history.replaceState({}, '', newUrl.toString());
        }
    };

    // Scroll to reel from URL on load OR set URL to first reel
    useEffect(() => {
        if (!loading && reels.length > 0) {
            const params = new URLSearchParams(window.location.search);
            const reelId = params.get('reelId');
            if (reelId) {
                const index = reels.findIndex(r => r.id === reelId);
                if (index !== -1) {
                    setActiveIndex(index);
                    if (containerRef.current) {
                        containerRef.current.scrollTop = index * containerRef.current.clientHeight;
                    }
                }
            } else {
                // No reelId in URL, set it to the first reel
                const firstReel = reels[0];
                if (firstReel) {
                     const newUrl = new URL(window.location.href);
                     newUrl.searchParams.set('reelId', firstReel.id);
                     window.history.replaceState({}, '', newUrl.toString());
                }
            }
        }
    }, [loading, reels]);

  if (loading) {
    return (
      <Box sx={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: 'var(--background)' }}>
        <CircularProgress color="secondary" />
      </Box>
    );
  }

  return (
    <>
        <Box
        ref={containerRef}
        onScroll={handleScroll}
        className="no-scrollbar"
        sx={{
            height: '100%',
            overflowY: 'scroll',
            scrollSnapType: 'y mandatory',
            bgcolor: 'var(--background)',
        }}
        >
        {reels.map((reel, index) => (
            <ReelItem 
                key={reel.id} 
                reel={reel} 
                isActive={index === activeIndex} 
                userId={userId}
                likedReels={likedReels}
                onToggleLike={handleToggleLike}
                onOpenComments={handleOpenComments}
                onOpenProfile={handleOpenProfile}
                onDeleteReel={handleDeleteReel}
                onEditReel={handleEditReel}
            />
        ))}
        </Box>

        {activeReelId && (
            <CommentsDrawer 
                open={commentsOpen} 
                onClose={() => setCommentsOpen(false)} 
                reelId={activeReelId} 
                userId={userId}
            />
        )}

        {selectedProfileId && (
            <ProfileDialog
                open={profileOpen}
                onClose={() => setProfileOpen(false)}
                profileId={selectedProfileId}
                currentUserId={userId}
                onReelClick={handleReelClickFromProfile}
            />
        )}

        <EditReelDialog
            open={editReelOpen}
            onClose={() => setEditReelOpen(false)}
            reel={editingReel}
            onUpdate={handleReelUpdated}
        />
    </>
  )
}
