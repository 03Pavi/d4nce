import React from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, List, ListItem, ListItemText, ListItemAvatar, Avatar, IconButton, Checkbox, useTheme, useMediaQuery } from '@mui/material'
import { People, Delete, CheckCircle } from '@mui/icons-material'

interface EnrollStudentsDialogProps {
    open: boolean;
    onClose: () => void;
    onEnroll: () => void;
    selectedClass: any;
    enrollments: any[];
    availableStudents: any[];
    selectedStudents: string[];
    toggleStudentSelection: (studentId: string) => void;
    handleRemoveEnrollment: (enrollmentId: string) => void;
}

export const EnrollStudentsDialog = ({ 
    open, 
    onClose, 
    onEnroll, 
    selectedClass, 
    enrollments, 
    availableStudents, 
    selectedStudents, 
    toggleStudentSelection, 
    handleRemoveEnrollment 
}: EnrollStudentsDialogProps) => {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    return (
        <Dialog 
          open={open} 
          onClose={onClose}
          maxWidth="md"
          fullWidth
          fullScreen={fullScreen}
          PaperProps={{ 
            sx: { 
              bgcolor: '#1a1a1a', 
              color: 'white',
              borderRadius: fullScreen ? 0 : 3,
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
              {availableStudents.length === 0 ? (
                <Typography variant="body2" sx={{ color: '#666', textAlign: 'center', py: 2 }}>
                  All students are already enrolled
                </Typography>
              ) : (
                <List sx={{ bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2, p: 1, maxHeight: 300, overflow: 'auto' }}>
                  {availableStudents.map((student) => (
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
            <Button onClick={onClose} sx={{ color: '#888' }}>Close</Button>
            <Button 
              onClick={onEnroll} 
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
    )
}
