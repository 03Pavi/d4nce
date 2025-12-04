import React, { useState, useEffect, useRef } from 'react'
import { Box, Button, Typography, Container, IconButton, Chip } from '@mui/material'
import { Videocam, Mic, VideocamOff, GridView, ChatBubble, MicOff } from '@mui/icons-material'
import { useLiveStream } from '../hooks/use-live-stream'
import { createClient } from '@/lib/supabase/client'
import { LiveSessionChat } from './live-session-chat'
import { LiveSessionGrid } from './live-session-grid'

interface LiveSessionProps {
    role: 'admin' | 'student';
    isPaid?: boolean;
    hasPurchased?: boolean;
    sessionId?: string;
    isPip?: boolean;
}

export const LiveSession = ({ role, isPaid = false, hasPurchased = false, sessionId = 'class-1', isPip = false }: LiveSessionProps) => {
    const [userName, setUserName] = useState<string>(role === 'admin' ? 'Instructor' : 'Student');
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

    const { localStream, remoteStreams, isConnected, chatMessages, sendChatMessage, connectedCount } = useLiveStream(isLive ? role : 'student', sessionId, userName, isLive);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [pinnedStreamId, setPinnedStreamId] = useState<string | null>(null);
    const [showGrid, setShowGrid] = useState(false);
    
    const [showChat, setShowChat] = useState(true);
    const [isMuted, setIsMuted] = useState(true);
    const [isVideoStopped, setIsVideoStopped] = useState(true);

    const toggleMute = () => setIsMuted(!isMuted);
    const toggleVideo = () => setIsVideoStopped(!isVideoStopped);

    useEffect(() => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !isMuted;
            });
        }
    }, [localStream, isMuted]);

    useEffect(() => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => {
                track.enabled = !isVideoStopped;
            });
        }
    }, [localStream, isVideoStopped]);

    // Determine which stream to show in main view
    const mainStream = pinnedStreamId === 'local' 
        ? localStream 
        : (pinnedStreamId && remoteStreams[pinnedStreamId] 
            ? remoteStreams[pinnedStreamId] 
            : (Object.values(remoteStreams)[0] || localStream));

    useEffect(() => {
        if (videoRef.current && mainStream) {
            console.log('Setting main stream to video element');
            videoRef.current.srcObject = mainStream;
        }
    }, [mainStream]);
    
    const handleSendMessage = (text: string) => {
        sendChatMessage(text);
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

    // PiP Mode Rendering
    if (isPip) {
        if (!isLive) return null; // Don't show PiP if not live

        return (
            <Box sx={{ 
                position: 'fixed', 
                bottom: 80, 
                right: 16, 
                width: 200, 
                height: 150, 
                bgcolor: 'black', 
                borderRadius: 2, 
                overflow: 'hidden', 
                zIndex: 9999,
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted={mainStream === localStream} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
                <Box sx={{ position: 'absolute', top: 4, left: 4 }}>
                    <Chip label="LIVE" color="error" size="small" sx={{ height: 20, fontSize: '0.6rem' }} />
                </Box>
            </Box>
        );
    }

    return (
        <Container maxWidth="lg" disableGutters sx={{ height: '100%' }}>
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'black', position: 'relative' }}>
            {/* Video Area */}
            <Box sx={{ 
                flex: showChat ? '0 0 calc(100% - 300px)' : 1, // Dynamic height
                bgcolor: '#222', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                position: 'relative', 
                overflow: 'hidden',
                transition: 'all 0.3s ease'
            }}>
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
                                Join Class
                            </Button>
                        </Box>
                     )}
                </Box>
                
                {/* Live Badge */}
                {isLive && (
                    <Chip label="LIVE" color="error" size="small" sx={{ position: 'absolute', top: 16, left: 16, borderRadius: 1 }} />
                )}
                
                {/* Viewer Count & Controls Overlay */}
                 {isLive && (
                    <Box sx={{ position: 'absolute', top: 16, right: 16, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                        <Chip label={`👥 ${connectedCount} `} sx={{ bgcolor: 'rgba(0,0,0,0.5)', color: 'white', borderRadius: 1 }} />
                        <IconButton 
                            size="small" 
                            onClick={() => setShowGrid(true)}
                            sx={{ bgcolor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
                        >
                            <GridView />
                        </IconButton>
                        <IconButton 
                            size="small" 
                            onClick={() => setShowChat(!showChat)}
                            sx={{ bgcolor: showChat ? '#ff0055' : 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { bgcolor: showChat ? '#cc0044' : 'rgba(0,0,0,0.7)' } }}
                        >
                            <ChatBubble />
                        </IconButton>
                    </Box>
                )}

                {/* Bottom Controls Overlay */}
                {isLive && (
                    <Box sx={{ 
                        position: 'absolute', 
                        bottom: 16, 
                        left: '50%', 
                        transform: 'translateX(-50%)', 
                        display: 'flex', 
                        gap: 2,
                        bgcolor: 'rgba(0,0,0,0.6)',
                        borderRadius: 4,
                        p: 1
                    }}>
                        <IconButton onClick={toggleMute} sx={{ color: isMuted ? '#ff0055' : 'white', border: '1px solid rgba(255,255,255,0.3)' }}>
                            {isMuted ? <MicOff /> : <Mic />}
                        </IconButton>
                        <IconButton onClick={toggleVideo} sx={{ color: isVideoStopped ? '#ff0055' : 'white', border: '1px solid rgba(255,255,255,0.3)' }}>
                            {isVideoStopped ? <VideocamOff /> : <Videocam />}
                        </IconButton>
                        <Button variant="contained" color="error" size="small" onClick={() => setIsLive(false)} sx={{ borderRadius: 4 }}>
                            Leave
                        </Button>
                    </Box>
                )}
            </Box>

            {/* Chat Overlay (Conditional) */}
            {showChat && (
                <LiveSessionChat 
                    messages={chatMessages} 
                    onSendMessage={handleSendMessage} 
                    onClose={() => setShowChat(false)} 
                />
            )}
            </Box>

            {/* Full Screen Grid Dialog */}
            <LiveSessionGrid 
                open={showGrid} 
                onClose={() => setShowGrid(false)} 
                localStream={localStream} 
                remoteStreams={remoteStreams} 
                pinnedStreamId={pinnedStreamId} 
                onPinStream={setPinnedStreamId} 
            />
        </Container>
    )
}
