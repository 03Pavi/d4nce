import React, { useState } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography } from '@mui/material'
import { NotificationsActive } from '@mui/icons-material'

interface PushNotificationDialogProps {
    open: boolean;
    onClose: () => void;
    onSend: (message: string) => void;
}

export const PushNotificationDialog = ({ open, onClose, onSend }: PushNotificationDialogProps) => {
    const [pushMessage, setPushMessage] = useState('');

    const handleSend = () => {
        onSend(pushMessage);
        setPushMessage('');
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            maxWidth="sm"
            fullWidth
            PaperProps={{ 
                sx: { 
                    bgcolor: '#1a1a1a', 
                    color: 'white',
                    borderRadius: 3,
                    border: '1px solid rgba(0,229,255,0.3)'
                } 
            }}
        >
            <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)', pb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <NotificationsActive sx={{ color: '#00e5ff' }} />
                    <Typography variant="h6" fontWeight="bold">Send Push Notification</Typography>
                </Box>
            </DialogTitle>
            <DialogContent sx={{ mt: 2 }}>
                <TextField
                    autoFocus
                    label="Message"
                    fullWidth
                    multiline
                    rows={4}
                    placeholder="Wake up students! Class starts in 1 hour."
                    variant="outlined"
                    value={pushMessage}
                    onChange={(e) => setPushMessage(e.target.value)}
                    sx={{ 
                        '& .MuiInputBase-root': { color: 'white' },
                        '& .MuiInputLabel-root': { color: '#aaa' },
                        '& .MuiOutlinedInput-root': {
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
                            '&.Mui-focused fieldset': { borderColor: '#00e5ff' },
                        },
                        '& .MuiInputLabel-root.Mui-focused': { color: '#00e5ff' }
                    }}
                />
            </DialogContent>
            <DialogActions sx={{ p: 2.5, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <Button onClick={onClose} sx={{ color: '#888' }}>Cancel</Button>
                <Button 
                    onClick={handleSend} 
                    variant="contained" 
                    sx={{ 
                        bgcolor: '#00e5ff', 
                        color: 'black', 
                        fontWeight: 'bold',
                        '&:hover': { bgcolor: '#00b2cc' }
                    }}
                >
                    Send Notification
                </Button>
            </DialogActions>
        </Dialog>
    )
}
