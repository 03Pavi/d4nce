'use client'
import React, { useState, useEffect } from 'react'
import { 
  Box, 
  Typography, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  TextField,
  Card,
  CardContent,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Checkbox,
  Snackbar,
  Alert,
  Container,
  Fade,
  Grid} from '@mui/material'
import { 
  Add, 
  School, 
  Delete, 
  People, 
  AccessTime, 
  AttachMoney,
  PersonAdd,
  CheckCircle,
  Edit,
  PlayArrow,
  Autorenew
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import dayjs from 'dayjs'

interface Class {
  id: string
  title: string
  description: string
  instructor_id: string
  session_id: string
  price: number
  max_students: number
  scheduled_at: string
  duration_minutes: number
  is_active: boolean
  enrolled_count?: number
}

interface Student {
  id: string
  full_name: string
  email: string
  avatar_url?: string
}

interface Enrollment {
  id: string
  student_id: string
  has_paid: boolean
  student?: Student
}

export const ClassesManagement = () => {
  const router = useRouter()
  const [classes, setClasses] = useState<Class[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false)
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' })
  
  const generateSessionId = () => {
    return Math.random().toString(36).substring(2, 10) + '-' + Math.random().toString(36).substring(2, 6);
  }

  const [newClass, setNewClass] = useState({
    title: '',
    description: '',
    session_id: generateSessionId(),
    price: 0,
    max_students: 50,
    scheduled_at: dayjs().add(1, 'day'),
    duration_minutes: 60
  })

  const [editClass, setEditClass] = useState({
    id: '',
    title: '',
    description: '',
    session_id: '',
    price: 0,
    max_students: 50,
    scheduled_at: dayjs(),
    duration_minutes: 60
  })

  const supabase = createClient()

  useEffect(() => {
    fetchClasses()
    fetchStudents()
  }, [])

  const fetchClasses = async () => {
    const { data, error } = await supabase
      .from('classes')
      .select(`
        *,
        class_enrollments(count)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching classes:', error)
      return
    }

    const classesWithCount = data?.map(cls => ({
      ...cls,
      enrolled_count: cls.class_enrollments?.[0]?.count || 0
    }))

    setClasses(classesWithCount || [])
  }

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .eq('role', 'student')
      .order('full_name')

    if (error) {
      console.error('Error fetching students:', error)
      return
    }

    setStudents(data || [])
  }

  const fetchEnrollments = async (classId: string) => {
    const { data, error } = await supabase
      .from('class_enrollments')
      .select(`
        *,
        student:profiles(id, full_name, email, avatar_url)
      `)
      .eq('class_id', classId)

    if (error) {
      console.error('Error fetching enrollments:', error)
      return
    }

    setEnrollments(data || [])
  }

  const handleCreateClass = async () => {
    if (!newClass.title.trim()) {
      setSnackbar({ open: true, message: 'Please fill in all required fields', severity: 'error' })
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('classes')
      .insert({
        title: newClass.title,
        description: newClass.description,
        instructor_id: user.id,
        session_id: newClass.session_id,
        price: newClass.price,
        max_students: newClass.max_students,
        scheduled_at: newClass.scheduled_at.toISOString(),
        duration_minutes: newClass.duration_minutes
      })

    if (error) {
      setSnackbar({ open: true, message: 'Error creating class: ' + error.message, severity: 'error' })
      return
    }

    setSnackbar({ open: true, message: 'Class created successfully!', severity: 'success' })
    setCreateDialogOpen(false)
    setNewClass({
      title: '',
      description: '',
      session_id: generateSessionId(),
      price: 0,
      max_students: 50,
      scheduled_at: dayjs().add(1, 'day'),
      duration_minutes: 60
    })
    fetchClasses()
  }

  const handleDeleteClass = async (classId: string) => {
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', classId)

    if (error) {
      setSnackbar({ open: true, message: 'Error deleting class', severity: 'error' })
      return
    }

    setSnackbar({ open: true, message: 'Class deleted successfully', severity: 'success' })
    fetchClasses()
  }

  const handleOpenEnrollDialog = async (cls: Class) => {
    setSelectedClass(cls)
    await fetchEnrollments(cls.id)
    setEnrollDialogOpen(true)
  }

  const handleEnrollStudents = async () => {
    if (!selectedClass || selectedStudents.length === 0) return

    const enrollmentData = selectedStudents.map(studentId => ({
      class_id: selectedClass.id,
      student_id: studentId,
      has_paid: selectedClass.price === 0 // Auto-mark as paid if free
    }))

    const { error } = await supabase
      .from('class_enrollments')
      .insert(enrollmentData)

    if (error) {
      setSnackbar({ open: true, message: 'Error enrolling students: ' + error.message, severity: 'error' })
      return
    }

    setSnackbar({ open: true, message: `${selectedStudents.length} student(s) enrolled successfully!`, severity: 'success' })
    setSelectedStudents([])
    if (selectedClass) {
      await fetchEnrollments(selectedClass.id)
    }
    fetchClasses()
  }

  const handleRemoveEnrollment = async (enrollmentId: string) => {
    const { error } = await supabase
      .from('class_enrollments')
      .delete()
      .eq('id', enrollmentId)

    if (error) {
      setSnackbar({ open: true, message: 'Error removing enrollment', severity: 'error' })
      return
    }

    setSnackbar({ open: true, message: 'Student removed from class', severity: 'success' })
    if (selectedClass) {
      await fetchEnrollments(selectedClass.id)
    }
    fetchClasses()
  }

  const handleOpenEditDialog = (cls: Class) => {
    setEditClass({
      id: cls.id,
      title: cls.title,
      description: cls.description,
      session_id: cls.session_id,
      price: cls.price,
      max_students: cls.max_students,
      scheduled_at: dayjs(cls.scheduled_at),
      duration_minutes: cls.duration_minutes
    })
    setEditDialogOpen(true)
  }

  const handleUpdateClass = async () => {
    if (!editClass.title.trim() || !editClass.session_id.trim()) {
      setSnackbar({ open: true, message: 'Please fill in all required fields', severity: 'error' })
      return
    }

    const { error } = await supabase
      .from('classes')
      .update({
        title: editClass.title,
        description: editClass.description,
        session_id: editClass.session_id,
        price: editClass.price,
        max_students: editClass.max_students,
        scheduled_at: editClass.scheduled_at.toISOString(),
        duration_minutes: editClass.duration_minutes
      })
      .eq('id', editClass.id)

    if (error) {
      setSnackbar({ open: true, message: 'Error updating class: ' + error.message, severity: 'error' })
      return
    }

    setSnackbar({ open: true, message: 'Class updated successfully!', severity: 'success' })
    setEditDialogOpen(false)
    fetchClasses()
  }

  const handleJoinClass = (sessionId: string) => {
    router.push(`/admin?tab=classes&session=${sessionId}`)
  }

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  const getAvailableStudents = () => {
    const enrolledIds = enrollments.map(e => e.student_id)
    return students.filter(s => !enrolledIds.includes(s.id))
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(to bottom, #000000 0%, #0a0a0a 100%)',
        py: { xs: 2, md: 4 }
      }}>
        <Container maxWidth="lg">
          <Box sx={{ color: 'white' }}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="h5" fontWeight="bold" sx={{ mb: 0.5 }}>
                    Classes Management
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#888' }}>
                    Create and manage dance classes
                  </Typography>
                </Box>
                <Button 
                  variant="contained" 
                  startIcon={<Add />} 
                  onClick={() => setCreateDialogOpen(true)}
                  sx={{ 
                    bgcolor: '#ff0055', 
                    fontWeight: 'bold',
                    '&:hover': { bgcolor: '#cc0044' } 
                  }}
                >
                  New Class
                </Button>
              </Box>
            </Box>

            {/* Classes List */}
            {classes.length === 0 ? (
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
                      Create your first class to get started
                    </Typography>
                    <Button 
                      variant="outlined" 
                      startIcon={<Add />}
                      onClick={() => setCreateDialogOpen(true)}
                      sx={{ 
                        color: '#ff0055', 
                        borderColor: '#ff0055',
                        '&:hover': { borderColor: '#cc0044', bgcolor: 'rgba(255,0,85,0.1)' }
                      }}
                    >
                      Create Class
                    </Button>
                  </CardContent>
                </Card>
              </Fade>
            ) : (
              <Grid container spacing={3}>
                {classes.map((cls, index) => (
                  <Grid item xs={12} md={6} key={cls.id}>
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
                                onClick={() => handleOpenEditDialog(cls)}
                                sx={{ 
                                  color: '#ff0055',
                                  '&:hover': { bgcolor: 'rgba(255,165,0,0.1)' }
                                }}
                              >
                                <Edit />
                              </IconButton>
                              <IconButton 
                                size="small"
                                onClick={() => handleOpenEnrollDialog(cls)}
                                sx={{ 
                                  color: '#00e5ff',
                                  '&:hover': { bgcolor: 'rgba(0,229,255,0.1)' }
                                }}
                              >
                                <PersonAdd />
                              </IconButton>
                              <IconButton 
                                size="small"
                                onClick={() => handleDeleteClass(cls.id)}
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
                              onClick={() => handleJoinClass(cls.session_id)}
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
                ))}
              </Grid>
            )}
          </Box>
        </Container>

        {/* Create Class Dialog */}
        <Dialog 
          open={createDialogOpen} 
          onClose={() => setCreateDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ 
            sx: { 
              bgcolor: '#1a1a1a', 
              color: 'white',
              borderRadius: 3,
              border: '1px solid rgba(255,255,255,0.1)'
            } 
          }}
        >
          <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)', pb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <School sx={{ color: '#ff0055' }} />
              <Typography variant="h6" fontWeight="bold">Create New Class</Typography>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 2 }}>
            <TextField
              autoFocus
              label="Class Title *"
              fullWidth
              placeholder="e.g., Advanced Hip Hop"
              value={newClass.title}
              onChange={(e) => setNewClass({ ...newClass, title: e.target.value })}
              sx={{ 
                '& .MuiInputBase-root': { color: 'white' },
                '& .MuiInputLabel-root': { color: '#aaa' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
                  '&.Mui-focused fieldset': { borderColor: '#ff0055' },
                },
                '& .MuiInputLabel-root.Mui-focused': { color: '#ff0055' }
              }}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              placeholder="Describe the class..."
              value={newClass.description}
              onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
              sx={{ 
                '& .MuiInputBase-root': { color: 'white' },
                '& .MuiInputLabel-root': { color: '#aaa' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
                  '&.Mui-focused fieldset': { borderColor: '#ff0055' },
                },
                '& .MuiInputLabel-root.Mui-focused': { color: '#ff0055' }
              }}
            />
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <TextField
                label="Session ID *"
                fullWidth
                placeholder="e.g., advanced-hiphop-01"
                value={newClass.session_id}
                onChange={(e) => setNewClass({ ...newClass, session_id: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                helperText="Unique identifier for live streaming"
                sx={{ 
                  '& .MuiInputBase-root': { color: 'white' },
                  '& .MuiInputLabel-root': { color: '#aaa' },
                  '& .MuiFormHelperText-root': { color: '#666' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
                    '&.Mui-focused fieldset': { borderColor: '#ff0055' },
                  },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#ff0055' }
                }}
              />
              <IconButton 
                onClick={() => setNewClass({ ...newClass, session_id: generateSessionId() })}
                sx={{ 
                  mt: 1,
                  color: '#00e5ff',
                  border: '1px solid rgba(0,229,255,0.3)',
                  bgcolor: 'rgba(0,229,255,0.1)',
                  '&:hover': { bgcolor: 'rgba(0,229,255,0.2)' }
                }}
              >
                <Autorenew />
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Price ($)"
                type="number"
                fullWidth
                value={newClass.price}
                onChange={(e) => setNewClass({ ...newClass, price: parseFloat(e.target.value) || 0 })}
                inputProps={{ min: 0, step: 0.01 }}
                sx={{ 
                  '& .MuiInputBase-root': { color: 'white' },
                  '& .MuiInputLabel-root': { color: '#aaa' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
                    '&.Mui-focused fieldset': { borderColor: '#ff0055' },
                  },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#ff0055' }
                }}
              />
              <TextField
                label="Max Students"
                type="number"
                fullWidth
                value={newClass.max_students}
                onChange={(e) => setNewClass({ ...newClass, max_students: parseInt(e.target.value) || 50 })}
                inputProps={{ min: 1 }}
                sx={{ 
                  '& .MuiInputBase-root': { color: 'white' },
                  '& .MuiInputLabel-root': { color: '#aaa' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
                    '&.Mui-focused fieldset': { borderColor: '#ff0055' },
                  },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#ff0055' }
                }}
              />
            </Box>
            <DateTimePicker
              label="Scheduled Date & Time"
              value={newClass.scheduled_at}
              onChange={(newValue) => newValue && setNewClass({ ...newClass, scheduled_at: newValue })}
              sx={{
                width: '100%',
                '& .MuiInputBase-root': { color: 'white' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.4)' },
                '& .Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#ff0055' },
                '& .MuiSvgIcon-root': { color: '#ff0055' },
                '& .MuiInputLabel-root': { color: '#aaa' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#ff0055' }
              }}
            />
            <TextField
              label="Duration (minutes)"
              type="number"
              fullWidth
              value={newClass.duration_minutes}
              onChange={(e) => setNewClass({ ...newClass, duration_minutes: parseInt(e.target.value) || 60 })}
              inputProps={{ min: 15, step: 15 }}
              sx={{ 
                '& .MuiInputBase-root': { color: 'white' },
                '& .MuiInputLabel-root': { color: '#aaa' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
                  '&.Mui-focused fieldset': { borderColor: '#ff0055' },
                },
                '& .MuiInputLabel-root.Mui-focused': { color: '#ff0055' }
              }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2.5, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <Button onClick={() => setCreateDialogOpen(false)} sx={{ color: '#888' }}>Cancel</Button>
            <Button 
              onClick={handleCreateClass} 
              variant="contained"
              sx={{ 
                bgcolor: '#ff0055',
                fontWeight: 'bold',
                '&:hover': { bgcolor: '#cc0044' }
              }}
            >
              Create Class
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Class Dialog */}
        <Dialog 
          open={editDialogOpen} 
          onClose={() => setEditDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ 
            sx: { 
              bgcolor: '#1a1a1a', 
              color: 'white',
              borderRadius: 3,
              border: '1px solid rgba(255,255,255,0.1)'
            } 
          }}
        >
          <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)', pb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Edit sx={{ color: '#ff0055' }} />
              <Typography variant="h6" fontWeight="bold">Edit Class</Typography>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 2 }}>
            <TextField
              autoFocus
              label="Class Title *"
              fullWidth
              placeholder="e.g., Advanced Hip Hop"
              value={editClass.title}
              onChange={(e) => setEditClass({ ...editClass, title: e.target.value })}
              sx={{ 
                '& .MuiInputBase-root': { color: 'white' },
                '& .MuiInputLabel-root': { color: '#aaa' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
                  '&.Mui-focused fieldset': { borderColor: '#ff0055' },
                },
                '& .MuiInputLabel-root.Mui-focused': { color: '#ff0055' }
              }}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              placeholder="Describe the class..."
              value={editClass.description}
              onChange={(e) => setEditClass({ ...editClass, description: e.target.value })}
              sx={{ 
                '& .MuiInputBase-root': { color: 'white' },
                '& .MuiInputLabel-root': { color: '#aaa' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
                  '&.Mui-focused fieldset': { borderColor: '#ff0055' },
                },
                '& .MuiInputLabel-root.Mui-focused': { color: '#ff0055' }
              }}
            />
            <TextField
              label="Session ID *"
              fullWidth
              placeholder="e.g., advanced-hiphop-01"
              value={editClass.session_id}
              InputProps={{ readOnly: true }} // Make Session ID read-only
              helperText="Unique identifier for live streaming (read-only)"
              sx={{ 
                '& .MuiInputBase-root': { color: 'white' },
                '& .MuiInputLabel-root': { color: '#aaa' },
                '& .MuiFormHelperText-root': { color: '#666' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
                  '&.Mui-focused fieldset': { borderColor: '#ff0055' },
                },
                '& .MuiInputLabel-root.Mui-focused': { color: '#ff0055' }
              }}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Price ($)"
                type="number"
                fullWidth
                value={editClass.price}
                onChange={(e) => setEditClass({ ...editClass, price: parseFloat(e.target.value) || 0 })}
                inputProps={{ min: 0, step: 0.01 }}
                sx={{ 
                  '& .MuiInputBase-root': { color: 'white' },
                  '& .MuiInputLabel-root': { color: '#aaa' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
                    '&.Mui-focused fieldset': { borderColor: '#ff0055' },
                  },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#ff0055' }
                }}
              />
              <TextField
                label="Max Students"
                type="number"
                fullWidth
                value={editClass.max_students}
                onChange={(e) => setEditClass({ ...editClass, max_students: parseInt(e.target.value) || 50 })}
                inputProps={{ min: 1 }}
                sx={{ 
                  '& .MuiInputBase-root': { color: 'white' },
                  '& .MuiInputLabel-root': { color: '#aaa' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
                    '&.Mui-focused fieldset': { borderColor: '#ff0055' },
                  },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#ff0055' }
                }}
              />
            </Box>
            <DateTimePicker
              label="Scheduled Date & Time"
              value={editClass.scheduled_at}
              onChange={(newValue) => newValue && setEditClass({ ...editClass, scheduled_at: newValue })}
              sx={{
                width: '100%',
                '& .MuiInputBase-root': { color: 'white' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.4)' },
                '& .Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#ff0055' },
                '& .MuiSvgIcon-root': { color: '#ff0055' },
                '& .MuiInputLabel-root': { color: '#aaa' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#ff0055' }
              }}
            />
            <TextField
              label="Duration (minutes)"
              type="number"
              fullWidth
              value={editClass.duration_minutes}
              onChange={(e) => setEditClass({ ...editClass, duration_minutes: parseInt(e.target.value) || 60 })}
              inputProps={{ min: 15, step: 15 }}
              sx={{ 
                '& .MuiInputBase-root': { color: 'white' },
                '& .MuiInputLabel-root': { color: '#aaa' },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' },
                  '&.Mui-focused fieldset': { borderColor: '#ff0055' },
                },
                '& .MuiInputLabel-root.Mui-focused': { color: '#ff0055' }
              }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2.5, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <Button onClick={() => setEditDialogOpen(false)} sx={{ color: '#888' }}>Cancel</Button>
            <Button 
              onClick={handleUpdateClass} 
              variant="contained"
              sx={{ 
                bgcolor: '#ff0055',
                fontWeight: 'bold',
              }}
            >
              Update Class
            </Button>
          </DialogActions>
        </Dialog>

        {/* Enroll Students Dialog */}
        <Dialog 
          open={enrollDialogOpen} 
          onClose={() => setEnrollDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{ 
            sx: { 
              bgcolor: '#1a1a1a', 
              color: 'white',
              borderRadius: 3,
              border: '1px solid rgba(255,255,255,0.1)'
            } 
          }}
        >
          <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)', pb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <People sx={{ color: '#00e5ff' }} />
              <Typography variant="h6" fontWeight="bold">Manage Students - {selectedClass?.title}</Typography>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            {/* Enrolled Students */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, color: '#00e5ff' }}>
                Enrolled Students ({enrollments.length})
              </Typography>
              {enrollments.length === 0 ? (
                <Typography variant="body2" sx={{ color: '#666', textAlign: 'center', py: 2 }}>
                  No students enrolled yet
                </Typography>
              ) : (
                <List sx={{ bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2, p: 1 }}>
                  {enrollments.map((enrollment) => (
                    <ListItem 
                      key={enrollment.id}
                      secondaryAction={
                        <IconButton 
                          edge="end" 
                          onClick={() => handleRemoveEnrollment(enrollment.id)}
                          sx={{ color: '#ff0055' }}
                        >
                          <Delete />
                        </IconButton>
                      }
                      sx={{ 
                        borderRadius: 1,
                        mb: 0.5,
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: '#ff0055' }}>
                          {enrollment.student?.full_name?.charAt(0) || 'S'}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={enrollment.student?.full_name || 'Unknown'}
                        secondary={enrollment.student?.email}
                        primaryTypographyProps={{ color: 'white' }}
                        secondaryTypographyProps={{ color: '#888' }}
                      />
                      {enrollment.has_paid && (
                        <CheckCircle sx={{ color: '#00e5ff', mr: 2 }} />
                      )}
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>

            {/* Available Students */}
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, color: '#ff0055' }}>
                Add Students
              </Typography>
              {getAvailableStudents().length === 0 ? (
                <Typography variant="body2" sx={{ color: '#666', textAlign: 'center', py: 2 }}>
                  All students are already enrolled
                </Typography>
              ) : (
                <List sx={{ bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2, p: 1, maxHeight: 300, overflow: 'auto' }}>
                  {getAvailableStudents().map((student) => (
                    <ListItem 
                      key={student.id}
                      onClick={() => toggleStudentSelection(student.id)}
                      sx={{ 
                        borderRadius: 1,
                        mb: 0.5,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
                      }}
                    >
                      <Checkbox 
                        checked={selectedStudents.includes(student.id)}
                        sx={{ 
                          color: '#666',
                          '&.Mui-checked': { color: '#ff0055' }
                        }}
                      />
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: '#00e5ff' }}>
                          {student.full_name?.charAt(0) || 'S'}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={student.full_name || 'Unknown'}
                        secondary={student.email}
                        primaryTypographyProps={{ color: 'white' }}
                        secondaryTypographyProps={{ color: '#888' }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2.5, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <Button onClick={() => setEnrollDialogOpen(false)} sx={{ color: '#888' }}>Close</Button>
            <Button 
              onClick={handleEnrollStudents} 
              variant="contained"
              disabled={selectedStudents.length === 0}
              sx={{ 
                bgcolor: '#00e5ff',
                color: 'black',
                fontWeight: 'bold',
                '&:hover': { bgcolor: '#00b2cc' },
                '&:disabled': { bgcolor: '#333', color: '#666' }
              }}
            >
              Enroll {selectedStudents.length > 0 ? `(${selectedStudents.length})` : ''}
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar 
          open={snackbar.open} 
          autoHideDuration={4000} 
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={() => setSnackbar({ ...snackbar, open: false })} 
            severity={snackbar.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  )
}
