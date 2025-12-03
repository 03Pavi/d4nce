import React, { useState } from 'react'
import { Box, Typography, IconButton, TextField, Button } from '@mui/material'
import { Close, Send } from '@mui/icons-material'

interface ChatMessage {
    user: string;
    text: string;
}

interface LiveSessionChatProps {
    messages: ChatMessage[];
    onSendMessage: (text: string) => void;
    onClose: () => void;
}

export const LiveSessionChat = ({ messages, onSendMessage, onClose }: LiveSessionChatProps) => {
    const [newMessage, setNewMessage] = useState('');

    const handleSend = () => {
        if (!newMessage.trim()) return;
        onSendMessage(newMessage);
        setNewMessage('');
    }

    return (
        <Box sx={{ height: '300px', bgcolor: '#111', display: 'flex', flexDirection: 'column', borderTop: '1px solid #333' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" sx={{ color: 'white' }}>Live Chat</Typography>
                <IconButton size="small" onClick={onClose} sx={{ color: '#aaa' }}><Close fontSize="small" /></IconButton>
            </Box>
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
                {messages.map((msg, i) => (
                    <Box key={i} sx={{ mb: 1.5, display: 'flex', alignItems: 'flex-start' }}>
                        <Typography variant="caption" sx={{ color: '#ff0055', fontWeight: 'bold', mr: 1, whiteSpace: 'nowrap' }}>{msg.user}:</Typography>
                        <Typography variant="body2" sx={{ color: 'white' }}>{msg.text}</Typography>
                    </Box>
                ))}
            </Box>
            <Box sx={{ p: 2, display: 'flex', gap: 1, borderTop: '1px solid #333' }}>
                <TextField 
                    fullWidth 
                    size="small" 
                    placeholder="Say something..." 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    sx={{ 
                        input: { color: 'white' }, 
                        fieldset: { borderColor: '#333' },
                        '& .MuiOutlinedInput-root': {
                            '& fieldset': { borderColor: '#333' },
                            '&:hover fieldset': { borderColor: '#555' },
                            '&.Mui-focused fieldset': { borderColor: '#ff0055' },
                        }
                    }}
                />
                <Button variant="contained" sx={{ bgcolor: '#ff0055', '&:hover': { bgcolor: '#cc0044' } }} onClick={handleSend}>
                    <Send />
                </Button>
            </Box>
        </Box>
    )
}
