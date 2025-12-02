'use client'
import React, { useState, useEffect, useRef } from 'react'
import { Box, Button, Typography, TextField, Chip, Container } from '@mui/material'
import { Send, Videocam, Mic, VideocamOff } from '@mui/icons-material'
import { useLiveStream } from '../hooks/useLiveStream'

interface LiveSessionProps {
    role: 'admin' | 'student';
    isPaid?: boolean;
    hasPurchased?: boolean;
    sessionId?: string;
}

export const LiveSession = ({ role, isPaid = false, hasPurchased = false, sessionId = 'class-1' }: LiveSessionProps) => {
    const [isLive, setIsLive] = useState(role === 'student'); 
    const { localStream, remoteStream, isConnected, chatMessages, sendChatMessage, connectedCount } = useLiveStream(isLive ? role : 'student', sessionId);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current) {
            if (role === 'admin' && localStream) {
                console.log('Setting local stream to video element');
                videoRef.current.srcObject = localStream;
            } else if (role === 'student' && remoteStream) {
                console.log('Setting remote stream to video element');
                videoRef.current.srcObject = remoteStream;
            }
        }
    }, [localStream, remoteStream, role]);
    
    const [newMessage, setNewMessage] = useState('');

    const handleSendMessage = () => {
        if (!newMessage.trim()) return;
        sendChatMessage(newMessage);
        setNewMessage('');
    }

    if (role === 'student' && isPaid && !hasPurchased) {
        return (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', bgcolor: '#1a1a1a', color: 'white', p: 3 }}>
                <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold', textAlign:"center" }}>Premium Masterclass</Typography>
                <Typography sx={{ mb: 4, textAlign: 'center', color: '#a0a0a0' }}>Unlock this exclusive live session to learn advanced techniques.</Typography>
                <Button variant="contained" size="large" sx={{ bgcolor: '#ff0055', '&:hover': { bgcolor: '#cc0044' } }}>
                    Buy Ticket - $15.00
                </Button>
            </Box>
        )
    }

    return (
        <Container maxWidth="lg" disableGutters sx={{ height: '100%' }}>
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'black', position: 'relative' }}>
            {/* Video Area */}
            <Box sx={{ flex: 1, bgcolor: '#222', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
                {/* Mock Video Feed */}
                <Box sx={{ 
                    width: '100%', 
                    height: '100%', 
                    background: 'linear-gradient(45deg, #121212, #2a2a2a)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}>
                     {isLive ? (
                        <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
                            <video 
                                ref={videoRef} 
                                autoPlay 
                                playsInline 
                                muted={role === 'admin'} // Mute self
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                onLoadedMetadata={() => console.log('Video metadata loaded')}
                                onPlay={() => console.log('Video started playing')}
                                onError={(e) => console.error('Video error:', e)}
                            />
                            {!isConnected && role === 'student' && (
                                <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                                    <Typography>Connecting to stream...</Typography>
                                </Box>
                            )}
                        </Box>
                     ) : (
                        <Box sx={{ textAlign: 'center' }}>
                            <Videocam sx={{ fontSize: 64, color: '#333', mb: 2 }} />
                            <Typography variant="h6" color="text.secondary">
                                {role === 'admin' ? 'Ready to Stream?' : 'Waiting for stream...'}
                            </Typography>
                            {role === 'admin' && (
                                <Button variant="contained" color="error" startIcon={<Videocam />} onClick={() => setIsLive(true)} sx={{ mt: 2 }}>
                                    Go Live
                                </Button>
                            )}
                        </Box>
                     )}
                </Box>
                
                {/* Live Badge */}
                {isLive && (
                    <Chip label="LIVE" color="error" size="small" sx={{ position: 'absolute', top: 16, left: 16, borderRadius: 1 }} />
                )}
                
                {/* Viewer Count */}
                 {isLive && (
                    <Chip label={`👁 ${connectedCount} `} sx={{ position: 'absolute', top: 16, right: 16, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', borderRadius: 1 }} />
                )}
            </Box>

            {/* Controls (Admin only) */}
            {role === 'admin' && isLive && (
                <Box sx={{ p: 2, bgcolor: '#111', display: 'flex', justifyContent: 'center', gap: 2 }}>
                    <Button variant="outlined" color="inherit" startIcon={<Mic />}>Mute</Button>
                    <Button variant="outlined" color="inherit" startIcon={<VideocamOff />}>Stop Video</Button>
                    <Button variant="contained" color="error" onClick={() => setIsLive(false)}>End Stream</Button>
                </Box>
            )}

            {/* Chat Overlay */}
            <Box sx={{ height: '300px', bgcolor: '#111', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ p: 2, borderBottom: '1px solid #333' }}>
                    <Typography variant="subtitle2" sx={{ color: 'white' }}>Live Chat</Typography>
                </Box>
                <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
                    {chatMessages.map((msg, i) => (
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
                    <Button variant="contained" sx={{ bgcolor: '#ff0055', '&:hover': { bgcolor: '#cc0044' } }} onClick={handleSendMessage}>
                        <Send />
                    </Button>
                </Box>
            </Box>
            </Box>
        </Container>
    )
}
