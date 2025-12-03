'use client'
import React from 'react'
import { 
  Box, 
  Typography, 
  Button, 
  Card,
  CardContent,
  Snackbar,
  Alert,
  Container,
  Fade,
  Grid
} from '@mui/material'
import { 
  Add, 
  School
} from '@mui/icons-material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { CreateClassDialog } from './create-class-dialog'
import { EditClassDialog } from './edit-class-dialog'
import { EnrollStudentsDialog } from './enroll-students-dialog'
import { useClassesManagement } from './use-classes-management'
import { ClassCard } from './class-card'

export const ClassesManagement = () => {
  const {
    classes,
    createDialogOpen,
    setCreateDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    enrollDialogOpen,
    setEnrollDialogOpen,
    selectedClass,
    selectedStudents,
    enrollments,
    snackbar,
    setSnackbar,
    newClass,
    setNewClass,
    editClass,
    setEditClass,
    generateSessionId,
    handleCreateClass,
    handleDeleteClass,
    handleOpenEnrollDialog,
    handleEnrollStudents,
    handleRemoveEnrollment,
    handleOpenEditDialog,
    handleUpdateClass,
    handleJoinClass,
    toggleStudentSelection,
    getAvailableStudents
  } = useClassesManagement()

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
                    '&:hover': { bgcolor: '#cc0044' },
                    minWidth: { xs: '40px', sm: 'auto' },
                    px: { xs: 1, sm: 2 },
                    '& .MuiButton-startIcon': {
                        margin: { xs: 0, sm: '0 8px 0 -4px' }
                    }
                  }}
                >
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'block' } }}>New Class</Box>
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
                  <ClassCard
                    key={cls.id}
                    cls={cls}
                    index={index}
                    onEdit={handleOpenEditDialog}
                    onEnroll={handleOpenEnrollDialog}
                    onDelete={handleDeleteClass}
                    onJoin={handleJoinClass}
                  />
                ))}
              </Grid>
            )}
          </Box>
        </Container>

        <CreateClassDialog
            open={createDialogOpen}
            onClose={() => setCreateDialogOpen(false)}
            onCreate={handleCreateClass}
            newClass={newClass}
            setNewClass={setNewClass}
            generateSessionId={generateSessionId}
        />

        <EditClassDialog
            open={editDialogOpen}
            onClose={() => setEditDialogOpen(false)}
            onUpdate={handleUpdateClass}
            editClass={editClass}
            setEditClass={setEditClass}
        />

        <EnrollStudentsDialog
            open={enrollDialogOpen}
            onClose={() => setEnrollDialogOpen(false)}
            onEnroll={handleEnrollStudents}
            selectedClass={selectedClass}
            enrollments={enrollments}
            availableStudents={getAvailableStudents()}
            selectedStudents={selectedStudents}
            toggleStudentSelection={toggleStudentSelection}
            handleRemoveEnrollment={handleRemoveEnrollment}
        />

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
