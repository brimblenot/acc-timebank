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
  const [currentUserId, setCurrentUserId] = useState(null)
  const [reviewModal, setReviewModal] = useState(null)
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' })
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewedPosts, setReviewedPosts] = useState([])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)

      const { data } = await supabase
        .from('applications')
        .select(`
          *,
          service_posts (
            id, title, description, category, hours_required, status, poster_id,
            profiles (id, full_name, username),
            applications (id, status, applicant_id,
              profiles (full_name, username)
            )
          )
        `)
        .eq('applicant_id', user.id)
        .order('created_at', { ascending: false })

      const { data: existingReviews } = await supabase
        .from('reviews')
        .select('post_id')
        .eq('reviewer_id', user.id)

      setReviewedPosts((existingReviews || []).map(r => r.post_id))
      setApplications(data || [])
      setLoading(false)
    }
    init()
  }, [])

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

    setReviewedPosts(prev => [...prev, reviewModal.postId])
    setReviewModal(null)
    setReviewData({ rating: 5, comment: '' })
    setSubmittingReview(false)
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#94B7A2' }}>Loading...</p>
    </main>
  )

  const getPostStatus = (app) => {
    const post = app.service_posts
    if (!post) return 'unknown'

    // Someone else was accepted
    const otherApproved = post.applications?.find(
      a => a.status === 'approved' && a.applicant_id !== currentUserId
    )

    if (app.status === 'declined' && otherApproved) return 'someone_else_accepted'
    if (app.status === 'declined') return 'declined'
    if (app.status === 'approved' && post.status === 'completed') return 'completed'
    if (app.status === 'approved') return 'approved'
    if (app.status === 'pending' && (post.status === 'in_progress' || post.status === 'completed')) return 'someone_else_accepted'
    return 'pending'
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
          <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>My Applications</h1>
          <p style={{ color: '#94B7A2' }}>Track the status of services you've offered to provide.</p>
        </div>

        {applications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 0' }}>
            <p style={{ color: '#94B7A2', fontSize: '1.125rem', marginBottom: '1rem' }}>You haven't applied to any requests yet.</p>
            <Link href="/posts" style={{ backgroundColor: '#237371', color: '#FEFFFF', fontWeight: 700, padding: '0.875rem 2rem', borderRadius: '0.75rem', textDecoration: 'none' }}>Browse Requests</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {applications.map(app => {
              const postStatus = getPostStatus(app)
              const isCompleted = postStatus === 'completed'
              const alreadyReviewed = reviewedPosts.includes(app.service_posts?.id)
              const acceptedPerson = app.service_posts?.applications?.find(
                a => a.status === 'approved' && a.applicant_id !== currentUserId
              )

              const statusConfig = {
                approved: { bg: '#EBF5F0', color: '#237371', label: '✓ Approved' },
                completed: { bg: '#EBF5F0', color: '#237371', label: '✓ Completed' },
                pending: { bg: '#F5F5F3', color: '#94B7A2', label: '⏳ Pending Review' },
                declined: { bg: '#fdf0ef', color: '#c0392b', label: '✕ Declined' },
                someone_else_accepted: { bg: '#FEF9E7', color: '#D4A017', label: '⚠ Someone Else Was Accepted' },
                unknown: { bg: '#F5F5F3', color: '#94B7A2', label: 'Unknown' },
              }

              const sc = statusConfig[postStatus] || statusConfig.unknown

              return (
                <div key={app.id} style={{ backgroundColor: '#FEFFFF', border: '1px solid #E0E0DC', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 2px 8px rgba(42,39,42,0.06)', opacity: postStatus === 'someone_else_accepted' || postStatus === 'declined' ? 0.75 : 1 }}>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#237371', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{app.service_posts?.category}</span>
                      <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>{app.service_posts?.title}</h2>
                      <p style={{ color: '#94B7A2', fontSize: '0.875rem', marginTop: '0.15rem' }}>
                        Posted by{' '}
                        <Link href={`/profile/${app.service_posts?.poster_id}`} style={{ color: '#237371', textDecoration: 'none', fontWeight: 600 }}>
                          {app.service_posts?.profiles?.full_name || app.service_posts?.profiles?.username}
                        </Link>
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1rem' }}>
                      <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: '2rem', fontWeight: 700, color: '#237371', lineHeight: 1 }}>{app.service_posts?.hours_required}</p>
                      <p style={{ fontSize: '0.75rem', color: '#94B7A2' }}>hours</p>
                    </div>
                  </div>

                  {/* Someone else accepted notice */}
                  {postStatus === 'someone_else_accepted' && acceptedPerson && (
                    <div style={{ backgroundColor: '#FEF9E7', border: '1px solid #D4A017', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#D4A017', fontWeight: 600 }}>
                      {acceptedPerson.profiles?.full_name || acceptedPerson.profiles?.username} was selected for this request.
                    </div>
                  )}

                  {postStatus === 'someone_else_accepted' && !acceptedPerson && (
                    <div style={{ backgroundColor: '#FEF9E7', border: '1px solid #D4A017', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#D4A017', fontWeight: 600 }}>
                      Another applicant was selected for this request.
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, padding: '0.3rem 0.75rem', borderRadius: '9999px', backgroundColor: sc.bg, color: sc.color }}>
                      {sc.label}
                    </span>

                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      {(postStatus === 'approved' || postStatus === 'completed') && (
                        <Link href={`/messages/${app.id}`} style={{ padding: '0.5rem 1.25rem', backgroundColor: '#237371', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.875rem' }}>
                          💬 Messages
                        </Link>
                      )}
                      {isCompleted && !alreadyReviewed && (
                        <button
                          onClick={() => setReviewModal({
                            postId: app.service_posts.id,
                            revieweeId: app.service_posts.poster_id,
                            revieweeName: app.service_posts.profiles?.full_name || app.service_posts.profiles?.username
                          })}
                          style={{ padding: '0.5rem 1.25rem', backgroundColor: '#FEF9E7', color: '#D4A017', fontWeight: 700, borderRadius: '0.5rem', border: '1px solid #D4A017', cursor: 'pointer', fontSize: '0.875rem' }}
                        >
                          ★ Leave a Review
                        </button>
                      )}
                      {isCompleted && alreadyReviewed && (
                        <span style={{ fontSize: '0.8rem', color: '#94B7A2', fontWeight: 600 }}>✓ Reviewed</span>
                      )}
                    </div>
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
                  <button key={star} onClick={() => setReviewData({ ...reviewData, rating: star })} style={{ fontSize: '2rem', background: 'none', border: 'none', cursor: 'pointer', color: star <= reviewData.rating ? '#D4A017' : '#E0E0DC', padding: 0 }}>★</button>
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
              <button onClick={submitReview} disabled={submittingReview} style={{ flex: 1, padding: '0.875rem', backgroundColor: submittingReview ? '#E0E0DC' : '#237371', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', border: 'none', cursor: submittingReview ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}>
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
              <button onClick={() => setReviewModal(null)} style={{ padding: '0.875rem 1.5rem', backgroundColor: '#F5F5F3', color: '#2A272A', fontWeight: 600, borderRadius: '0.5rem', border: '1px solid #E0E0DC', cursor: 'pointer', fontSize: '0.875rem' }}>Skip</button>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}