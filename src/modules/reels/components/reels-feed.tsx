'use client'
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Box, CircularProgress, Container, Typography } from '@mui/material'
import { createClient } from '@/lib/supabase/client'
import { CommentsDrawer } from './comments-drawer'
import { EditReelDialog } from './edit-reel-dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ReelItem } from './reel-item'
import { ProfileDialog } from '@/modules/profile/components/profile-dialog'

// Constants for pagination
const PAGE_SIZE = 10;



export const ReelsFeed = () => {
    const [activeIndex, setActiveIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const [reels, setReels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [likedReels, setLikedReels] = useState<Set<string>>(new Set());
    
    // Infinite scroll state
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);
    
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

    // Initial fetch
    useEffect(() => {
      fetchUserAndReels();
    }, []);

    // Realtime subscription for new reels
    useEffect(() => {
        const channel = supabase
            .channel('reels-realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'reels',
                },
                async (payload) => {
                    console.log('New reel received:', payload);
                    // Fetch the complete reel with profile data
                    const { data: newReelData, error } = await supabase
                        .from('reels')
                        .select(`
                            *,
                            profiles:profiles!reels_user_id_fkey (
                                full_name,
                                avatar_url
                            )
                        `)
                        .eq('id', payload.new.id)
                        .single();

                    if (!error && newReelData) {
                        const formattedReel = {
                            ...newReelData,
                            user: newReelData.profiles?.full_name || 'Unknown User',
                            user_avatar: newReelData.profiles?.avatar_url
                        };
                        // Add new reel to the beginning of the list
                        setReels(prev => [formattedReel, ...prev]);
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'reels',
                },
                (payload) => {
                    console.log('Reel updated:', payload);
                    // Update the reel in the list
                    setReels(prev => prev.map(reel => 
                        reel.id === payload.new.id 
                            ? { ...reel, ...payload.new }
                            : reel
                    ));
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'reels',
                },
                (payload) => {
                    console.log('Reel deleted:', payload);
                    // Remove the reel from the list
                    setReels(prev => prev.filter(reel => reel.id !== payload.old.id));
                }
            )
            .subscribe();

        // Cleanup subscription on unmount
        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase]);

    const fetchUserAndReels = async () => {
        setLoading(true);
        setPage(0);
        setHasMore(true);
        try {
            // 1. Get User
            const { data: { user } } = await supabase.auth.getUser();
            setUserId(user?.id || null);

            // 2. Get Reels with pagination
            const { data: reelsData, error: reelsError } = await supabase
              .from('reels')
              .select(`
                *,
                profiles:profiles!reels_user_id_fkey (
                  full_name,
                  avatar_url
                )
              `)
              .order('created_at', { ascending: false })
              .range(0, PAGE_SIZE - 1);

            if (reelsError) throw reelsError;

            if (reelsData) {
                const formattedReels = reelsData.map(reel => ({
                    ...reel,
                    user: reel.profiles?.full_name || 'Unknown User',
                    user_avatar: reel.profiles?.avatar_url
                }));
                setReels(formattedReels);
                setHasMore(reelsData.length === PAGE_SIZE);

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
                setReels([]);
                setHasMore(false);
            }
        } catch (err) {
            console.error('Error fetching data:', err);
            setReels([]);
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    };

    // Load more reels for infinite scroll
    const loadMoreReels = useCallback(async () => {
        if (loadingMore || !hasMore) return;
        
        setLoadingMore(true);
        const nextPage = page + 1;
        const start = nextPage * PAGE_SIZE;
        const end = start + PAGE_SIZE - 1;

        try {
            const { data: moreReels, error } = await supabase
                .from('reels')
                .select(`
                    *,
                    profiles:profiles!reels_user_id_fkey (
                        full_name,
                        avatar_url
                    )
                `)
                .order('created_at', { ascending: false })
                .range(start, end);

            if (error) throw error;

            if (moreReels && moreReels.length > 0) {
                const formattedReels = moreReels.map(reel => ({
                    ...reel,
                    user: reel.profiles?.full_name || 'Unknown User',
                    user_avatar: reel.profiles?.avatar_url
                }));
                
                // Filter out duplicates (in case realtime added some)
                setReels(prev => {
                    const existingIds = new Set(prev.map(r => r.id));
                    const newReels = formattedReels.filter(r => !existingIds.has(r.id));
                    return [...prev, ...newReels];
                });
                
                setPage(nextPage);
                setHasMore(moreReels.length === PAGE_SIZE);
            } else {
                setHasMore(false);
            }
        } catch (err) {
            console.error('Error loading more reels:', err);
        } finally {
            setLoadingMore(false);
        }
    }, [loadingMore, hasMore, page, supabase]);

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

            // Infinite scroll: load more when user is 2 reels away from the end
            if (index >= reels.length - 3 && hasMore && !loadingMore) {
                loadMoreReels();
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
        {/* Empty state when no reels */}
        {reels.length === 0 && !loading && (
            <Box
                sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    bgcolor: 'var(--background)',
                    gap: 2,
                }}
            >
                <Box sx={{ fontSize: 64, opacity: 0.3 }}>🎬</Box>
                <Typography variant="h6" sx={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
                    No reels yet
                </Typography>
                <Typography variant="body2" sx={{ color: 'var(--text-secondary)', opacity: 0.5 }}>
                    Be the first to upload a reel!
                </Typography>
            </Box>
        )}

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
        
        {/* Loading indicator for infinite scroll */}
        {loadingMore && (
            <Box
                sx={{
                    height: '100px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    bgcolor: 'var(--background)',
                }}
            >
                <CircularProgress size={32} sx={{ color: '#ff0055' }} />
            </Box>
        )}
        
        {/* End of feed indicator */}
        {!hasMore && reels.length > 0 && (
            <Box
                sx={{
                    height: '80px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    bgcolor: 'var(--background)',
                }}
            >
                <Typography variant="body2" sx={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
                    ✨ You've seen all the reels!
                </Typography>
            </Box>
        )}
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
