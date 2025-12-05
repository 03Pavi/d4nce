import React, { useState, useEffect } from 'react'
import ReactPlayer from 'react-player'
import { Box, Typography, Avatar, IconButton, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material'
import { Favorite, FavoriteBorder, Comment, Share, MusicNote, MoreVert, Edit, Delete } from '@mui/icons-material'
import { createClient } from '@/lib/supabase/client'

interface ReelItemProps {
    reel: any;
    isActive: boolean;
    userId: string | null;
    likedReels: Set<string>;
    onToggleLike: (reelId: string, isLiked: boolean) => void;
    onOpenComments: (reelId: string) => void;
    onOpenProfile: (userId: string) => void;
    onDeleteReel: (reelId: string) => void;
    onEditReel: (reel: any) => void;
}

export const ReelItem = ({ reel, isActive, userId, likedReels, onToggleLike, onOpenComments, onOpenProfile, onDeleteReel, onEditReel }: ReelItemProps) => {
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
                  title: 'Check out this reel on COZYTRIBE!',
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
