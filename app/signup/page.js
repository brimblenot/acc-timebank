'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function Signup() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
  })
  const [selectedSkills, setSelectedSkills] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const SKILLS = [
    'Cooking & Meals', 'Transportation', 'Home Repair', 'Gardening & Yard Work',
    'Tech Help', 'Childcare', 'Pet Care', 'Tutoring & Education',
    'Errands & Shopping', 'Translation', 'Healthcare Support',
    'Music & Arts', 'Sewing & Crafts', 'Emotional Support', 'Other',
  ]

  const toggleSkill = (skill) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    )
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user }, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          username: formData.username,
          full_name: formData.fullName,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (user && selectedSkills.length > 0) {
      setTimeout(async () => {
        await supabase.from('profiles').update({ skills: selectedSkills }).eq('id', user.id)
      }, 600)
    }

    router.push('/dashboard')
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
          Create your account
        </h1>
        <p style={{ color: '#94B7A2', fontSize: '0.875rem', marginBottom: '2rem' }}>
          Join the Alachua community exchange
        </p>

        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          <div>
            <label style={{ fontSize: '0.8rem', color: '#2A272A', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Full Name</label>
            <input
              name="fullName"
              type="text"
              required
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Jane Smith"
              style={{ width: '100%', backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#2A272A', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: '#2A272A', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Username</label>
            <input
              name="username"
              type="text"
              required
              value={formData.username}
              onChange={handleChange}
              placeholder="janesmith"
              style={{ width: '100%', backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#2A272A', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: '#2A272A', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Email</label>
            <input
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="jane@email.com"
              style={{ width: '100%', backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#2A272A', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: '#2A272A', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Password</label>
            <input
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="Min. 6 characters"
              style={{ width: '100%', backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#2A272A', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Skills */}
          <div>
            <label style={{ fontSize: '0.8rem', color: '#2A272A', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
              Skills I can offer <span style={{ color: '#94B7A2', fontWeight: 400 }}>(optional)</span>
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {SKILLS.map(skill => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: selectedSkills.includes(skill) ? '#237371' : '#F5F5F3',
                    color: selectedSkills.includes(skill) ? '#FEFFFF' : '#2A272A',
                  }}
                >
                  {skill}
                </button>
              ))}
            </div>
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
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

        </form>

        <p style={{ textAlign: 'center', color: '#94B7A2', fontSize: '0.875rem', marginTop: '1.5rem' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#237371', fontWeight: 600, textDecoration: 'none' }}>
            Log in
          </Link>
        </p>
      </div>

    </main>
  )
}