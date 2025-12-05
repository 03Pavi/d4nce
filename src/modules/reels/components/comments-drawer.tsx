import React, { useState, useEffect } from 'react'
import { Box, Typography, IconButton, Drawer, TextField, List, ListItem, ListItemAvatar, ListItemText, Avatar, CircularProgress, Menu, MenuItem, ListItemIcon } from '@mui/material'
import { Close, Send, MoreVert, Edit, Delete } from '@mui/icons-material'
import { createClient } from '@/lib/supabase/client'

interface CommentsDrawerProps {
    open: boolean;
    onClose: () => void;
    reelId: string;
    userId: string | null;
}

export const CommentsDrawer = ({ open, onClose, reelId, userId }: CommentsDrawerProps) => {
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
        
        try {
            const response = await fetch(`/api/reels/${reelId}/comments`);
            if (response.ok) {
                const data = await response.json();
                setComments(data);
            }
        } catch (error) {
            console.error('Error fetching comments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePostComment = async () => {
        if (!newComment.trim() || !userId) return;

        try {
            const response = await fetch(`/api/reels/${reelId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: newComment.trim()
                }),
            });

            if (response.ok) {
                setNewComment('');
                fetchComments(); 
            }
        } catch (error) {
            console.error('Error posting comment:', error);
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
            try {
                await fetch(`/api/comments/${selectedCommentId}`, {
                    method: 'DELETE',
                });
                fetchComments();
            } catch (error) {
                console.error('Error deleting comment:', error);
            }
        }
        handleMenuClose();
    };

    const handleUpdateComment = async () => {
        if (editingCommentId && editContent.trim()) {
            try {
                await fetch(`/api/comments/${editingCommentId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ content: editContent.trim() }),
                });
                
                setEditingCommentId(null);
                setEditContent('');
                fetchComments();
            } catch (error) {
                console.error('Error updating comment:', error);
            }
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
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress  /></Box>
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
