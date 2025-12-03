import React from 'react'
import { Box, Avatar, IconButton } from '@mui/material'
import { CloudUpload } from '@mui/icons-material'

interface AvatarUploadProps {
  previewUrl: string | null
  onFileSelect: (file: File) => void
  onError: (error: string) => void
}

export const AvatarUpload = ({ previewUrl, onFileSelect, onError }: AvatarUploadProps) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0]
      if (selectedFile.type.startsWith('image/')) {
        onFileSelect(selectedFile)
      } else {
        onError('Please select a valid image file.')
      }
    }
  }

  return (
    <Box sx={{ position: 'relative' }}>
      <Avatar 
        src={previewUrl || undefined} 
        sx={{ width: 100, height: 100, border: '2px solid var(--primary)' }}
      />
      <IconButton
        component="label"
        sx={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          bgcolor: 'var(--primary)',
          color: 'white',
          '&:hover': { bgcolor: '#d40047' },
          p: 1
        }}
      >
        <CloudUpload fontSize="small" />
        <input type="file" hidden accept="image/*" onChange={handleFileChange} />
      </IconButton>
    </Box>
  )
}
