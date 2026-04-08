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
  const [reviewModal, setReviewModal] = useState(null)
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' })
  const [submittingReview, setSubmittingReview] = useState(false)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [completedAppId, setCompletedAppId] = useState(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)
      fetchMyPosts(user.id)
    }
    init()
  }, [])

  const fetchMyPosts = async (userId) => {
    const { data } = await supabase
      .from('service_posts')
      .select(`
        *,
        applications (
          id, status, created_at, applicant_id,
          profiles (id, full_name, username, bio)
        )
      `)
      .eq('poster_id', userId)
      .order('created_at', { ascending: false })
    setPosts(data || [])
    setLoading(false)
  }

  const handleApplication = async (applicationId, newStatus, postId) => {
    setUpdating(applicationId)

    if (newStatus === 'approved') {
      // First approve the selected application
      await supabase
        .from('applications')
        .update({ status: 'approved' })
        .eq('id', applicationId)

      // Then decline all other pending applications for this post
      await supabase
        .from('applications')
        .update({ status: 'declined' })
        .eq('post_id', postId)
        .eq('status', 'pending')
        .neq('id', applicationId)

      // Set post to in_progress
      await supabase
        .from('service_posts')
        .update({ status: 'in_progress' })
        .eq('id', postId)
    } else {
      await supabase
        .from('applications')
        .update({ status: newStatus })
        .eq('id', applicationId)
    }

    await fetchMyPosts(currentUserId)
    setUpdating(null)
  }

  const handleComplete = async (post) => {
    setCompleting(post.id)

    let approvedApp = post.applications.find(a => a.status === 'approved')

    if (!approvedApp) {
      const pendingApp = post.applications.find(a => a.status === 'pending')
      if (!pendingApp) { alert('No applicant found.'); setCompleting(null); return }

      await supabase
        .from('applications')
        .update({ status: 'approved' })
        .eq('id', pendingApp.id)

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

  const submitReview = async () => {
    if (!reviewModal) return
    setSubmittingReview(true)

    await supabase.from('reviews').insert({
      post_id: reviewModal.postId,
      reviewer_id: currentUserId,
      reviewee_id: reviewModal.revieweeId,
      rating: reviewData.rating,
      comment: reviewData.comment || null,
    })

    setReviewModal(null)
    setReviewData({ rating: 5, comment: '' })
    setSubmittingReview(false)
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
              const approvedApp = post.applications?.find(a => a.status === 'approved')
              const visibleApps = post.applications?.filter(a => a.status !== 'declined') || []

              return (
                <div key={post.id} style={{ backgroundColor: '#FEFFFF', border: '1px solid #E0E0DC', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 2px 8px rgba(42,39,42,0.06)' }}>

                  {/* Post Header */}
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

                    {/* In Progress Banner */}
                    {post.status === 'in_progress' && (
                      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #E0E0DC' }}>
                        <div style={{ backgroundColor: '#EBF5F0', border: '1px solid #94B7A2', borderRadius: '0.75rem', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                          <div>
                            <p style={{ color: '#237371', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.15rem' }}>
                              {approvedApp
                                ? `Working with ${approvedApp.profiles?.full_name || approvedApp.profiles?.username}`
                                : 'Service in progress'
                              }
                            </p>
                            <p style={{ color: '#94B7A2', fontSize: '0.8rem' }}>Mark complete when the service is done to transfer hours.</p>
                          </div>
                          <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
                            {approvedApp && (
                              <Link
                                href={`/messages/${approvedApp.id}`}
                                style={{ padding: '0.6rem 1rem', backgroundColor: '#FEFFFF', color: '#237371', fontWeight: 700, borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.8rem', border: '1px solid #237371' }}
                              >
                                💬 Messages
                              </Link>
                            )}
                            <button
                              onClick={() => handleComplete(post)}
                              disabled={completing === post.id}
                              style={{ padding: '0.6rem 1.25rem', backgroundColor: completing === post.id ? '#E0E0DC' : '#237371', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', border: 'none', cursor: completing === post.id ? 'not-allowed' : 'pointer', fontSize: '0.8rem' }}
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
                        <div style={{ backgroundColor: '#EBF5F0', border: '1px solid #94B7A2', borderRadius: '0.75rem', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <p style={{ color: '#237371', fontSize: '0.875rem', fontWeight: 600 }}>
                            ✓ Service completed — {post.hours_required} hours transferred
                            {approvedApp && ` to ${approvedApp.profiles?.full_name || approvedApp.profiles?.username}`}
                          </p>
                          {(approvedApp || completedAppId) && (
                            <Link
                              href={`/messages/${approvedApp?.id || completedAppId}`}
                              style={{ padding: '0.5rem 1.25rem', backgroundColor: '#237371', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.875rem', flexShrink: 0, marginLeft: '1rem' }}
                            >
                              💬 Messages
                            </Link>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Applications */}
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
                              {/* Open post — show approve/decline */}
                              {app.status === 'pending' && post.status === 'open' && (
                                <>
                                  <button
                                    onClick={() => handleApplication(app.id, 'approved', post.id)}
                                    disabled={updating === app.id}
                                    style={{ padding: '0.5rem 1rem', backgroundColor: updating === app.id ? '#E0E0DC' : '#237371', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', border: 'none', cursor: updating === app.id ? 'not-allowed' : 'pointer', fontSize: '0.8rem' }}
                                  >
                                    {updating === app.id ? 'Approving...' : 'Approve'}
                                  </button>
                                  <button
                                    onClick={() => handleApplication(app.id, 'declined', post.id)}
                                    disabled={updating === app.id}
                                    style={{ padding: '0.5rem 1rem', backgroundColor: '#F5F5F3', color: '#2A272A', fontWeight: 600, borderRadius: '0.5rem', border: '1px solid #E0E0DC', cursor: updating === app.id ? 'not-allowed' : 'pointer', fontSize: '0.8rem' }}
                                  >
                                    Decline
                                  </button>
                                </>
                              )}

                              {/* Approved — show badge and messages */}
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

                              {/* Pending on in_progress/completed post — shouldn't happen but safety net */}
                              {app.status === 'pending' && post.status !== 'open' && (
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, padding: '0.3rem 0.75rem', borderRadius: '9999px', backgroundColor: '#F5F5F3', color: '#94B7A2' }}>
                                  pending
                                </span>
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

      {/* Review Modal */}
      {reviewModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(42,39,42,0.4)' }} onClick={() => setReviewModal(null)} />
          <div style={{ position: 'relative', backgroundColor: '#FEFFFF', borderRadius: '1rem', padding: '2rem', width: '100%', maxWidth: '440px', boxShadow: '0 8px 40px rgba(42,39,42,0.15)', border: '1px solid #E0E0DC' }}>
            <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Leave a Review</h2>
            <p style={{ color: '#94B7A2', fontSize: '0.875rem', marginBottom: '1.5rem' }}>How was your experience with {reviewModal.revieweeName}?</p>

            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>Rating</p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setReviewData({ ...reviewData, rating: star })}
                    style={{ fontSize: '2rem', background: 'none', border: 'none', cursor: 'pointer', color: star <= reviewData.rating ? '#D4A017' : '#E0E0DC', padding: 0 }}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem' }}>Comment (optional)</p>
              <textarea
                value={reviewData.comment}
                onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                placeholder="Share your experience..."
                rows={3}
                style={{ width: '100%', backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#2A272A', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={submitReview}
                disabled={submittingReview}
                style={{ flex: 1, padding: '0.875rem', backgroundColor: submittingReview ? '#E0E0DC' : '#237371', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', border: 'none', cursor: submittingReview ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}
              >
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
              <button
                onClick={() => setReviewModal(null)}
                style={{ padding: '0.875rem 1.5rem', backgroundColor: '#F5F5F3', color: '#2A272A', fontWeight: 600, borderRadius: '0.5rem', border: '1px solid #E0E0DC', cursor: 'pointer', fontSize: '0.875rem' }}
              >
                Skip
              </button>
            </div>

            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #E0E0DC', textAlign: 'center' }}>
              <Link
                href={`/messages/${reviewModal.applicationId}`}
                style={{ color: '#237371', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}
              >
                💬 Go to Messages with {reviewModal.revieweeName}
              </Link>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}