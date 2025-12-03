import React from 'react'
import { 
  Box, 
  Typography, 
  Button, 
  Card,
  CardContent,
  Chip,
  IconButton,
  Fade,
  Grid
} from '@mui/material'
import { 
  Delete, 
  People, 
  AccessTime, 
  AttachMoney,
  PersonAdd,
  Edit,
  PlayArrow
} from '@mui/icons-material'
import dayjs from 'dayjs'
import { Class } from './types'

interface ClassCardProps {
  cls: Class
  index: number
  onEdit: (cls: Class) => void
  onEnroll: (cls: Class) => void
  onDelete: (classId: string) => void
  onJoin: (sessionId: string) => void
}

export const ClassCard = ({ cls, index, onEdit, onEnroll, onDelete, onJoin }: ClassCardProps) => {
  return (
    <Grid item xs={12} md={6}>
      <Fade in={true} timeout={300 + index * 100}>
        <Card sx={{ 
          bgcolor: 'rgba(255,255,255,0.03)', 
          border: '1px solid rgba(255,255,255,0.1)',
          borderLeft: '4px solid #ff0055',
          transition: 'all 0.3s ease',
          '&:hover': {
            bgcolor: 'rgba(255,255,255,0.05)',
            transform: 'translateY(-4px)',
            boxShadow: '0 8px 24px rgba(255,0,85,0.15)'
          }
        }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" fontWeight="bold" sx={{ color: 'white', mb: 0.5 }}>
                  {cls.title}
                </Typography>
                {cls.description && (
                  <Typography variant="body2" sx={{ color: '#aaa', mb: 1 }}>
                    {cls.description}
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <IconButton 
                  size="small"
                  onClick={() => onEdit(cls)}
                  sx={{ 
                    color: '#ff0055',
                    '&:hover': { bgcolor: 'rgba(255,165,0,0.1)' }
                  }}
                >
                  <Edit />
                </IconButton>
                <IconButton 
                  size="small"
                  onClick={() => onEnroll(cls)}
                  sx={{ 
                    color: '#00e5ff',
                    '&:hover': { bgcolor: 'rgba(0,229,255,0.1)' }
                  }}
                >
                  <PersonAdd />
                </IconButton>
                <IconButton 
                  size="small"
                  onClick={() => onDelete(cls.id)}
                  sx={{ 
                    color: '#666',
                    '&:hover': { color: '#ff0055', bgcolor: 'rgba(255,0,85,0.1)' }
                  }}
                >
                  <Delete />
                </IconButton>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              <Chip 
                icon={<People sx={{ fontSize: 16 }} />}
                label={`${cls.enrolled_count || 0}/${cls.max_students} Students`}
                size="small"
                sx={{ 
                  bgcolor: 'rgba(0,229,255,0.15)',
                  color: '#00e5ff',
                  border: '1px solid rgba(0,229,255,0.3)'
                }}
              />
              <Chip 
                icon={<AttachMoney sx={{ fontSize: 16 }} />}
                label={cls.price === 0 ? 'Free' : `$${cls.price}`}
                size="small"
                sx={{ 
                  bgcolor: 'rgba(255,0,85,0.15)',
                  color: '#ff0055',
                  border: '1px solid rgba(255,0,85,0.3)'
                }}
              />
              <Chip 
                icon={<AccessTime sx={{ fontSize: 16 }} />}
                label={`${cls.duration_minutes} min`}
                size="small"
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.1)',
                  color: '#aaa',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccessTime sx={{ fontSize: 18, color: '#888' }} />
              <Typography variant="body2" sx={{ color: '#aaa' }}>
                {dayjs(cls.scheduled_at).format('MMM DD, YYYY • hh:mm A')}
              </Typography>
            </Box>

            <Box sx={{ mt: 2 }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<PlayArrow />}
                onClick={() => onJoin(cls.session_id)}
                sx={{
                  bgcolor: '#00e5ff',
                  color: 'black',
                  fontWeight: 'bold',
                  '&:hover': { bgcolor: '#00b2cc' }
                }}
              >
                Join Class
              </Button>
            </Box>

            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <Typography variant="caption" sx={{ color: '#666' }}>
                Session ID: <span style={{ color: '#00e5ff' }}>{cls.session_id}</span>
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Fade>
    </Grid>
  )
}
