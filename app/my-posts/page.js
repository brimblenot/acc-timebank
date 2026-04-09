'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import ReviewModal from '../components/ReviewModal'

export default function MyPosts() {
  const router = useRouter()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)
  const [completing, setCompleting] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [reviewModal, setReviewModal] = useState(null)
  const [submittingReview, setSubmittingReview] = useState(false)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [completedAppId, setCompletedAppId] = useState(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)
      await fetchMyPosts(user.id)

      const channel = supabase
        .channel('my-posts-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => fetchMyPosts(user.id))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'service_posts' }, () => fetchMyPosts(user.id))
        .subscribe()

      return () => supabase.removeChannel(channel)
    }
    init()
  }, [])

  const fetchMyPosts = async (userId) => {
    const uid = userId || currentUserId
    if (!uid) return
    const { data } = await supabase
      .from('service_posts')
      .select(`*, applications (id, status, created_at, applicant_id, profiles (id, full_name, username, bio))`)
      .eq('poster_id', uid)
      .order('created_at', { ascending: false })
    setPosts(data || [])
    setLoading(false)
  }

  const handleApprove = async (applicationId, postId) => {
    setUpdating(applicationId)

    const { error: e1 } = await supabase
      .from('applications')
      .update({ status: 'approved' })
      .eq('id', applicationId)

    if (e1) { console.error('Approve error:', e1); setUpdating(null); return }

    const { data: others } = await supabase
      .from('applications')
      .select('id')
      .eq('post_id', postId)
      .eq('status', 'pending')

    for (const app of others || []) {
      await supabase.from('applications').update({ status: 'declined' }).eq('id', app.id)
    }

    await supabase.from('service_posts').update({ status: 'in_progress' }).eq('id', postId)
    await fetchMyPosts(currentUserId)
    setUpdating(null)
  }

  const handleDecline = async (applicationId) => {
    setUpdating(applicationId)
    await supabase.from('applications').update({ status: 'declined' }).eq('id', applicationId)
    await fetchMyPosts(currentUserId)
    setUpdating(null)
  }

  const handleDelete = async (post) => {
    setDeleting(post.id)

    const { data: apps } = await supabase
      .from('applications')
      .select('id')
      .eq('post_id', post.id)

    if (apps?.length > 0) {
      await supabase.from('messages').delete().in('application_id', apps.map(a => a.id))
    }

    await supabase.from('applications').delete().eq('post_id', post.id)
    await supabase.from('service_posts').delete().eq('id', post.id)

    setDeleteConfirm(null)
    setDeleting(null)
    await fetchMyPosts(currentUserId)
  }

  const handleComplete = async (post) => {
    setCompleting(post.id)

    let approvedApp = post.applications.find(a => a.status === 'approved')

    if (!approvedApp) {
      const pendingApp = post.applications.find(a => a.status === 'pending')
      if (!pendingApp) { alert('No applicant found.'); setCompleting(null); return }
      await supabase.from('applications').update({ status: 'approved' }).eq('id', pendingApp.id)
      approvedApp = pendingApp
    }

    const { error } = await supabase.rpc('transfer_hours', {
      from_user: post.poster_id,
      to_user: approvedApp.applicant_id,
      amount: post.hours_required,
      post_id: post.id,
    })

    if (error) { alert('Error: ' + error.message); setCompleting(null); return }

    setCompletedAppId(approvedApp.id)
    await fetchMyPosts(currentUserId)
    setCompleting(null)

    setReviewModal({
      postId: post.id,
      applicationId: approvedApp.id,
      revieweeId: approvedApp.applicant_id,
      revieweeName: approvedApp.profiles?.full_name || approvedApp.profiles?.username
    })
  }

  const submitReview = async (rating, comment) => {
    if (!reviewModal) return
    setSubmittingReview(true)
    await supabase.from('reviews').insert({
      post_id: reviewModal.postId,
      reviewer_id: currentUserId,
      reviewee_id: reviewModal.revieweeId,
      rating,
      comment: comment || null,
    })
    setReviewModal(null)
    setSubmittingReview(false)
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#94B7A2' }}>Loading...</p>
    </main>
  )

  const statusColor = (status) => {
    if (status === 'open') return { bg: '#EBF5F0', color: '#237371', label: 'Open' }
    if (status === 'in_progress') return { bg: '#FEF9E7', color: '#D4A017', label: 'In Progress' }
    return { bg: '#F5F5F3', color: '#94B7A2', label: 'Completed' }
  }

  const openPosts = posts.filter(p => p.status === 'open')
  const inProgressPosts = posts.filter(p => p.status === 'in_progress')
  const completedPosts = posts.filter(p => p.status === 'completed')

  const renderPostCard = (post) => {
    const sc = statusColor(post.status)
    const approvedApp = post.applications?.find(a => a.status === 'approved')
    const visibleApps = post.applications?.filter(a => a.status !== 'declined') || []
    const isCompleted = post.status === 'completed'
    const isDeletable = post.status === 'open'
    const pendingCount = post.applications?.filter(a => a.status === 'pending').length || 0

    return (
      <div
        key={post.id}
        style={{
          backgroundColor: isCompleted ? '#FAFAFA' : '#FEFFFF',
          border: '1px solid #E0E0DC',
          borderRadius: '1rem',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(42,39,42,0.06)',
          opacity: isCompleted ? 0.8 : 1,
        }}
      >
        {/* Post Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #E0E0DC' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#237371', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {post.category}
                </span>
                {isCompleted && (
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '9999px', backgroundColor: '#F5F5F3', color: '#94B7A2', border: '1px solid #E0E0DC' }}>
                    Archived
                  </span>
                )}
                {!isCompleted && pendingCount > 0 && (
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '9999px', backgroundColor: '#FEF9E7', color: '#D4A017', border: '1px solid #D4A017' }}>
                    {pendingCount} pending
                  </span>
                )}
              </div>
              <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem', color: isCompleted ? '#94B7A2' : '#2A272A' }}>
                {post.title}
              </h2>
              <p style={{ color: '#94B7A2', fontSize: '0.875rem' }}>{post.description}</p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1.5rem' }}>
              <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: '2.5rem', fontWeight: 700, color: isCompleted ? '#94B7A2' : '#237371', lineHeight: 1 }}>
                {post.hours_required}<span style={{ fontSize: '1rem', fontWeight: 600, marginLeft: '0.2rem' }}>hrs</span>
              </p>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '9999px', marginTop: '0.5rem', display: 'inline-block', backgroundColor: sc.bg, color: sc.color }}>
                {sc.label}
              </span>
            </div>
          </div>

          {/* In Progress Banner */}
          {post.status === 'in_progress' && approvedApp && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #E0E0DC' }}>
              <div style={{ backgroundColor: '#EBF5F0', border: '1px solid #94B7A2', borderRadius: '0.75rem', padding: '1rem' }}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <p style={{ color: '#237371', fontWeight: 700, fontSize: '0.875rem' }}>
                    Working with {approvedApp.profiles?.full_name || approvedApp.profiles?.username}
                  </p>
                  <p style={{ color: '#94B7A2', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                    Mark complete when the service is done to transfer hours.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <Link
                    href={`/messages/${approvedApp.id}`}
                    style={{ flex: 1, padding: '0.7rem 1rem', backgroundColor: '#237371', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.875rem', textAlign: 'center' }}
                  >
                    💬 Message {approvedApp.profiles?.full_name || approvedApp.profiles?.username}
                  </Link>
                  <button
                    onClick={() => handleComplete(post)}
                    disabled={completing === post.id}
                    style={{ flex: 1, padding: '0.7rem 1rem', backgroundColor: completing === post.id ? '#E0E0DC' : '#2A272A', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', border: 'none', cursor: completing === post.id ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}
                  >
                    {completing === post.id ? 'Processing...' : '✓ Mark Complete'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Completed Banner */}
          {post.status === 'completed' && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #E0E0DC' }}>
              <div style={{ backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC', borderRadius: '0.75rem', padding: '1rem' }}>
                <p style={{ color: '#237371', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  ✓ Completed — {post.hours_required} hours transferred
                  {approvedApp && ` to ${approvedApp.profiles?.full_name || approvedApp.profiles?.username}`}
                </p>
                <p style={{ color: '#94B7A2', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
                  Completed on {new Date(post.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                {(approvedApp || completedAppId) && (
                  <Link
                    href={`/messages/${approvedApp?.id || completedAppId}`}
                    style={{ display: 'inline-block', padding: '0.5rem 1.25rem', backgroundColor: '#237371', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.875rem' }}
                  >
                    💬 Messages
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Applications — only show on open posts */}
        {post.status === 'open' && (
          <div style={{ padding: '1.5rem' }}>
            <p style={{ fontSize: '0.7rem', color: '#94B7A2', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>
              Applications ({visibleApps.length})
            </p>

            {visibleApps.length === 0 ? (
              <p style={{ color: '#94B7A2', fontSize: '0.875rem' }}>No applications yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {visibleApps.map(app => (
                  <div
                    key={app.id}
                    style={{
                      backgroundColor: app.status === 'approved' ? '#EBF5F0' : '#F5F5F3',
                      borderRadius: '0.75rem',
                      padding: '1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      border: app.status === 'approved' ? '1px solid #94B7A2' : '1px solid #E0E0DC'
                    }}
                  >
                    <div>
                      <Link href={`/profile/${app.profiles?.id}`} style={{ fontWeight: 700, color: '#237371', textDecoration: 'none', fontSize: '0.9rem' }}>
                        {app.profiles?.full_name || app.profiles?.username}
                      </Link>
                      {app.profiles?.bio && <p style={{ color: '#94B7A2', fontSize: '0.8rem', marginTop: '0.15rem' }}>{app.profiles.bio}</p>}
                      <p style={{ color: '#94B7A2', fontSize: '0.75rem', marginTop: '0.25rem' }}>Applied {new Date(app.created_at).toLocaleDateString()}</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0, marginLeft: '1rem' }}>
                      {app.status === 'pending' && post.status === 'open' && (
                        <>
                          <button
                            onClick={() => handleApprove(app.id, post.id)}
                            disabled={updating === app.id}
                            style={{ padding: '0.5rem 1rem', backgroundColor: updating === app.id ? '#E0E0DC' : '#237371', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', border: 'none', cursor: updating === app.id ? 'not-allowed' : 'pointer', fontSize: '0.8rem' }}
                          >
                            {updating === app.id ? 'Approving...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleDecline(app.id)}
                            disabled={updating === app.id}
                            style={{ padding: '0.5rem 1rem', backgroundColor: '#F5F5F3', color: '#2A272A', fontWeight: 600, borderRadius: '0.5rem', border: '1px solid #E0E0DC', cursor: updating === app.id ? 'not-allowed' : 'pointer', fontSize: '0.8rem' }}
                          >
                            Decline
                          </button>
                        </>
                      )}

                      {app.status === 'approved' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, padding: '0.3rem 0.75rem', borderRadius: '9999px', backgroundColor: '#EBF5F0', color: '#237371' }}>
                            ✓ Approved
                          </span>
                          <Link
                            href={`/messages/${app.id}`}
                            style={{ padding: '0.5rem 1rem', backgroundColor: '#237371', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.8rem' }}
                          >
                            💬 Messages
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Delete — secondary destructive, bottom of card */}
        {isDeletable && (
          <div style={{ padding: '0 1.5rem 1.25rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            {deleteConfirm === post.id ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <p style={{ color: '#94B7A2', fontSize: '0.75rem' }}>Are you sure?</p>
                <button onClick={() => handleDelete(post)} disabled={deleting === post.id} style={{ padding: '0.3rem 0.75rem', backgroundColor: '#c0392b', color: '#FEFFFF', fontWeight: 600, borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>
                  {deleting === post.id ? 'Deleting...' : 'Yes, Delete'}
                </button>
                <button onClick={() => setDeleteConfirm(null)} style={{ padding: '0.3rem 0.75rem', backgroundColor: '#F5F5F3', color: '#94B7A2', fontWeight: 600, borderRadius: '0.5rem', border: '1px solid #E0E0DC', cursor: 'pointer', fontSize: '0.75rem' }}>Cancel</button>
              </div>
            ) : (
              <button onClick={() => setDeleteConfirm(post.id)} style={{ padding: '0.3rem 0.75rem', backgroundColor: 'transparent', color: '#94B7A2', fontWeight: 500, borderRadius: '0.5rem', border: '1px solid #E0E0DC', cursor: 'pointer', fontSize: '0.75rem' }}>
                Delete Post
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', color: '#2A272A' }}>

      <nav style={{ borderBottom: '1px solid #E0E0DC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2.5rem', backgroundColor: '#FEFFFF' }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <Image src="/acc-logo.png" alt="ACC Logo" width={40} height={40} />
          <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.2rem', fontWeight: 700, color: '#2A272A' }}>ACC Timebank</span>
        </Link>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Link href="/posts" style={{ color: '#94B7A2', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>Browse</Link>
          <Link href="/my-posts" style={{ color: '#2A272A', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 700 }}>My Posts</Link>
          <Link href="/my-applications" style={{ color: '#94B7A2', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>My Applications</Link>
          <Link href="/history" style={{ color: '#94B7A2', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>History</Link>
          <Link href="/members" style={{ color: '#94B7A2', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>Members</Link>
          {currentUserId && <Link href={`/profile/${currentUserId}`} style={{ color: '#94B7A2', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>My Profile</Link>}
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }} style={{ color: '#94B7A2', fontSize: '0.875rem', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Log Out</button>
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
          <>
            {/* ── Open Posts ─────────────────────────────────── */}
            {openPosts.length > 0 && (
              <div style={{ marginBottom: '3rem' }}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.15rem' }}>Open</h2>
                  <p style={{ color: '#94B7A2', fontSize: '0.875rem' }}>Accepting applicants.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {openPosts.map(renderPostCard)}
                </div>
              </div>
            )}

            {/* ── In Progress Posts ───────────────────────────── */}
            {inProgressPosts.length > 0 && (
              <div style={{ marginBottom: '3rem' }}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.15rem' }}>In Progress</h2>
                  <p style={{ color: '#94B7A2', fontSize: '0.875rem' }}>Exchanges currently underway.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {inProgressPosts.map(renderPostCard)}
                </div>
              </div>
            )}

            {/* ── Completed Posts ─────────────────────────────── */}
            {completedPosts.length > 0 && (
              <div style={{ marginBottom: '3rem' }}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.15rem', color: '#94B7A2' }}>Completed</h2>
                  <p style={{ color: '#94B7A2', fontSize: '0.875rem' }}>Archived fulfilled requests.</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {completedPosts.map(renderPostCard)}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {reviewModal && (
        <ReviewModal
          revieweeName={reviewModal.revieweeName}
          submitting={submittingReview}
          onSubmit={submitReview}
          onClose={() => setReviewModal(null)}
          messagesLink={reviewModal.applicationId ? `/messages/${reviewModal.applicationId}` : undefined}
        />
      )}

    </main>
  )
}
