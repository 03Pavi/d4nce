'use client'
import React, { useState } from 'react'
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
  useTheme,
  useMediaQuery
} from '@mui/material'
import { CloudUpload, Close, Delete, MovieFilter } from '@mui/icons-material'
import { createClient } from '@/lib/supabase/client'

interface UploadReelDialogProps {
  open: boolean
  onClose: () => void
  onUploadSuccess: () => void
}

export const UploadReelDialog = ({ open, onClose, onUploadSuccess }: UploadReelDialogProps) => {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const supabase = createClient()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0]
      if (selectedFile.type.startsWith('video/')) {
        setFile(selectedFile)
        setPreviewUrl(URL.createObjectURL(selectedFile))
        setError(null)
      } else {
        setError('Please select a valid video file.')
      }
    }
  }

  const handleClearFile = () => {
    setFile(null)
    setPreviewUrl(null)
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated');
      
      const userId = user.id;

      // 2. Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}/${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('reels')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // 3. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('reels')
        .getPublicUrl(fileName)

      // 4. Insert record into database
      const { error: dbError } = await supabase
        .from('reels')
        .insert({
          user_id: userId,
          url: publicUrl,
          description: description,
          likes_count: 0,
          comments_count: 0
        })

      if (dbError) throw dbError

      // Success
      onUploadSuccess()
      handleClose()
    } catch (err: any) {
      console.error('Upload failed:', err)
      setError(err.message || 'Failed to upload reel.')
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setPreviewUrl(null)
    setDescription('')
    setError(null)
    onClose()
  }

  return (
    <Dialog 
      open={open} 
      onClose={!uploading ? handleClose : undefined} 
      fullWidth 
      maxWidth="sm"
      fullScreen={fullScreen}
      PaperProps={{
        sx: {
          bgcolor: '#1a1a1a',
          color: 'white',
          borderRadius: fullScreen ? 0 : 3,
          backgroundImage: 'linear-gradient(to bottom right, #1a1a1a, #2a2a2a)',
          border: '1px solid #333'
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MovieFilter sx={{ color: '#ff0055' }} />
          <Typography variant="h6" fontWeight="bold">Upload New Reel</Typography>
        </Box>
        {!uploading && (
          <IconButton onClick={handleClose} sx={{ color: '#666', '&:hover': { color: 'white' } }}>
            <Close />
          </IconButton>
        )}
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {!previewUrl ? (
            <Button
              variant="outlined"
              component="label"
              fullWidth
              sx={{ 
                height: 250, 
                border: '2px dashed #444', 
                borderRadius: 2,
                display: 'flex', 
                flexDirection: 'column', 
                gap: 2,
                color: '#888',
                bgcolor: 'rgba(255,255,255,0.02)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  border: '2px dashed #ff0055',
                  bgcolor: 'rgba(255, 0, 85, 0.05)',
                  color: '#ff0055'
                }
              }}
            >
              <Box sx={{ 
                p: 2, 
                borderRadius: '50%', 
                bgcolor: 'rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CloudUpload sx={{ fontSize: 40 }} />
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ mb: 0.5 }}>Select Video</Typography>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>Drag and drop or click to browse</Typography>
              </Box>
              <input
                type="file"
                hidden
                accept="video/*"
                onChange={handleFileSelect}
              />
            </Button>
          ) : (
            <Box sx={{ 
              position: 'relative', 
              width: '100%', 
              height: 350, 
              bgcolor: 'black', 
              borderRadius: 2,
              overflow: 'hidden',
              display: 'flex', 
              justifyContent: 'center',
              border: '1px solid #333'
            }}>
              <video src={previewUrl} controls style={{ maxHeight: '100%', maxWidth: '100%' }} />
              <IconButton 
                onClick={handleClearFile}
                sx={{ 
                  position: 'absolute', 
                  top: 12, 
                  right: 12, 
                  bgcolor: 'rgba(0,0,0,0.6)', 
                  color: 'white', 
                  backdropFilter: 'blur(4px)',
                  '&:hover': { bgcolor: '#ff0055' } 
                }}
              >
                <Delete />
              </IconButton>
            </Box>
          )}

          <TextField
            label="Caption"
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            placeholder="Write a catchy caption... #dance #vibes"
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                color: 'white',
                bgcolor: 'rgba(255,255,255,0.03)',
                '& fieldset': { borderColor: '#444' },
                '&:hover fieldset': { borderColor: '#666' },
                '&.Mui-focused fieldset': { borderColor: '#ff0055' },
              },
              '& .MuiInputLabel-root': { color: '#888' },
              '& .MuiInputLabel-root.Mui-focused': { color: '#ff0055' }
            }}
          />

          {error && (
            <Box sx={{ p: 2, bgcolor: 'rgba(255,0,0,0.1)', borderRadius: 1, border: '1px solid rgba(255,0,0,0.2)' }}>
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3, borderTop: '1px solid #333' }}>
        <Button 
          onClick={handleClose} 
          disabled={uploading}
          sx={{ color: '#888', '&:hover': { color: 'white' } }}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleUpload} 
          variant="contained" 
          disabled={!file || uploading}
          startIcon={uploading ?  <CircularProgress size={20} color="inherit" /> : <CloudUpload />}
          sx={{
            bgcolor: '#ff0055',
            '&:hover': { bgcolor: '#d40047' },
            '&.Mui-disabled': { bgcolor: '#444', color: '#888' },
            px: 4,
            py: 1
          }}
        >
          {uploading ? 'Uploading...' : 'Post Reel'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
