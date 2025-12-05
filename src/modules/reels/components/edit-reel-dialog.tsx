import React, { useState, useEffect } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material'

interface EditReelDialogProps {
    open: boolean;
    onClose: () => void;
    reel: any;
    onUpdate: (reelId: string, newDescription: string) => void;
}

export const EditReelDialog = ({ open, onClose, reel, onUpdate }: EditReelDialogProps) => {
    const [description, setDescription] = useState(reel?.description || '');
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        if (reel) setDescription(reel.description);
    }, [reel]);

    const handleUpdate = async () => {
        setUpdating(true);
        try {
            const response = await fetch(`/api/reels/${reel.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ description }),
            });

            if (response.ok) {
                onUpdate(reel.id, description);
                onClose();
            } else {
                console.error('Failed to update reel');
            }
        } catch (error) {
            console.error('Error updating reel:', error);
        } finally {
            setUpdating(false);
        }
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
                <Button onClick={handleUpdate} variant="contained" sx={{ bgcolor: 'var(--primary)' }} disabled={updating}>
                    {updating ? 'Saving...' : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
