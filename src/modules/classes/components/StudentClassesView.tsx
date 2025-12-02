'use client'
import React, { useState, useEffect } from 'react'
import { 
  Box, 
  Typography, 
  Card,
  CardContent,
  Chip,
  Container,
  Fade,
  Grid,
  Button,
  LinearProgress
} from '@mui/material'
import { 
  School, 
  AccessTime, 
  AttachMoney,
  PlayArrow,
  CheckCircle,
  Schedule
} from '@mui/icons-material'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'

interface EnrolledClass {
  id: string
  class_id: string
  has_paid: boolean
  enrolled_at: string
  class: {
    id: string
    title: string
    description: string
    session_id: string
    price: number
    scheduled_at: string
    duration_minutes: number
    is_active: boolean
    instructor: {
      full_name: string
      avatar_url?: string
    }
  }
}

export const StudentClassesView = () => {
  const [enrolledClasses, setEnrolledClasses] = useState<EnrolledClass[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchEnrolledClasses()
  }, [])

  const fetchEnrolledClasses = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('class_enrollments')
      .select(`
        *,
        class:classes(
          *,
          instructor:profiles!classes_instructor_id_fkey(full_name, avatar_url)
        )
      `)
      .eq('student_id', user.id)
      .order('enrolled_at', { ascending: false })

    if (error) {
      console.error('Error fetching enrolled classes:', error)
      setLoading(false)
      return
    }

    setEnrolledClasses(data || [])
    setLoading(false)
  }

  const handleJoinClass = (sessionId: string) => {
    // Navigate to the live tab with the specific session
    router.push(`/student?tab=live&session=${sessionId}`)
  }

  const getClassStatus = (scheduledAt: string) => {
    const now = dayjs()
    const classTime = dayjs(scheduledAt)
    const diffMinutes = classTime.diff(now, 'minute')

    if (diffMinutes < -60) {
      return { label: 'Completed', color: '#666', icon: CheckCircle }
    } else if (diffMinutes < 0) {
      return { label: 'In Progress', color: '#00e5ff', icon: PlayArrow }
    } else if (diffMinutes < 30) {
      return { label: 'Starting Soon', color: '#ff0055', icon: Schedule }
    } else {
      return { label: 'Upcoming', color: '#00e5ff', icon: Schedule }
    }
  }

  const getTimeUntilClass = (scheduledAt: string) => {
    const now = dayjs()
    const classTime = dayjs(scheduledAt)
    const diffMinutes = classTime.diff(now, 'minute')

    if (diffMinutes < 0) {
      return 'Now'
    } else if (diffMinutes < 60) {
      return `in ${diffMinutes} min`
    } else if (diffMinutes < 1440) {
      const hours = Math.floor(diffMinutes / 60)
      return `in ${hours} hour${hours > 1 ? 's' : ''}`
    } else {
      const days = Math.floor(diffMinutes / 1440)
      return `in ${days} day${days > 1 ? 's' : ''}`
    }
  }

  if (loading) {
    return (
      <Box sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(to bottom, #000000 0%, #0a0a0a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <LinearProgress sx={{ width: 200, bgcolor: '#333', '& .MuiLinearProgress-bar': { bgcolor: '#ff0055' } }} />
      </Box>
    )
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(to bottom, #000000 0%, #0a0a0a 100%)',
      py: { xs: 2, md: 4 }
    }}>
      <Container maxWidth="lg">
        <Box sx={{ color: 'white' }}>
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" fontWeight="bold" sx={{ mb: 0.5 }}>
              My Classes
            </Typography>
            <Typography variant="body2" sx={{ color: '#888' }}>
              {enrolledClasses.length} {enrolledClasses.length === 1 ? 'class' : 'classes'} enrolled
            </Typography>
          </Box>

          {/* Classes List */}
          {enrolledClasses.length === 0 ? (
            <Fade in={true}>
              <Card sx={{ 
                bgcolor: 'rgba(255,255,255,0.03)', 
                border: '1px dashed rgba(255,255,255,0.1)',
                textAlign: 'center',
                py: 8
              }}>
                <CardContent>
                  <School sx={{ fontSize: 64, color: '#333', mb: 2 }} />
                  <Typography variant="h6" sx={{ color: '#666', mb: 1 }}>
                    No Classes Yet
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#444', mb: 3 }}>
                    You haven't enrolled in any classes yet
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Contact your instructor to get enrolled
                  </Typography>
                </CardContent>
              </Card>
            </Fade>
          ) : (
            <Grid container spacing={3}>
              {enrolledClasses.map((enrollment, index) => {
                const status = getClassStatus(enrollment.class.scheduled_at)
                const StatusIcon = status.icon
                const isLive = status.label === 'In Progress' || status.label === 'Starting Soon'

                return (
                  <Grid item xs={12} md={6} key={enrollment.id}>
                    <Fade in={true} timeout={300 + index * 100}>
                      <Card sx={{ 
                        bgcolor: 'rgba(255,255,255,0.03)', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderLeft: `4px solid ${status.color}`,
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        overflow: 'visible',
                        '&:hover': {
                          bgcolor: 'rgba(255,255,255,0.05)',
                          transform: 'translateY(-4px)',
                          boxShadow: `0 8px 24px ${status.color}15`
                        }
                      }}>
                        {isLive && (
                          <Box sx={{
                            position: 'absolute',
                            top: -8,
                            right: 16,
                            bgcolor: '#ff0055',
                            color: 'white',
                            px: 2,
                            py: 0.5,
                            borderRadius: 2,
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            animation: 'pulse 2s infinite',
                            '@keyframes pulse': {
                              '0%, 100%': { opacity: 1 },
                              '50%': { opacity: 0.7 }
                            }
                          }}>
                            LIVE NOW
                          </Box>
                        )}

                        <CardContent sx={{ p: 3 }}>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="h6" fontWeight="bold" sx={{ color: 'white', mb: 0.5 }}>
                              {enrollment.class.title}
                            </Typography>
                            {enrollment.class.description && (
                              <Typography variant="body2" sx={{ color: '#aaa', mb: 1 }}>
                                {enrollment.class.description}
                              </Typography>
                            )}
                            <Typography variant="caption" sx={{ color: '#666' }}>
                              Instructor: <span style={{ color: '#00e5ff' }}>{enrollment.class.instructor?.full_name || 'Unknown'}</span>
                            </Typography>
                          </Box>

                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                            <Chip 
                              icon={<StatusIcon sx={{ fontSize: 16 }} />}
                              label={status.label}
                              size="small"
                              sx={{ 
                                bgcolor: `${status.color}15`,
                                color: status.color,
                                border: `1px solid ${status.color}30`,
                                fontWeight: 'bold'
                              }}
                            />
                            {enrollment.has_paid ? (
                              <Chip 
                                icon={<CheckCircle sx={{ fontSize: 16 }} />}
                                label="Paid"
                                size="small"
                                sx={{ 
                                  bgcolor: 'rgba(0,229,255,0.15)',
                                  color: '#00e5ff',
                                  border: '1px solid rgba(0,229,255,0.3)'
                                }}
                              />
                            ) : enrollment.class.price > 0 && (
                              <Chip 
                                icon={<AttachMoney sx={{ fontSize: 16 }} />}
                                label={`$${enrollment.class.price} Due`}
                                size="small"
                                sx={{ 
                                  bgcolor: 'rgba(255,165,0,0.15)',
                                  color: '#ff0055',
                                  border: '1px solid rgba(255,165,0,0.3)'
                                }}
                              />
                            )}
                            <Chip 
                              icon={<AccessTime sx={{ fontSize: 16 }} />}
                              label={`${enrollment.class.duration_minutes} min`}
                              size="small"
                              sx={{ 
                                bgcolor: 'rgba(255,255,255,0.1)',
                                color: '#aaa',
                                border: '1px solid rgba(255,255,255,0.2)'
                              }}
                            />
                          </Box>

                          <Box sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Schedule sx={{ fontSize: 18, color: '#888' }} />
                              <Typography variant="body2" sx={{ color: '#aaa' }}>
                                {dayjs(enrollment.class.scheduled_at).format('MMM DD, YYYY • hh:mm A')}
                              </Typography>
                            </Box>
                            <Typography variant="caption" sx={{ color: status.color, fontWeight: 'bold', ml: 3 }}>
                              {getTimeUntilClass(enrollment.class.scheduled_at)}
                            </Typography>
                          </Box>

                          {status.label !== 'Completed' && (
                            <Button
                              fullWidth
                              variant="contained"
                              startIcon={<PlayArrow />}
                              onClick={() => handleJoinClass(enrollment.class.session_id)}
                              sx={{
                                bgcolor: isLive ? '#ff0055' : 'rgba(255,255,255,0.1)',
                                color: isLive ? 'white' : '#fff',
                                fontWeight: 'bold',
                                py: 1.5,
                                '&:hover': { 
                                  bgcolor: isLive ? '#cc0044' : 'rgba(255,255,255,0.2)' 
                                }
                              }}
                            >
                              {isLive ? 'Join Class Now' : 'Enter Waiting Room'}
                            </Button>
                          )}

                          {status.label === 'Upcoming' && (
                            <Button
                              fullWidth
                              variant="outlined"
                              startIcon={<Schedule />}
                              disabled
                              sx={{
                                borderColor: 'rgba(255,255,255,0.2)',
                                color: '#666',
                                py: 1.5
                              }}
                            >
                              Scheduled
                            </Button>
                          )}

                          {status.label === 'Completed' && (
                            <Button
                              fullWidth
                              variant="outlined"
                              startIcon={<CheckCircle />}
                              disabled
                              sx={{
                                borderColor: 'rgba(255,255,255,0.2)',
                                color: '#666',
                                py: 1.5
                              }}
                            >
                              Completed
                            </Button>
                          )}

                          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            <Typography variant="caption" sx={{ color: '#666' }}>
                              Enrolled on {dayjs(enrollment.enrolled_at).format('MMM DD, YYYY')}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Fade>
                  </Grid>
                )
              })}
            </Grid>
          )}
        </Box>
      </Container>
    </Box>
  )
}
