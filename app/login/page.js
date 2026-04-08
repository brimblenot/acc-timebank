'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', color: '#2A272A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>

      <Link href="/" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', marginBottom: '2rem' }}>
        <Image src="/acc-logo.png" alt="ACC Logo" width={70} height={70} />
        <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.3rem', fontWeight: 700, color: '#2A272A', marginTop: '0.5rem' }}>
          Alachua Community Collective
        </span>
        <span style={{ color: '#237371', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600 }}>
          A Mutual Aid Network
        </span>
      </Link>

      <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#FEFFFF', border: '1px solid #E0E0DC', borderRadius: '1rem', padding: '2.5rem', boxShadow: '0 4px 24px rgba(42,39,42,0.08)' }}>
        <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem', color: '#2A272A' }}>
          Welcome back
        </h1>
        <p style={{ color: '#94B7A2', fontSize: '0.875rem', marginBottom: '2rem' }}>
          Log in to your ACC Timebank account
        </p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          <div>
            <label style={{ fontSize: '0.8rem', color: '#2A272A', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@email.com"
              style={{ width: '100%', backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#2A272A', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: '#2A272A', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              style={{ width: '100%', backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#2A272A', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {error && (
            <p style={{ color: '#c0392b', fontSize: '0.875rem', backgroundColor: '#fdf0ef', border: '1px solid #f5c6c2', borderRadius: '0.5rem', padding: '0.75rem 1rem' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', backgroundColor: loading ? '#E0E0DC' : '#237371', color: '#FEFFFF', fontWeight: 700, padding: '0.875rem', borderRadius: '0.5rem', border: 'none', fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '0.5rem' }}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>

        </form>

        <p style={{ textAlign: 'center', color: '#94B7A2', fontSize: '0.875rem', marginTop: '1.5rem' }}>
          Don't have an account?{' '}
          <Link href="/signup" style={{ color: '#237371', fontWeight: 600, textDecoration: 'none' }}>
            Sign up free
          </Link>
        </p>
      </div>

    </main>
  )
}