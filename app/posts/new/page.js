'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

const CATEGORIES = [
  'Home & Garden', 'Tech Help', 'Transportation', 'Tutoring & Education',
  'Arts & Crafts', 'Cooking & Food', 'Health & Wellness',
  'Childcare & Eldercare', 'Administrative', 'Other',
]

export default function NewPost() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState({ title: '', description: '', category: '', hours_required: 1 })

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push('/login')
      else setUser(user)
    }
    getUser()
  }, [])

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: profile } = await supabase
      .from('profiles')
      .select('hour_balance')
      .eq('id', user.id)
      .single()

    if (profile.hour_balance - formData.hours_required < -5) {
      setError('This would exceed your debt limit. Your balance would go below -5 hours.')
      setLoading(false)
      return
    }

    const { error: postError } = await supabase
      .from('service_posts')
      .insert({ poster_id: user.id, title: formData.title, description: formData.description, category: formData.category, hours_required: parseInt(formData.hours_required) })

    if (postError) { setError(postError.message); setLoading(false); return }
    router.push('/posts')
  }

  const inputStyle = { width: '100%', backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#2A272A', outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { fontSize: '0.8rem', color: '#2A272A', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', color: '#2A272A' }}>

      <nav style={{ borderBottom: '1px solid #E0E0DC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2.5rem', backgroundColor: '#FEFFFF' }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <Image src="/acc-logo.png" alt="ACC Logo" width={40} height={40} />
          <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.2rem', fontWeight: 700, color: '#2A272A' }}>ACC Timebank</span>
        </Link>
        <Link href="/posts" style={{ color: '#94B7A2', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>Browse Posts</Link>
      </nav>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Post a Service Request</h1>
          <p style={{ color: '#94B7A2' }}>Describe what you need help with and how many hours you're offering.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          <div>
            <label style={labelStyle}>Title</label>
            <input name="title" type="text" required value={formData.title} onChange={handleChange} placeholder="e.g. Help moving furniture this Saturday" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Category</label>
            <select name="category" required value={formData.category} onChange={handleChange} style={inputStyle}>
              <option value="">Select a category</option>
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea name="description" required value={formData.description} onChange={handleChange} placeholder="Describe what you need in detail." rows={5} style={{ ...inputStyle, resize: 'none' }} />
          </div>

          <div>
            <label style={labelStyle}>Hours Offered</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <input name="hours_required" type="number" min="1" max="20" required value={formData.hours_required} onChange={handleChange} style={{ ...inputStyle, width: '80px' }} />
              <span style={{ color: '#94B7A2', fontSize: '0.875rem' }}>hours in exchange for this service</span>
            </div>
            <p style={{ color: '#94B7A2', fontSize: '0.75rem', marginTop: '0.5rem' }}>You can go up to -5 hours in debt.</p>
          </div>

          {error && (
            <p style={{ color: '#c0392b', fontSize: '0.875rem', backgroundColor: '#fdf0ef', border: '1px solid #f5c6c2', borderRadius: '0.5rem', padding: '0.75rem 1rem' }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="submit" disabled={loading} style={{ padding: '0.875rem 2rem', backgroundColor: loading ? '#E0E0DC' : '#237371', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', border: 'none', fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Posting...' : 'Post Request'}
            </button>
            <Link href="/posts" style={{ padding: '0.875rem 2rem', backgroundColor: '#F5F5F3', color: '#2A272A', fontWeight: 600, borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.875rem', display: 'flex', alignItems: 'center' }}>
              Cancel
            </Link>
          </div>

        </form>
      </div>
    </main>
  )
}