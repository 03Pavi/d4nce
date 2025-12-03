import React, { useState, useEffect, useRef } from 'react'
import { Box, Button, Typography, TextField, Chip, Container, Grid, IconButton, Dialog, AppBar, Toolbar, Slide } from '@mui/material'
import { TransitionProps } from '@mui/material/transitions';
import { Send, Videocam, Mic, VideocamOff, GridView, Close, PushPin } from '@mui/icons-material'
import { useLiveStream } from '../hooks/useLiveStream'
import { createClient } from '@/lib/supabase/client'

interface LiveSessionProps {
    role: 'admin' | 'student';
    isPaid?: boolean;
    hasPurchased?: boolean;
    sessionId?: string;
}

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export const LiveSession = ({ role, isPaid = false, hasPurchased = false, sessionId = 'class-1' }: LiveSessionProps) => {
    const [userName, setUserName] = useState<string>(role === 'admin' ? 'Instructor' : 'Student');
    // Auto-join for admin, manual for student? Or manual for both?
    // Let's make it manual for everyone to "Join Session"
    const [isLive, setIsLive] = useState(false); 
    
    // Fetch user profile for name
    useEffect(() => {
        const fetchProfile = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('full_name, username').eq('id', user.id).single();
                if (profile) {
                    setUserName(profile.full_name || profile.username || (role === 'admin' ? 'Instructor' : 'Student'));
                }
            }
        };
        fetchProfile();
    }, [role]);

    const { localStream, remoteStream, remoteStreams, isConnected, chatMessages, sendChatMessage, connectedCount } = useLiveStream(isLive ? role : 'student', sessionId, userName);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [pinnedStreamId, setPinnedStreamId] = useState<string | null>(null);
    const [showGrid, setShowGrid] = useState(false);
    const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

    // Long press logic
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const isLongPress = useRef(false);

    const handleStart = (stream: MediaStream) => {
        isLongPress.current = false;
        timerRef.current = setTimeout(() => {
            isLongPress.current = true;
            setPreviewStream(stream);
        }, 500);
    };

    const handleEnd = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        setPreviewStream(null);
    };

    const handleClick = (peerId: string | null) => {
        if (!isLongPress.current) {
            setPinnedStreamId(peerId);
            setShowGrid(false);
        }
    };

    // Determine which stream to show in main view
    // Default: If pinned, show pinned.
    // Else if admin is present (and I am student), show admin? 
    // But we don't know which one is admin easily without metadata.
    // For now, default to the first remote stream if available, else local.
    const mainStream = pinnedStreamId && remoteStreams[pinnedStreamId] 
        ? remoteStreams[pinnedStreamId] 
        : (Object.values(remoteStreams)[0] || localStream);

    useEffect(() => {
        if (videoRef.current && mainStream) {
            console.log('Setting main stream to video element');
            videoRef.current.srcObject = mainStream;
        }
    }, [mainStream]);
    
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
                                muted={mainStream === localStream} // Mute self
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                            {!mainStream && (
                                <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                                    <Typography>Waiting for others to join...</Typography>
                                </Box>
                            )}
                        </Box>
                     ) : (
                        <Box sx={{ textAlign: 'center' }}>
                            <Videocam sx={{ fontSize: 64, color: '#333', mb: 2 }} />
                            <Typography variant="h6" color="text.secondary">
                                Ready to join the session?
                            </Typography>
                            <Button variant="contained" color="error" startIcon={<Videocam />} onClick={() => setIsLive(true)} sx={{ mt: 2 }}>
                                Join with Video
                            </Button>
                        </Box>
                     )}
                </Box>
                
                {/* Live Badge */}
                {isLive && (
                    <Chip label="LIVE" color="error" size="small" sx={{ position: 'absolute', top: 16, left: 16, borderRadius: 1 }} />
                )}
                
                {/* Viewer Count & More Streams */}
                 {isLive && (
                    <Box sx={{ position: 'absolute', top: 16, right: 16, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                        <Chip label={`👥 ${connectedCount} `} sx={{ bgcolor: 'rgba(0,0,0,0.5)', color: 'white', borderRadius: 1 }} />
                        <Button 
                            variant="contained" 
                            size="small" 
                            startIcon={<GridView />} 
                            onClick={() => setShowGrid(true)}
                            sx={{ bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
                        >
                            Grid View
                        </Button>
                    </Box>
                )}
            </Box>

            {/* Controls */}
            {isLive && (
                <Box sx={{ p: 2, bgcolor: '#111', display: 'flex', justifyContent: 'center', gap: 2 }}>
                    <Button variant="outlined" color="inherit" startIcon={<Mic />}>Mute</Button>
                    <Button variant="outlined" color="inherit" startIcon={<VideocamOff />}>Stop Video</Button>
                    <Button variant="contained" color="error" onClick={() => setIsLive(false)}>Leave</Button>
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

            {/* Full Screen Grid Dialog */}
            <Dialog
                fullScreen
                open={showGrid}
                onClose={() => setShowGrid(false)}
                TransitionComponent={Transition}
                PaperProps={{
                    sx: { bgcolor: '#1a1a1a', color: 'white' }
                }}
            >
                <AppBar sx={{ position: 'relative', bgcolor: '#111' }}>
                    <Toolbar>
                        <IconButton edge="start" color="inherit" onClick={() => setShowGrid(false)} aria-label="close">
                            <Close />
                        </IconButton>
                        <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
                            Connected Streams ({Object.keys(remoteStreams).length + (localStream ? 1 : 0)})
                        </Typography>
                        <Button autoFocus color="inherit" onClick={() => setShowGrid(false)}>
                            Done
                        </Button>
                    </Toolbar>
                </AppBar>
                <Box sx={{ p: 2, overflowY: 'auto', flex: 1 }}>
                    <Typography variant="caption" sx={{ display: 'block', mb: 2, color: '#aaa', textAlign: 'center' }}>
                        Tap to Pin • Hold to Preview
                    </Typography>
                    <Grid container spacing={2}>
                        {/* Local Stream */}
                        {localStream && (
                            <Grid item xs={6} sm={4} md={3}>
                                <Box 
                                    onMouseDown={() => handleStart(localStream)}
                                    onMouseUp={handleEnd}
                                    onMouseLeave={handleEnd}
                                    onTouchStart={() => handleStart(localStream)}
                                    onTouchEnd={handleEnd}
                                    onClick={() => handleClick(null)}
                                    sx={{ 
                                        position: 'relative', 
                                        paddingTop: '75%', // 4:3 aspect ratio
                                        bgcolor: 'black', 
                                        borderRadius: 2, 
                                        overflow: 'hidden',
                                        cursor: 'pointer',
                                        border: !pinnedStreamId ? '3px solid #ff0055' : '1px solid #333',
                                        transition: 'transform 0.2s',
                                        '&:active': { transform: 'scale(0.95)' }
                                    }}
                                >
                                    <video 
                                        autoPlay 
                                        playsInline 
                                        muted 
                                        ref={ref => { if (ref) ref.srcObject = localStream }}
                                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} 
                                    />
                                    <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: 1, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
                                        <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold' }}>You</Typography>
                                    </Box>
                                    {!pinnedStreamId && <PushPin sx={{ position: 'absolute', top: 8, right: 8, color: '#ff0055', fontSize: 20 }} />}
                                </Box>
                            </Grid>
                        )}

                        {/* Remote Streams */}
                        {Object.entries(remoteStreams).map(([peerId, stream]) => (
                            <Grid item xs={6} sm={4} md={3} key={peerId}>
                                <Box 
                                    onMouseDown={() => handleStart(stream)}
                                    onMouseUp={handleEnd}
                                    onMouseLeave={handleEnd}
                                    onTouchStart={() => handleStart(stream)}
                                    onTouchEnd={handleEnd}
                                    onClick={() => handleClick(peerId)}
                                    sx={{ 
                                        position: 'relative', 
                                        paddingTop: '75%', 
                                        bgcolor: 'black', 
                                        borderRadius: 2, 
                                        overflow: 'hidden',
                                        cursor: 'pointer',
                                        border: pinnedStreamId === peerId ? '3px solid #ff0055' : '1px solid #333',
                                        transition: 'transform 0.2s',
                                        '&:active': { transform: 'scale(0.95)' }
                                    }}
                                >
                                    <video 
                                        autoPlay 
                                        playsInline 
                                        ref={ref => { if (ref) ref.srcObject = stream }}
                                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} 
                                    />
                                    <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: 1, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
                                        <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold' }}>User {peerId.slice(0, 4)}</Typography>
                                    </Box>
                                    {pinnedStreamId === peerId && <PushPin sx={{ position: 'absolute', top: 8, right: 8, color: '#ff0055', fontSize: 20 }} />}
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                </Box>

                {/* Preview Overlay */}
                {previewStream && (
                    <Box sx={{ 
                        position: 'fixed', 
                        top: 0, left: 0, right: 0, bottom: 0, 
                        bgcolor: 'rgba(0,0,0,0.9)', 
                        zIndex: 9999,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        pointerEvents: 'none' // Let touch events pass through to underlying element to detect release? 
                        // Actually, if we cover it, onMouseUp might not fire on the original element.
                        // But we need to see it.
                    }}>
                        <Box sx={{ width: '90%', height: '80%', position: 'relative' }}>
                             <video 
                                autoPlay 
                                playsInline 
                                ref={ref => { if (ref) ref.srcObject = previewStream }}
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                            />
                            <Typography sx={{ position: 'absolute', bottom: -40, left: 0, right: 0, textAlign: 'center', color: 'white' }}>
                                Release to close
                            </Typography>
                        </Box>
                    </Box>
                )}
            </Dialog>
        </Container>
    )
}
