'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default function PostDetail() {
  const router = useRouter()
  const { id } = useParams()
  const [post, setPost] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  const [error, setError] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUser(user)

      const { data: postData } = await supabase
        .from('service_posts')
        .select(`*, profiles (username, full_name, bio)`)
        .eq('id', id)
        .single()

      setPost(postData)

      const { data: existing } = await supabase
        .from('applications')
        .select('id')
        .eq('post_id', id)
        .eq('applicant_id', user.id)
        .single()

      if (existing) setApplied(true)
      setLoading(false)
    }
    init()
  }, [id])

  const handleApply = async () => {
    setApplying(true)
    setError(null)
    const { error } = await supabase
      .from('applications')
      .insert({ post_id: id, applicant_id: currentUser.id })
    if (error) setError(error.message)
    else setApplied(true)
    setApplying(false)
  }

  const handleDelete = async () => {
    setDeleting(true)

    // Get all application ids for this post
    const { data: apps } = await supabase
      .from('applications')
      .select('id')
      .eq('post_id', id)

    // Delete messages first
    if (apps?.length > 0) {
      await supabase
        .from('messages')
        .delete()
        .in('application_id', apps.map(a => a.id))
    }

    // Delete applications
    await supabase.from('applications').delete().eq('post_id', id)

    // Delete post
    await supabase.from('service_posts').delete().eq('id', id)

    router.push('/posts')
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#94B7A2' }}>Loading...</p>
    </main>
  )

  if (!post) return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#94B7A2' }}>Post not found.</p>
    </main>
  )

  const isOwner = currentUser?.id === post.poster_id
  const isDeletable = isOwner && post.status === 'open'

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', color: '#2A272A' }}>

      <nav style={{ borderBottom: '1px solid #E0E0DC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2.5rem', backgroundColor: '#FEFFFF' }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <Image src="/acc-logo.png" alt="ACC Logo" width={40} height={40} />
          <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.2rem', fontWeight: 700, color: '#2A272A' }}>ACC Timebank</span>
        </Link>
        <Link href="/posts" style={{ color: '#94B7A2', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>← Back to Posts</Link>
      </nav>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '3rem 1.5rem' }}>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.7rem', color: '#237371', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', backgroundColor: '#EBF5F0', padding: '0.25rem 0.75rem', borderRadius: '9999px' }}>{post.category}</span>
          <span style={{ fontSize: '0.7rem', color: '#94B7A2', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', backgroundColor: '#F5F5F3', padding: '0.25rem 0.75rem', borderRadius: '9999px' }}>{post.status}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.1, flex: 1 }}>{post.title}</h1>
          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1.5rem' }}>
            <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: '3.5rem', fontWeight: 700, color: '#237371', lineHeight: 1 }}>{post.hours_required}</p>
            <p style={{ color: '#94B7A2', fontSize: '0.875rem' }}>hours</p>
          </div>
        </div>

        <div style={{ backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.7rem', color: '#94B7A2', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Description</p>
          <p style={{ lineHeight: 1.7, color: '#2A272A' }}>{post.description}</p>
        </div>

        <div style={{ backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC', borderRadius: '1rem', padding: '1.5rem', marginBottom: '2rem' }}>
          <p style={{ fontSize: '0.7rem', color: '#94B7A2', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Posted By</p>
          <Link href={`/profile/${post.poster_id}`} style={{ fontWeight: 700, color: '#237371', textDecoration: 'none' }}>
            {post.profiles?.full_name || post.profiles?.username}
          </Link>
          {post.profiles?.bio && <p style={{ color: '#94B7A2', fontSize: '0.875rem', marginTop: '0.25rem' }}>{post.profiles.bio}</p>}
          <p style={{ color: '#94B7A2', fontSize: '0.75rem', marginTop: '0.5rem' }}>
            {new Date(post.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Action area */}
        {isOwner ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC', borderRadius: '1rem', padding: '1.5rem', textAlign: 'center' }}>
              <p style={{ color: '#94B7A2', fontSize: '0.875rem' }}>This is your post. You'll be notified when someone applies.</p>
            </div>

            {isDeletable && (
              <div style={{ textAlign: 'right' }}>
                {deleteConfirm ? (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', backgroundColor: '#fdf0ef', border: '1px solid #f5c6c2', borderRadius: '0.75rem', padding: '1rem' }}>
                    <p style={{ color: '#c0392b', fontSize: '0.875rem', fontWeight: 600 }}>Are you sure? This cannot be undone.</p>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      style={{ padding: '0.5rem 1.25rem', backgroundColor: '#c0392b', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', border: 'none', cursor: deleting ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}
                    >
                      {deleting ? 'Deleting...' : 'Yes, Delete'}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      style={{ padding: '0.5rem 1.25rem', backgroundColor: '#F5F5F3', color: '#2A272A', fontWeight: 600, borderRadius: '0.5rem', border: '1px solid #E0E0DC', cursor: 'pointer', fontSize: '0.875rem' }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    style={{ padding: '0.6rem 1.5rem', backgroundColor: 'transparent', color: '#c0392b', fontWeight: 600, borderRadius: '0.5rem', border: '1px solid #f5c6c2', cursor: 'pointer', fontSize: '0.875rem' }}
                  >
                    Delete Post
                  </button>
                )}
              </div>
            )}
          </div>
        ) : applied ? (
          <div style={{ backgroundColor: '#EBF5F0', border: '1px solid #94B7A2', borderRadius: '1rem', padding: '1.5rem', textAlign: 'center' }}>
            <p style={{ color: '#237371', fontWeight: 700 }}>✓ You've applied to this request</p>
            <p style={{ color: '#94B7A2', fontSize: '0.875rem', marginTop: '0.25rem' }}>The requester will review your application.</p>
          </div>
        ) : (
          <div style={{ backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC', borderRadius: '1rem', padding: '1.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Offer to Help</h2>
            <p style={{ color: '#94B7A2', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Apply to fulfill this request. Your contact info stays private until the requester approves you.
            </p>
            {error && (
              <p style={{ color: '#c0392b', fontSize: '0.875rem', backgroundColor: '#fdf0ef', border: '1px solid #f5c6c2', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem' }}>{error}</p>
            )}
            <button
              onClick={handleApply}
              disabled={applying}
              style={{ width: '100%', backgroundColor: applying ? '#E0E0DC' : '#237371', color: '#FEFFFF', fontWeight: 700, padding: '0.875rem', borderRadius: '0.5rem', border: 'none', fontSize: '0.95rem', cursor: applying ? 'not-allowed' : 'pointer' }}
            >
              {applying ? 'Applying...' : `Apply to Help — Earn ${post.hours_required} Hours`}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}