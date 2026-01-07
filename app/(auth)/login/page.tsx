'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, Card, CardContent, CardHeader, Spinner } from '@/components/ui'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const searchParams = useSearchParams()

  const supabase = createClient()

  // Check for error params (e.g., when redirected back after failed profile lookup)
  const errorParam = searchParams.get('error')
  const displayError = error || (errorParam === 'profile_not_found'
    ? 'Your account is not fully set up. Please contact your administrator.'
    : null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      // Map common errors to user-friendly messages
      if (authError.message === 'Invalid login credentials') {
        setError('Invalid email or password. Please try again.')
      } else {
        setError(authError.message)
      }
      setIsLoading(false)
      return
    }

    // Check if user profile exists in public.users table
    if (data.user) {
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id')
        .eq('id', data.user.id)
        .single()

      if (profileError || !profile) {
        setError('Your account is not fully set up. Please contact your administrator.')
        // Sign out since they can't use the app without a profile
        await supabase.auth.signOut()
        setIsLoading(false)
        return
      }
    }

    // Redirect to dashboard
    window.location.href = '/'
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      {displayError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {displayError}
        </div>
      )}
      <Input
        id="email"
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        required
      />
      <Input
        id="password"
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Your password"
        required
      />
      <Button type="submit" className="w-full" isLoading={isLoading}>
        Sign In
      </Button>
    </form>
  )
}

function LoginFormFallback() {
  return (
    <div className="flex items-center justify-center py-8">
      <Spinner />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <h1 className="text-2xl font-bold text-gray-900">Body Biz Admin</h1>
        <p className="text-sm text-gray-600">Sign in to your account</p>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<LoginFormFallback />}>
          <LoginForm />
        </Suspense>
      </CardContent>
    </Card>
  )
}
