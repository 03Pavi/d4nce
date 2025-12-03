import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
    getAvailableStudents
  }
}
