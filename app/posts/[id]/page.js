'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import NavLinks from '../../components/NavLinks'
import ReviewModal from '../../components/ReviewModal'

export default function PostDetail() {
  const router = useRouter()
  const { id } = useParams()
  const [post, setPost] = useState(null)
  const [applications, setApplications] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  const [userApplicationId, setUserApplicationId] = useState(null)
  const [userApplicationStatus, setUserApplicationStatus] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [updating, setUpdating] = useState(null)
  const [completing, setCompleting] = useState(false)
  const [reviewModal, setReviewModal] = useState(null)
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUser(user)
      await fetchPost(user.id)

      // Realtime for applications
      const channel = supabase
        .channel(`post-detail-${id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'applications', filter: `post_id=eq.${id}` }, () => fetchPost(user.id))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'service_posts', filter: `id=eq.${id}` }, () => fetchPost(user.id))
        .subscribe()

      return () => supabase.removeChannel(channel)
    }
    init()
  }, [id])

  const fetchPost = async (userId) => {
    const { data: postData } = await supabase
      .from('service_posts')
      .select(`*, profiles (id, username, full_name, bio)`)
      .eq('id', id)
      .single()

    const { data: apps } = await supabase
      .from('applications')
      .select(`*, profiles (id, full_name, username, bio)`)
      .eq('post_id', id)
      .order('created_at', { ascending: true })

    setPost(postData)
    setApplications(apps || [])

    const alreadyApplied = (apps || []).find(a => a.applicant_id === userId)
    if (alreadyApplied) {
      setApplied(true)
      setUserApplicationId(alreadyApplied.id)
      setUserApplicationStatus(alreadyApplied.status)
    }

    setLoading(false)
  }

  const handleCancelApplication = async () => {
    if (!userApplicationId) return
    setCancelling(true)
    await supabase.from('applications').delete().eq('id', userApplicationId)
    setApplied(false)
    setUserApplicationId(null)
    setUserApplicationStatus(null)
    setCancelling(false)
  }

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

  const handleApprove = async (applicationId) => {
    setUpdating(applicationId)

    await supabase.from('applications').update({ status: 'approved' }).eq('id', applicationId)

    const { data: others } = await supabase
      .from('applications')
      .select('id')
      .eq('post_id', id)
      .eq('status', 'pending')

    for (const app of others || []) {
      await supabase.from('applications').update({ status: 'declined' }).eq('id', app.id)
    }

    await supabase.from('service_posts').update({ status: 'in_progress' }).eq('id', id)
    await fetchPost(currentUser.id)
    setUpdating(null)
  }

  const handleDecline = async (applicationId) => {
    setUpdating(applicationId)
    await supabase.from('applications').update({ status: 'declined' }).eq('id', applicationId)
    await fetchPost(currentUser.id)
    setUpdating(null)
  }

  const handleComplete = async () => {
    setCompleting(true)

    const approvedApp = applications.find(a => a.status === 'approved')
    if (!approvedApp) { alert('No approved applicant found.'); setCompleting(false); return }

    const { error } = await supabase.rpc('transfer_hours', {
      from_user: post.poster_id,
      to_user: approvedApp.applicant_id,
      amount: post.hours_required,
      post_id: id,
    })

    if (error) { alert('Error: ' + error.message); setCompleting(false); return }

    await fetchPost(currentUser.id)
    setCompleting(false)

    setReviewModal({
      applicationId: approvedApp.id,
      revieweeId: approvedApp.applicant_id,
      revieweeName: approvedApp.profiles?.full_name || approvedApp.profiles?.username
    })
  }

  const submitReview = async (rating, comment) => {
    if (!reviewModal) return
    setSubmittingReview(true)
    await supabase.from('reviews').insert({
      post_id: id,
      reviewer_id: currentUser.id,
      reviewee_id: reviewModal.revieweeId,
      rating,
      comment: comment || null,
    })
    setReviewModal(null)
    setSubmittingReview(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    const { data: apps } = await supabase.from('applications').select('id').eq('post_id', id)
    if (apps?.length > 0) {
      await supabase.from('messages').delete().in('application_id', apps.map(a => a.id))
    }
    await supabase.from('applications').delete().eq('post_id', id)
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
  const approvedApp = applications.find(a => a.status === 'approved')
  const visibleApps = applications.filter(a => a.status !== 'declined')

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', color: '#2A272A' }}>

      <nav style={{ borderBottom: '1px solid #E0E0DC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2.5rem', backgroundColor: '#FEFFFF' }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <Image src="/acc-logo.png" alt="ACC Logo" width={40} height={40} />
          <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.2rem', fontWeight: 700, color: '#2A272A' }}>ACC Timebank</span>
        </Link>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <NavLinks userId={currentUser?.id} />
        </div>
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '3rem 1.5rem' }}>

        {/* Category + Status */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.7rem', color: '#237371', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', backgroundColor: '#EBF5F0', padding: '0.25rem 0.75rem', borderRadius: '9999px' }}>{post.category}</span>
          <span style={{ fontSize: '0.7rem', color: '#94B7A2', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', backgroundColor: '#F5F5F3', padding: '0.25rem 0.75rem', borderRadius: '9999px' }}>{{ open: 'Open', in_progress: 'In Progress', completed: 'Completed' }[post.status] || post.status}</span>
        </div>

        {/* Title + Hours */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.1, flex: 1 }}>{post.title}</h1>
          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1.5rem' }}>
            <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: '3.5rem', fontWeight: 700, color: '#237371', lineHeight: 1 }}>{post.hours_required}<span style={{ fontSize: '1.25rem', fontWeight: 600, marginLeft: '0.25rem' }}>hrs</span></p>
          </div>
        </div>

        {/* Description */}
        <div style={{ backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.7rem', color: '#94B7A2', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Description</p>
          <p style={{ lineHeight: 1.7, color: '#2A272A' }}>{post.description}</p>
        </div>

        {/* Posted By */}
        <div style={{ backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.7rem', color: '#94B7A2', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Posted By</p>
          <Link href={`/profile/${post.poster_id}`} style={{ fontWeight: 700, color: '#237371', textDecoration: 'none' }}>
            {post.profiles?.full_name || post.profiles?.username}
          </Link>
          {post.profiles?.bio && <p style={{ color: '#94B7A2', fontSize: '0.875rem', marginTop: '0.25rem' }}>{post.profiles.bio}</p>}
          <p style={{ color: '#94B7A2', fontSize: '0.75rem', marginTop: '0.5rem' }}>
            {new Date(post.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* OWNER VIEW */}
        {isOwner ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* In Progress Banner */}
            {post.status === 'in_progress' && approvedApp && (
              <div style={{ backgroundColor: '#EBF5F0', border: '1px solid #94B7A2', borderRadius: '1rem', padding: '1.25rem' }}>
                <p style={{ color: '#237371', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.15rem' }}>
                  Working with {approvedApp.profiles?.full_name || approvedApp.profiles?.username}
                </p>
                <p style={{ color: '#94B7A2', fontSize: '0.8rem', marginBottom: '1rem' }}>Mark complete when the service is done to transfer hours.</p>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <Link
                    href={`/messages/${approvedApp.id}`}
                    style={{ flex: 1, padding: '0.7rem 1rem', backgroundColor: '#237371', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.875rem', textAlign: 'center' }}
                  >
                    💬 Message {approvedApp.profiles?.full_name || approvedApp.profiles?.username}
                  </Link>
                  <button
                    onClick={handleComplete}
                    disabled={completing}
                    style={{ flex: 1, padding: '0.7rem 1rem', backgroundColor: completing ? '#E0E0DC' : '#2A272A', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', border: 'none', cursor: completing ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}
                  >
                    {completing ? 'Processing...' : '✓ Mark Complete'}
                  </button>
                </div>
              </div>
            )}

            {/* Completed Banner */}
            {post.status === 'completed' && (
              <div style={{ backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC', borderRadius: '1rem', padding: '1.25rem' }}>
                <p style={{ color: '#237371', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  ✓ Completed — {post.hours_required} hours transferred
                  {approvedApp && ` to ${approvedApp.profiles?.full_name || approvedApp.profiles?.username}`}
                </p>
                <p style={{ color: '#94B7A2', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
                  Completed on {new Date(post.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                {approvedApp && (
                  <Link href={`/messages/${approvedApp.id}`} style={{ display: 'inline-block', padding: '0.5rem 1.25rem', backgroundColor: '#237371', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.875rem' }}>
                    💬 Messages
                  </Link>
                )}
              </div>
            )}

            {/* Applications Section — only when open */}
            {post.status === 'open' && (
              <div style={{ backgroundColor: '#FEFFFF', border: '1px solid #E0E0DC', borderRadius: '1rem', overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #E0E0DC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: '0.7rem', color: '#94B7A2', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Applications ({visibleApps.length})
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2FB774', display: 'inline-block' }} />
                    <span style={{ fontSize: '0.7rem', color: '#2FB774', fontWeight: 600 }}>Live</span>
                  </div>
                </div>

                {visibleApps.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <p style={{ color: '#94B7A2', fontSize: '0.875rem' }}>No applications yet. Check back soon.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {visibleApps.map((app, index) => (
                      <div
                        key={app.id}
                        style={{
                          padding: '1.25rem 1.5rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderBottom: index < visibleApps.length - 1 ? '1px solid #E0E0DC' : 'none',
                          backgroundColor: app.status === 'approved' ? '#EBF5F0' : '#FEFFFF'
                        }}
                      >
                        <div>
                          <Link href={`/profile/${app.profiles?.id}`} style={{ fontWeight: 700, color: '#237371', textDecoration: 'none', fontSize: '0.9rem' }}>
                            {app.profiles?.full_name || app.profiles?.username}
                          </Link>
                          {app.profiles?.bio && <p style={{ color: '#94B7A2', fontSize: '0.8rem', marginTop: '0.15rem' }}>{app.profiles.bio}</p>}
                          <p style={{ color: '#94B7A2', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                            Applied {new Date(app.created_at).toLocaleDateString()}
                          </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0, marginLeft: '1rem' }}>
                          {app.status === 'pending' && post.status === 'open' && (
                            <>
                              <button
                                onClick={() => handleApprove(app.id)}
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
                              <Link href={`/messages/${app.id}`} style={{ padding: '0.5rem 1rem', backgroundColor: '#237371', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.8rem' }}>
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

            {/* Delete Button */}
            {isDeletable && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                {deleteConfirm ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: '#fdf0ef', border: '1px solid #f5c6c2', borderRadius: '0.75rem', padding: '1rem' }}>
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

        ) : /* APPLICANT VIEW */ applied ? (
          <div style={{ backgroundColor: '#EBF5F0', border: '1px solid #94B7A2', borderRadius: '1rem', padding: '1.5rem', textAlign: 'center' }}>
            <p style={{ color: '#237371', fontWeight: 700 }}>✓ You've applied to this request</p>
            <p style={{ color: '#94B7A2', fontSize: '0.875rem', marginTop: '0.25rem' }}>The requester will review your application.</p>
            {userApplicationStatus === 'pending' && post.status === 'open' && (
              <button
                onClick={handleCancelApplication}
                disabled={cancelling}
                style={{ marginTop: '1rem', padding: '0.5rem 1.25rem', backgroundColor: 'transparent', color: '#c0392b', fontWeight: 600, borderRadius: '0.5rem', border: '1px solid #f5c6c2', cursor: cancelling ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}
              >
                {cancelling ? 'Cancelling...' : 'Cancel Application'}
              </button>
            )}
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