import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import { Class, Student, Enrollment } from './types'

export const useClassesManagement = () => {
  const router = useRouter()
  const [classes, setClasses] = useState<Class[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false)
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' })

  const generateSessionId = () => {
    return Math.random().toString(36).substring(2, 10) + '-' + Math.random().toString(36).substring(2, 6);
  }

  const [newClass, setNewClass] = useState<{
    title: string;
    description: string;
    session_id: string;
    price: number | string;
    max_students: number | string;
    scheduled_at: dayjs.Dayjs;
    duration_minutes: number | string;
  }>({
    title: '',
    description: '',
    session_id: generateSessionId(),
    price: 0,
    max_students: 50,
    scheduled_at: dayjs().add(1, 'day'),
    duration_minutes: 60
  })

  const [editClass, setEditClass] = useState<{
    id: string;
    title: string;
    description: string;
    session_id: string;
    price: number | string;
    max_students: number | string;
    scheduled_at: dayjs.Dayjs;
    duration_minutes: number | string;
  }>({
    id: '',
    title: '',
    description: '',
    session_id: '',
    price: 0,
    max_students: 50,
    scheduled_at: dayjs(),
    duration_minutes: 60
  })

  useEffect(() => {
    fetchClasses()
    fetchStudents()
  }, [])

  const fetchClasses = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/classes')
      if (!response.ok) throw new Error('Failed to fetch classes')
      const data = await response.json()
      setClasses(data || [])
    } catch (error) {
      console.error('Error fetching classes:', error)
    } finally {
      setIsLoading(false);
    }
  }

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/students')
      if (!response.ok) throw new Error('Failed to fetch students')
      const data = await response.json()
      setStudents(data || [])
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setIsLoading(false);
    }
  }

  const fetchEnrollments = async (classId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/classes/${classId}/enrollments`)
      if (!response.ok) throw new Error('Failed to fetch enrollments')
      const data = await response.json()
      setEnrollments(data || [])
    } catch (error) {
      console.error('Error fetching enrollments:', error)
    } finally {
      setIsLoading(false);
    }
  }

  const handleCreateClass = async () => {
    if (!newClass.title.trim()) {
      setSnackbar({ open: true, message: 'Please fill in all required fields', severity: 'error' })
      return
    }

    if (newClass.price === '' || newClass.max_students === '' || newClass.duration_minutes === '') {
      setSnackbar({ open: true, message: 'Price, Max Students, and Duration cannot be empty', severity: 'error' })
      return
    }

    try {
      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newClass.title,
          description: newClass.description,
          session_id: newClass.session_id,
          price: Number(newClass.price),
          max_students: Number(newClass.max_students),
          scheduled_at: newClass.scheduled_at.toISOString(),
          duration_minutes: Number(newClass.duration_minutes)
        })
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to create class')

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
    } catch (error: any) {
      setSnackbar({ open: true, message: 'Error creating class: ' + error.message, severity: 'error' })
    }
  }

  const handleDeleteClass = async (classId: string) => {
    // Confirmation handled by UI component

    try {
      const response = await fetch(`/api/classes/${classId}`, {
        method: 'DELETE'
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to delete class')

      setSnackbar({ open: true, message: 'Class deleted successfully', severity: 'success' })
      fetchClasses()
    } catch (error: any) {
      setSnackbar({ open: true, message: 'Error deleting class', severity: 'error' })
    }
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

    try {
      const response = await fetch(`/api/classes/${selectedClass.id}/enrollments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enrollmentData)
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to enroll students')

      setSnackbar({ open: true, message: `${selectedStudents.length} student(s) enrolled successfully!`, severity: 'success' })
      setSelectedStudents([])
      if (selectedClass) {
        await fetchEnrollments(selectedClass.id)
      }
      fetchClasses()
    } catch (error: any) {
      setSnackbar({ open: true, message: 'Error enrolling students: ' + error.message, severity: 'error' })
    }
  }

  const handleRemoveEnrollment = async (enrollmentId: string) => {
    if (!confirm('Are you sure you want to remove this student from the class?')) return

    try {
      const response = await fetch(`/api/enrollments/${enrollmentId}`, {
        method: 'DELETE'
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to remove enrollment')

      setSnackbar({ open: true, message: 'Student removed from class', severity: 'success' })
      if (selectedClass) {
        await fetchEnrollments(selectedClass.id)
      }
      fetchClasses()
    } catch (error: any) {
      setSnackbar({ open: true, message: 'Error removing enrollment', severity: 'error' })
    }
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

    if (editClass.price === '' || editClass.max_students === '' || editClass.duration_minutes === '') {
      setSnackbar({ open: true, message: 'Price, Max Students, and Duration cannot be empty', severity: 'error' })
      return
    }

    try {
      const response = await fetch(`/api/classes/${editClass.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editClass.title,
          description: editClass.description,
          session_id: editClass.session_id,
          price: Number(editClass.price),
          max_students: Number(editClass.max_students),
          scheduled_at: editClass.scheduled_at.toISOString(),
          duration_minutes: Number(editClass.duration_minutes)
        })
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to update class')

      setSnackbar({ open: true, message: 'Class updated successfully!', severity: 'success' })
      setEditDialogOpen(false)
      fetchClasses()
    } catch (error: any) {
      setSnackbar({ open: true, message: 'Error updating class: ' + error.message, severity: 'error' })
    }
  }

  const handleJoinClass = (sessionId: string) => {
    router.push(`/admin?tab=live&session=${sessionId}`)
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

  return {
    classes,
    students,
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
    getAvailableStudents,
    fetchClasses,
    isLoading
  }
}
