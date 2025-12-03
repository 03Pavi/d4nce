import React, { useState, useRef } from 'react'
import { Box, Typography, IconButton, Dialog, AppBar, Toolbar, Slide, Button, Grid } from '@mui/material'
import { TransitionProps } from '@mui/material/transitions';
import { Close, PushPin } from '@mui/icons-material'

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface LiveSessionGridProps {
    open: boolean;
    onClose: () => void;
    localStream: MediaStream | null;
    remoteStreams: Record<string, MediaStream>;
    pinnedStreamId: string | null;
    onPinStream: (id: string | null) => void;
}

export const LiveSessionGrid = ({ open, onClose, localStream, remoteStreams, pinnedStreamId, onPinStream }: LiveSessionGridProps) => {
    const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
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
            onPinStream(pinnedStreamId === peerId ? null : peerId);
            onClose();
        }
    };

    return (
        <Dialog
            fullScreen
            open={open}
            onClose={onClose}
            TransitionComponent={Transition}
            PaperProps={{
                sx: { bgcolor: '#1a1a1a', color: 'white' }
            }}
        >
            <AppBar sx={{ position: 'relative', bgcolor: '#111' }}>
                <Toolbar>
                    <IconButton edge="start" color="inherit" onClick={onClose} aria-label="close">
                        <Close />
                    </IconButton>
                    <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
                        Connected Streams ({Object.keys(remoteStreams).length + (localStream ? 1 : 0)})
                    </Typography>
                    <Button autoFocus color="inherit" onClick={onClose}>
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
                                onClick={() => handleClick('local')}
                                sx={{ 
                                    position: 'relative', 
                                    paddingTop: '75%', // 4:3 aspect ratio
                                    bgcolor: 'black', 
                                    borderRadius: 2, 
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    border: pinnedStreamId === 'local' ? '3px solid #ff0055' : '1px solid #333',
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
                                {pinnedStreamId === 'local' && <PushPin sx={{ position: 'absolute', top: 8, right: 8, color: '#ff0055', fontSize: 20 }} />}
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
                    pointerEvents: 'none' 
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
    )
}
