'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default function MyApplications() {
  const router = useRouter()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('applications')
        .select(`*, service_posts (id, title, description, category, hours_required, status, profiles (full_name, username))`)
        .eq('applicant_id', user.id)
        .order('created_at', { ascending: false })

      setApplications(data || [])
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#94B7A2' }}>Loading...</p>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', color: '#2A272A' }}>

      <nav style={{ borderBottom: '1px solid #E0E0DC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2.5rem', backgroundColor: '#FEFFFF' }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <Image src="/acc-logo.png" alt="ACC Logo" width={40} height={40} />
          <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.2rem', fontWeight: 700, color: '#2A272A' }}>ACC Timebank</span>
        </Link>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Link href="/posts" style={{ color: '#94B7A2', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>Browse Posts</Link>
          <Link href="/dashboard" style={{ color: '#94B7A2', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>Dashboard</Link>
        </div>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem 1.5rem' }}>

        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>My Applications</h1>
          <p style={{ color: '#94B7A2' }}>Track the status of services you've offered to provide.</p>
        </div>

        {applications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 0' }}>
            <p style={{ color: '#94B7A2', fontSize: '1.125rem', marginBottom: '1rem' }}>You haven't applied to any requests yet.</p>
            <Link href="/posts" style={{ backgroundColor: '#237371', color: '#FEFFFF', fontWeight: 700, padding: '0.875rem 2rem', borderRadius: '0.75rem', textDecoration: 'none' }}>
              Browse Requests
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {applications.map(app => (
              <div key={app.id} style={{ backgroundColor: '#FEFFFF', border: '1px solid #E0E0DC', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 2px 8px rgba(42,39,42,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#237371', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{app.service_posts?.category}</span>
                    <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>{app.service_posts?.title}</h2>
                    <p style={{ color: '#94B7A2', fontSize: '0.875rem', marginTop: '0.15rem' }}>
                      Posted by {app.service_posts?.profiles?.full_name || app.service_posts?.profiles?.username}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1rem' }}>
                    <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: '2rem', fontWeight: 700, color: '#237371', lineHeight: 1 }}>{app.service_posts?.hours_required}</p>
                    <p style={{ fontSize: '0.75rem', color: '#94B7A2' }}>hours</p>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, padding: '0.3rem 0.75rem', borderRadius: '9999px', backgroundColor: app.status === 'approved' ? '#EBF5F0' : app.status === 'declined' ? '#fdf0ef' : '#F5F5F3', color: app.status === 'approved' ? '#237371' : app.status === 'declined' ? '#c0392b' : '#94B7A2' }}>
                    {app.status === 'pending' ? '⏳ Pending Review' : app.status === 'approved' ? '✓ Approved' : '✕ Declined'}
                  </span>
                  {app.status === 'approved' && (
                    <Link href={`/messages/${app.id}`} style={{ padding: '0.5rem 1.25rem', backgroundColor: '#237371', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.875rem' }}>
                      Open Messages →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}