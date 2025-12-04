import React, { useState, useEffect } from 'react';
import { 
    Box, 
    Typography, 
    Button, 
    Grid, 
    Card, 
    CardContent, 
    Container, 
    CircularProgress,
    Fade,
    IconButton
} from '@mui/material';
import { CloudUpload, VideoLibrary, Delete, PlayArrow } from '@mui/icons-material';
import { createClient } from '@/lib/supabase/client';
import ReactPlayer from 'react-player';
import dayjs from 'dayjs';
import { UploadRecordingDialog } from './upload-recording-dialog';
import { EditRecordingDialog } from './edit-recording-dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Edit } from '@mui/icons-material';

interface Recording {
    id: string;
    title: string;
    description: string;
    video_url: string;
    created_at: string;
    class_id?: string | null;
}

interface RecordingsListProps {
    role: 'admin' | 'student';
}

export const RecordingsList = ({ role }: RecordingsListProps) => {
    const [recordings, setRecordings] = useState<Recording[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    
    // Edit state
    const [editOpen, setEditOpen] = useState(false);
    const [editingRecording, setEditingRecording] = useState<Recording | null>(null);

    const supabase = createClient();

    useEffect(() => {
        fetchRecordings();
    }, []);

    const fetchRecordings = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            let query = supabase
                .from('recordings')
                .select('*, classes(title)') // Join with classes to get title if needed, though we just need to filter
                .order('created_at', { ascending: false });

            if (role === 'student') {
                // Fetch student enrollments
                const { data: enrollments } = await supabase
                    .from('enrollments')
                    .select('class_id')
                    .eq('student_id', user.id);

                const enrolledClassIds = enrollments?.map(e => e.class_id) || [];
                
                // Filter recordings: either public (class_id is null) or matching enrolled class_id
                // Supabase doesn't support complex OR with different columns easily in one go without raw SQL or 'or' syntax.
                // .or(`class_id.in.(${enrolledClassIds.join(',')}),class_id.is.null`)
                
                if (enrolledClassIds.length > 0) {
                     query = query.or(`class_id.in.(${enrolledClassIds.join(',')}),class_id.is.null`);
                } else {
                     query = query.is('class_id', null);
                }
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching recordings:', error);
            } else {
                setRecordings(data || []);
            }
        } catch (err) {
            console.error('Unexpected error fetching recordings:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (id: string) => {
        setDeleteId(id);
        setConfirmOpen(true);
    };

    const handleEditClick = (recording: Recording) => {
        setEditingRecording(recording);
        setEditOpen(true);
    };

    const handleConfirmDelete = async () => {
        // ... existing delete logic
        if (!deleteId) return;

        const { error } = await supabase
            .from('recordings')
            .delete()
            .eq('id', deleteId);

        if (error) {
            console.error('Error deleting recording:', error);
        } else {
            fetchRecordings();
        }
        setConfirmOpen(false);
        setDeleteId(null);
    };

    const handleEditSuccess = () => {
        fetchRecordings();
    };

    return (
        <Box sx={{ 
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(to bottom, #000000 0%, #0a0a0a 100%)',
        }}>
            {/* ... Header ... */}
            <Box sx={{ pt: { xs: 2, md: 4 }, pb: 2, px: 2, bgcolor: 'transparent', zIndex: 10 }}>
                <Container maxWidth="lg">
                    <Box sx={{ color: 'white' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Box>
                                <Typography variant="h5" fontWeight="bold" sx={{ mb: 0.5 }}>
                                    Class Recordings
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#888' }}>
                                    Watch past live sessions
                                </Typography>
                            </Box>
                            {role === 'admin' && (
                                <Button 
                                    variant="contained" 
                                    startIcon={<CloudUpload />} 
                                    onClick={() => setUploadOpen(true)}
                                    sx={{ 
                                        bgcolor: '#ff0055', 
                                        fontWeight: 'bold',
                                        '&:hover': { bgcolor: '#cc0044' }
                                    }}
                                >
                                    Upload
                                </Button>
                            )}
                        </Box>
                    </Box>
                </Container>
            </Box>

            {/* Scrollable Content */}
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
                <Container maxWidth="lg" sx={{ pb: 4 }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                            <CircularProgress color="secondary" />
                        </Box>
                    ) : recordings.length === 0 ? (
                        <Fade in={true}>
                            <Card sx={{ 
                                bgcolor: 'rgba(255,255,255,0.03)', 
                                border: '1px dashed rgba(255,255,255,0.1)',
                                textAlign: 'center',
                                py: 8
                            }}>
                                <CardContent>
                                    <VideoLibrary sx={{ fontSize: 64, color: '#333', mb: 2 }} />
                                    <Typography variant="h6" sx={{ color: '#666', mb: 1 }}>
                                        No Recordings Yet
                                    </Typography>
                                    {role === 'admin' && (
                                        <Button 
                                            variant="outlined" 
                                            startIcon={<CloudUpload />}
                                            onClick={() => setUploadOpen(true)}
                                            sx={{ 
                                                mt: 2,
                                                color: '#ff0055', 
                                                borderColor: '#ff0055',
                                                '&:hover': { borderColor: '#cc0044', bgcolor: 'rgba(255,0,85,0.1)' }
                                            }}
                                        >
                                            Upload Recording
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        </Fade>
                    ) : (
                        <Grid container spacing={3}>
                            {recordings.map((recording) => (
                                <Grid item xs={12} sm={6} md={4} key={recording.id}>
                                    <Card sx={{ 
                                        bgcolor: 'rgba(255,255,255,0.05)', 
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}>
                                        <Box sx={{ position: 'relative', pt: '56.25%', bgcolor: 'black' }}>
                                            <ReactPlayer
                                                // @ts-ignore
                                                url={recording.video_url}
                                                width="100%"
                                                height="100%"
                                                style={{ position: 'absolute', top: 0, left: 0 }}
                                                controls
                                                light
                                                playIcon={
                                                    <Box sx={{ 
                                                        width: 64, 
                                                        height: 64, 
                                                        bgcolor: 'rgba(255,0,85,0.8)', 
                                                        borderRadius: '50%', 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        '&:hover': { bgcolor: '#ff0055' }
                                                    }}>
                                                        <PlayArrow sx={{ fontSize: 40, color: 'white' }} />
                                                    </Box>
                                                }
                                            />
                                        </Box>
                                        <CardContent sx={{ flex: 1 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <Typography variant="h6" sx={{ color: 'white', mb: 1, fontWeight: 'bold' }}>
                                                    {recording.title}
                                                </Typography>
                                                {role === 'admin' && (
                                                    <Box>
                                                        <IconButton 
                                                            size="small" 
                                                            onClick={() => handleEditClick(recording)}
                                                            sx={{ color: '#666', '&:hover': { color: 'white' } }}
                                                        >
                                                            <Edit fontSize="small" />
                                                        </IconButton>
                                                        <IconButton 
                                                            size="small" 
                                                            onClick={() => handleDeleteClick(recording.id)}
                                                            sx={{ color: '#666', '&:hover': { color: '#ff0055' } }}
                                                        >
                                                            <Delete fontSize="small" />
                                                        </IconButton>
                                                    </Box>
                                                )}
                                            </Box>
                                            <Typography variant="body2" sx={{ color: '#aaa', mb: 2 }}>
                                                {dayjs(recording.created_at).format('MMM D, YYYY')}
                                            </Typography>
                                            {recording.description && (
                                                <Typography variant="body2" sx={{ color: '#888' }}>
                                                    {recording.description}
                                                </Typography>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </Container>
            </Box>

            <UploadRecordingDialog 
                open={uploadOpen} 
                onClose={() => setUploadOpen(false)} 
                onUploadSuccess={fetchRecordings} 
            />

            <EditRecordingDialog
                open={editOpen}
                onClose={() => setEditOpen(false)}
                onEditSuccess={handleEditSuccess}
                recording={editingRecording}
            />

            <ConfirmDialog 
                open={confirmOpen} 
                title="Delete Recording" 
                message="Are you sure you want to delete this recording? This action cannot be undone." 
                onConfirm={handleConfirmDelete} 
                onCancel={() => setConfirmOpen(false)} 
            />
        </Box>
    );
};
