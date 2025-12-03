export interface Class {
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

export interface Student {
  id: string
  full_name: string
  email: string
  avatar_url?: string
}

export interface Enrollment {
  id: string
  student_id: string
  has_paid: boolean
  student?: Student
}
