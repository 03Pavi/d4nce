'use client'
import React, { useState, useRef, useEffect } from 'react'
import { Box, CircularProgress, Container } from '@mui/material'
import { createClient } from '@/lib/supabase/client'
import { CommentsDrawer } from './comments-drawer'
import { EditReelDialog } from './edit-reel-dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import PullToRefresh from 'react-pull-to-refresh';
import { ReelItem } from './reel-item'
import { ProfileDialog } from '@/modules/profile/components/profile-dialog'

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

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const handleDeleteReelClick = (reelId: string) => {
        setDeleteId(reelId);
        setConfirmOpen(true);
    };

    const handleConfirmDeleteReel = async () => {
        if (!deleteId) return;

        const { error } = await supabase.from('reels').delete().eq('id', deleteId);
        if (!error) {
            setReels(prev => prev.filter(r => r.id !== deleteId));
        } else {
            alert('Failed to delete reel.');
        }
        setConfirmOpen(false);
        setDeleteId(null);
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
        <Container maxWidth="lg" disableGutters sx={{ height: '100%' }}>
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
                onDeleteReel={handleDeleteReelClick}
                onEditReel={handleEditReel}
            />
        ))}
            </Box>
        </Container>

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

        <ConfirmDialog 
            open={confirmOpen} 
            title="Delete Reel" 
            message="Are you sure you want to delete this reel? This action cannot be undone." 
            onConfirm={handleConfirmDeleteReel} 
            onCancel={() => setConfirmOpen(false)} 
        />
    </>
  )
}
