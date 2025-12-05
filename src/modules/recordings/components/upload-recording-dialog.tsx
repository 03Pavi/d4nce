import React, { useState } from 'react';
import { 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    DialogActions, 
    Button, 
    TextField, 
    Box, 
    Typography, 
    CircularProgress,
    IconButton,
    Select,
    MenuItem,
    FormControl,
    InputLabel
} from '@mui/material';
import { CloudUpload, Close } from '@mui/icons-material';
import { createClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { extractThumbnail } from '@/lib/get-thumbnail';

interface UploadRecordingDialogProps {
    open: boolean;
    onClose: () => void;
    onUploadSuccess: () => void;
}

export const UploadRecordingDialog = ({ open, onClose, onUploadSuccess }: UploadRecordingDialogProps) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [bucketMissing, setBucketMissing] = useState(false);
    
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClassId, setSelectedClassId] = useState('');

    const supabase = createClient();

    React.useEffect(() => {
        const fetchClasses = async () => {
            const { data } = await supabase.from('classes').select('id, title');
            if (data) setClasses(data);
        };
        fetchClasses();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.type.startsWith('video/')) {
                setFile(selectedFile);
                setError('');
            } else {
                setError('Please select a valid video file');
                setFile(null);
            }
        }
    };

    const handleUpload = async () => {
        if (!file || !title.trim()) {
            setError('Please provide a title and select a video file');
            return;
        }

        setUploading(true);
        setError('');
        setBucketMissing(false);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const fileExt = file.name.split('.').pop();
            const fileName = `${uuidv4()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;

            // 1. Upload file to Storage
            const uploadFile = async (attempt = 1): Promise<any> => {
                const { error: uploadError } = await supabase.storage
                    .from('recordings')
                    .upload(filePath, file);

                if (uploadError) {
                    // Check if bucket not found
                    if (uploadError.message.includes('Bucket not found') && attempt === 1) {
                        console.log('Bucket not found, attempting to create...');
                        // Try to create bucket
                        const { error: createBucketError } = await supabase.storage.createBucket('recordings', {
                            public: true
                        });
                        
                        if (createBucketError) {
                            console.error('Failed to create bucket:', createBucketError);
                            setBucketMissing(true);
                            throw new Error('Storage bucket "recordings" missing.');
                        }
                        
                        // Retry upload
                        return uploadFile(2);
                    }
                    throw uploadError;
                }
                return;
            };

            await uploadFile();

            // 2. Generate and Upload Thumbnail
            let thumbnailUrl = null;
            try {
                const thumbnailDataUrl = await extractThumbnail(file);
                const thumbnailBlob = await (await fetch(thumbnailDataUrl)).blob();
                const thumbnailFileName = `${uuidv4()}.jpg`;
                const thumbnailPath = `thumbnails/${user.id}/${thumbnailFileName}`;
                
                const { error: thumbUploadError } = await supabase.storage
                    .from('recordings')
                    .upload(thumbnailPath, thumbnailBlob);
                    
                if (!thumbUploadError) {
                    const { data: { publicUrl: thumbPublicUrl } } = supabase.storage
                        .from('recordings')
                        .getPublicUrl(thumbnailPath);
                    thumbnailUrl = thumbPublicUrl;
                }
            } catch (thumbErr) {
                console.error('Failed to generate/upload thumbnail:', thumbErr);
                // Continue without thumbnail if it fails
            }

            // 3. Get Public URL for Video
            const { data: { publicUrl } } = supabase.storage
                .from('recordings')
                .getPublicUrl(filePath);

            // 3. Insert record into Database
            const { error: dbError } = await supabase
                .from('recordings')
                .insert({
                    title,
                    description,
                    video_url: publicUrl,
                    thumbnail_url: thumbnailUrl,
                    created_by: user.id,
                    class_id: selectedClassId || null // Optional class association
                });

            if (dbError) throw dbError;

            onUploadSuccess();
            handleClose();
        } catch (err: any) {
            console.error('Upload error:', err);
            if (!bucketMissing) { // Don't overwrite specific bucket error if already set
                 setError(err.message || 'Failed to upload recording');
            }
        } finally {
            setUploading(false);
        }
    };

    const handleClose = () => {
        setTitle('');
        setDescription('');
        setFile(null);
        setError('');
        setBucketMissing(false);
        onClose();
    };

    return (
        <Dialog open={open} onClose={!uploading ? handleClose : undefined} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Upload Recording
                {!uploading && (
                    <IconButton onClick={handleClose} size="small">
                        <Close />
                    </IconButton>
                )}
            </DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                    {bucketMissing ? (
                        <Box sx={{ p: 2, bgcolor: 'rgba(255, 165, 0, 0.1)', border: '1px solid orange', borderRadius: 1 }}>
                            <Typography variant="subtitle1" color="warning.main" fontWeight="bold" gutterBottom>
                                Storage Bucket Missing
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#ddd', mb: 2 }}>
                                The "recordings" storage bucket does not exist and could not be created automatically. Please create it manually:
                            </Typography>
                            <ol style={{ color: '#bbb', paddingLeft: '20px', margin: 0 }}>
                                <li>Go to your <strong>Supabase Dashboard</strong>.</li>
                                <li>Navigate to <strong>Storage</strong>.</li>
                                <li>Click <strong>New Bucket</strong>.</li>
                                <li>Name it <code>recordings</code>.</li>
                                <li>Ensure <strong>Public Bucket</strong> is checked.</li>
                                <li>Click <strong>Save</strong>.</li>
                            </ol>
                            <Button 
                                variant="contained" 
                                color="warning" 
                                onClick={handleUpload}
                                sx={{ mt: 2 }}
                                fullWidth
                            >
                                I've Created It - Retry Upload
                            </Button>
                        </Box>
                    ) : (
                        <>
                            <Box 
                                sx={{ 
                                    border: '2px dashed rgba(255,255,255,0.2)', 
                                    borderRadius: 2, 
                                    p: 4, 
                                    textAlign: 'center',
                                    bgcolor: 'rgba(255,255,255,0.05)',
                                    cursor: uploading ? 'default' : 'pointer',
                                    '&:hover': {
                                        bgcolor: uploading ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)',
                                        borderColor: uploading ? 'rgba(255,255,255,0.2)' : '#ff0055'
                                    }
                                }}
                                onClick={() => !uploading && document.getElementById('recording-file-input')?.click()}
                            >
                                <input
                                    type="file"
                                    id="recording-file-input"
                                    accept="video/*"
                                    style={{ display: 'none' }}
                                    onChange={handleFileChange}
                                    disabled={uploading}
                                />
                                {file ? (
                                    <Box>
                                        <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
                                            {file.name}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Box>
                                        <CloudUpload sx={{ fontSize: 48, color: '#666', mb: 2 }} />
                                        <Typography variant="body1" sx={{ color: '#fff' }}>
                                            Click to select video
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: '#666' }}>
                                            MP4, WebM supported
                                        </Typography>
                                    </Box>
                                )}
                            </Box>

                            <TextField
                                label="Title"
                                fullWidth
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                disabled={uploading}
                            />

                            <FormControl fullWidth disabled={uploading}>
                                <InputLabel>Class (Optional)</InputLabel>
                                <Select
                                    value={selectedClassId}
                                    label="Class (Optional)"
                                    onChange={(e) => setSelectedClassId(e.target.value)}
                                >
                                    <MenuItem value="">
                                        <em>None (Public)</em>
                                    </MenuItem>
                                    {classes.map((cls) => (
                                        <MenuItem key={cls.id} value={cls.id}>
                                            {cls.title}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <TextField
                                label="Description (Optional)"
                                fullWidth
                                multiline
                                rows={3}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                disabled={uploading}
                            />

                            {error && (
                                <Typography color="error" variant="body2">
                                    {error}
                                </Typography>
                            )}
                        </>
                    )}
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2.5 }}>
                <Button onClick={handleClose} disabled={uploading} color="inherit">
                    Cancel
                </Button>
                {!bucketMissing && (
                    <Button 
                        onClick={handleUpload} 
                        variant="contained" 
                        disabled={uploading || !file || !title.trim()}
                        startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <CloudUpload />}
                        sx={{ bgcolor: '#ff0055', '&:hover': { bgcolor: '#cc0044' } }}
                    >
                        {uploading ? 'Uploading...' : 'Upload'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};
