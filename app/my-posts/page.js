'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default function MyPosts() {
  const router = useRouter()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)
  const [completing, setCompleting] = useState(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      fetchMyPosts(user.id)
    }
    init()
  }, [])

  const fetchMyPosts = async (userId) => {
    const { data } = await supabase
      .from('service_posts')
      .select(`*, applications (id, status, created_at, applicant_id, profiles (id, full_name, username, bio))`)
      .eq('poster_id', userId)
      .order('created_at', { ascending: false })

    setPosts(data || [])
    setLoading(false)
  }

  const handleApplication = async (applicationId, newStatus, postId) => {
    setUpdating(applicationId)
    await supabase.from('applications').update({ status: newStatus }).eq('id', applicationId)
    if (newStatus === 'approved') {
      await supabase.from('service_posts').update({ status: 'in_progress' }).eq('id', postId)
    }
    const { data: { user } } = await supabase.auth.getUser()
    fetchMyPosts(user.id)
    setUpdating(null)
  }

  const handleComplete = async (post) => {
    setCompleting(post.id)
    const approvedApp = post.applications.find(a => a.status === 'approved')
    if (!approvedApp) { alert('No approved applicant found.'); setCompleting(null); return }

    const { error } = await supabase.rpc('transfer_hours', {
      from_user: post.poster_id,
      to_user: approvedApp.applicant_id,
      amount: post.hours_required,
      post_id: post.id,
    })

    if (error) alert('Error completing service: ' + error.message)
    const { data: { user } } = await supabase.auth.getUser()
    fetchMyPosts(user.id)
    setCompleting(null)
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#94B7A2' }}>Loading...</p>
    </main>
  )

  const statusColor = (status) => {
    if (status === 'open') return { bg: '#EBF5F0', color: '#237371' }
    if (status === 'in_progress') return { bg: '#FEF9E7', color: '#D4A017' }
    return { bg: '#F5F5F3', color: '#94B7A2' }
  }

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
          <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>My Posts</h1>
          <p style={{ color: '#94B7A2' }}>Manage your service requests and review applicants.</p>
        </div>

        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 0' }}>
            <p style={{ color: '#94B7A2', fontSize: '1.125rem', marginBottom: '1rem' }}>You haven't posted any requests yet.</p>
            <Link href="/posts/new" style={{ backgroundColor: '#237371', color: '#FEFFFF', fontWeight: 700, padding: '0.875rem 2rem', borderRadius: '0.75rem', textDecoration: 'none' }}>
              Post Your First Request
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {posts.map(post => {
              const sc = statusColor(post.status)
              return (
                <div key={post.id} style={{ backgroundColor: '#FEFFFF', border: '1px solid #E0E0DC', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 2px 8px rgba(42,39,42,0.06)' }}>

                  <div style={{ padding: '1.5rem', borderBottom: '1px solid #E0E0DC' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#237371', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{post.category}</span>
                        <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem', marginBottom: '0.25rem' }}>{post.title}</h2>
                        <p style={{ color: '#94B7A2', fontSize: '0.875rem' }}>{post.description}</p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1.5rem' }}>
                        <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: '2.5rem', fontWeight: 700, color: '#237371', lineHeight: 1 }}>{post.hours_required}</p>
                        <p style={{ fontSize: '0.75rem', color: '#94B7A2' }}>hours</p>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '9999px', marginTop: '0.5rem', display: 'inline-block', backgroundColor: sc.bg, color: sc.color }}>
                          {post.status}
                        </span>
                      </div>
                    </div>

                    {post.status === 'in_progress' && (
                      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #E0E0DC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ color: '#94B7A2', fontSize: '0.875rem' }}>Service in progress — mark complete to transfer hours.</p>
                        <button
                          onClick={() => handleComplete(post)}
                          disabled={completing === post.id}
                          style={{ marginLeft: '1rem', padding: '0.6rem 1.25rem', backgroundColor: completing === post.id ? '#E0E0DC' : '#237371', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', border: 'none', cursor: completing === post.id ? 'not-allowed' : 'pointer', fontSize: '0.875rem', flexShrink: 0 }}
                        >
                          {completing === post.id ? 'Processing...' : '✓ Mark Complete'}
                        </button>
                      </div>
                    )}

                    {post.status === 'completed' && (
                      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #E0E0DC' }}>
                        <p style={{ color: '#237371', fontSize: '0.875rem', fontWeight: 600 }}>✓ Service completed — {post.hours_required} hours transferred</p>
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '1.5rem' }}>
                    <p style={{ fontSize: '0.7rem', color: '#94B7A2', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>
                      Applications ({post.applications?.length || 0})
                    </p>

                    {post.applications?.length === 0 ? (
                      <p style={{ color: '#94B7A2', fontSize: '0.875rem' }}>No applications yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {post.applications.map(app => (
                          <div key={app.id} style={{ backgroundColor: '#F5F5F3', borderRadius: '0.75rem', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #E0E0DC' }}>
                            <div>
                              <p style={{ fontWeight: 700, color: '#2A272A' }}>{app.profiles?.full_name || app.profiles?.username}</p>
                              {app.profiles?.bio && <p style={{ color: '#94B7A2', fontSize: '0.8rem', marginTop: '0.15rem' }}>{app.profiles.bio}</p>}
                              <p style={{ color: '#94B7A2', fontSize: '0.75rem', marginTop: '0.25rem' }}>Applied {new Date(app.created_at).toLocaleDateString()}</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0, marginLeft: '1rem' }}>
                              {app.status === 'pending' ? (
                                <>
                                  <button onClick={() => handleApplication(app.id, 'approved', post.id)} disabled={updating === app.id} style={{ padding: '0.5rem 1rem', backgroundColor: updating === app.id ? '#E0E0DC' : '#237371', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', border: 'none', cursor: updating === app.id ? 'not-allowed' : 'pointer', fontSize: '0.8rem' }}>
                                    Approve
                                  </button>
                                  <button onClick={() => handleApplication(app.id, 'declined', post.id)} disabled={updating === app.id} style={{ padding: '0.5rem 1rem', backgroundColor: '#F5F5F3', color: '#2A272A', fontWeight: 600, borderRadius: '0.5rem', border: '1px solid #E0E0DC', cursor: updating === app.id ? 'not-allowed' : 'pointer', fontSize: '0.8rem' }}>
                                    Decline
                                  </button>
                                </>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                  <span style={{ fontSize: '0.8rem', fontWeight: 600, padding: '0.3rem 0.75rem', borderRadius: '9999px', backgroundColor: app.status === 'approved' ? '#EBF5F0' : '#F5F5F3', color: app.status === 'approved' ? '#237371' : '#94B7A2' }}>
                                    {app.status}
                                  </span>
                                  {app.status === 'approved' && (
                                    <Link href={`/messages/${app.id}`} style={{ padding: '0.5rem 1rem', backgroundColor: '#237371', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.8rem' }}>
                                      Messages →
                                    </Link>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}