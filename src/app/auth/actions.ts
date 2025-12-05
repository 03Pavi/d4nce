'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  // Type-casting here for simplicity, but in a real app you should validate
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    if (error.message.includes('Email not confirmed')) {
      return { error: 'Please check your email to confirm your account.' }
    }
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const role = formData.get('role') as string

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: role || 'student',
        community_name: formData.get('communityName') as string,
        tags: formData.get('tags') ? JSON.parse(formData.get('tags') as string) : [],
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function signInWithGoogle(role?: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
      scopes: 'email profile',
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (data.url) {
    if (role) {
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      cookieStore.set('pending_role', role, {
        maxAge: 60 * 5,
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
      })
    }
    redirect(data.url)
  }

  return { error: 'Failed to initiate Google sign-in' }
}
