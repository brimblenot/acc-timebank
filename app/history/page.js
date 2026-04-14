'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import ReviewModal from '../components/ReviewModal'
import NavLinks from '../components/NavLinks'

export default function History() {
  const router = useRouter()
  const [currentUserId, setCurrentUserId] = useState(null)
  const [currentUserName, setCurrentUserName] = useState('')
  const [provided, setProvided] = useState([])
  const [requested, setRequested] = useState([])
  const [eventAttendances, setEventAttendances] = useState([])
  const [reviewedPostIds, setReviewedPostIds] = useState([])
  const [reviewedOrgIds, setReviewedOrgIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [reviewModal, setReviewModal] = useState(null)
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)

      const [appsRes, postsRes, reviewsRes, eventSignupsRes, orgReviewsRes, profileRes] = await Promise.all([
        supabase
          .from('applications')
          .select(`
            id, status, created_at,
            service_posts (id, title, category, hours_required, status, updated_at, poster_id,
              profiles (id, full_name, username)
            )
          `)
          .eq('applicant_id', user.id)
          .eq('status', 'approved'),
        supabase
          .from('service_posts')
          .select(`
            id, title, category, hours_required, updated_at,
            applications (id, status, applicant_id,
              profiles (id, full_name, username)
            )
          `)
          .eq('poster_id', user.id)
          .eq('status', 'completed'),
        supabase
          .from('reviews')
          .select('post_id')
          .eq('reviewer_id', user.id)
          .not('post_id', 'is', null),
        // Event signups where the member was marked as attended
        supabase
          .from('event_signups')
          .select(`
            id, event_id,
            events (id, title, category, hours_awarded, event_date, status, org_id)
          `)
          .eq('member_id', user.id)
          .eq('attended', true),
        // Existing org compliments this user left (post_id is null for event reviews)
        supabase
          .from('reviews')
          .select('reviewee_id')
          .eq('reviewer_id', user.id)
          .is('post_id', null),
        supabase
          .from('profiles')
          .select('full_name, username')
          .eq('id', user.id)
          .single(),
      ])

      setProvided((appsRes.data || []).filter(a => a.service_posts?.status === 'completed'))
      setRequested(postsRes.data || [])
      setReviewedPostIds((reviewsRes.data || []).map(r => r.post_id))
      setReviewedOrgIds(new Set((orgReviewsRes.data || []).map(r => r.reviewee_id)))

      const p = profileRes.data
      setCurrentUserName(p?.full_name || p?.username || 'A community member')

      // Resolve org profiles for attended events
      const signups = eventSignupsRes.data || []
      const orgIds = [...new Set(signups.map(s => s.events?.org_id).filter(Boolean))]
      let orgMap = {}
      if (orgIds.length > 0) {
        const { data: orgProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .in('id', orgIds)
        ;(orgProfiles || []).forEach(p => { orgMap[p.id] = p })
      }

      setEventAttendances(
        signups
          .filter(s => s.events)
          .map(s => ({
            signupId: s.id,
            eventId: s.event_id,
            event: s.events,
            org: orgMap[s.events.org_id] || null,
          }))
      )

      setLoading(false)
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const submitReview = async (selectedQualities) => {
    if (!reviewModal) return
    setSubmittingReview(true)

    if (reviewModal.isEventReview) {
      // Event org compliment — no post_id
      const result = await supabase.from('reviews').insert({
        post_id: null,
        reviewer_id: currentUserId,
        reviewee_id: reviewModal.revieweeId,
        selected_qualities: selectedQualities,
      })
      console.log('[history] event review insert result:', result)
      // Notify the organization
      await supabase.from('notifications').insert({
        user_id: reviewModal.revieweeId,
        type: 'new_review',
        message: `${currentUserName} left your organization a compliment.`,
      })
      setReviewedOrgIds(prev => new Set([...prev, reviewModal.revieweeId]))
    } else {
      // Regular post exchange compliment
      const result = await supabase.from('reviews').insert({
        post_id: reviewModal.postId,
        reviewer_id: currentUserId,
        reviewee_id: reviewModal.revieweeId,
        selected_qualities: selectedQualities,
      })
      console.log('[history] review insert result:', result)
      setReviewedPostIds(prev => [...prev, reviewModal.postId])
    }

    setReviewModal(null)
    setSubmittingReview(false)
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#94B7A2' }}>Loading...</p>
    </main>
  )

  const totalProvided = provided.length + eventAttendances.length

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', color: '#2A272A' }}>

      <nav style={{ borderBottom: '1px solid #E0E0DC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2.5rem', backgroundColor: '#FEFFFF' }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <Image src="/acc-logo.png" alt="ACC Logo" width={40} height={40} />
          <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.2rem', fontWeight: 700, color: '#2A272A' }}>ACC Timebank</span>
        </Link>
        <NavLinks userId={currentUserId} />
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem 1.5rem' }}>

        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Exchange History</h1>
          <p style={{ color: '#94B7A2' }}>A record of all completed service exchanges and events.</p>
        </div>

        {/* ── Services I've Provided ─────────────────────────── */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.15rem' }}>Services I've Provided</h2>
            <p style={{ color: '#94B7A2', fontSize: '0.875rem' }}>Completed exchanges and community events you attended.</p>
          </div>

          {totalProvided === 0 ? (
            <div style={{ backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC', borderRadius: '1rem', padding: '2rem', textAlign: 'center' }}>
              <p style={{ color: '#94B7A2', fontSize: '0.875rem' }}>No completed services or events yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* ── Regular exchange completions ── */}
              {provided.map(app => {
                const post = app.service_posts
                if (!post) return null
                const alreadyReviewed = reviewedPostIds.includes(post.id)
                const requesterName = post.profiles?.full_name || post.profiles?.username

                return (
                  <div
                    key={app.id}
                    style={{ backgroundColor: '#FAFAFA', border: '1px solid #E0E0DC', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 2px 8px rgba(42,39,42,0.04)', opacity: 0.9 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.7rem', color: '#94B7A2', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{post.category}</span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '9999px', backgroundColor: '#F5F5F3', color: '#94B7A2', border: '1px solid #E0E0DC' }}>Completed</span>
                        </div>
                        <h3 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.25rem', fontWeight: 700, color: '#94B7A2', marginBottom: '0.25rem' }}>{post.title}</h3>
                        <p style={{ color: '#94B7A2', fontSize: '0.8rem' }}>
                          Requested by{' '}
                          <Link href={`/profile/${post.poster_id}`} style={{ color: '#94B7A2', fontWeight: 600, textDecoration: 'none' }}>
                            {requesterName}
                          </Link>
                        </p>
                        <p style={{ color: '#94B7A2', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                          Completed {new Date(post.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1.5rem' }}>
                        <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: '2rem', fontWeight: 700, color: '#94B7A2', lineHeight: 1 }}>
                          +{post.hours_required}<span style={{ fontSize: '0.9rem', fontWeight: 600, marginLeft: '0.2rem' }}>hrs</span>
                        </p>
                        <p style={{ fontSize: '0.7rem', color: '#94B7A2', marginTop: '0.15rem' }}>earned</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <Link
                        href={`/messages/${app.id}`}
                        style={{ padding: '0.5rem 1.25rem', backgroundColor: '#F5F5F3', color: '#94B7A2', fontWeight: 700, borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.875rem', border: '1px solid #E0E0DC' }}
                      >
                        💬 View Messages
                      </Link>
                      {!alreadyReviewed ? (
                        <button
                          onClick={() => setReviewModal({
                            postId: post.id,
                            revieweeId: post.poster_id,
                            revieweeName: requesterName,
                            isEventReview: false,
                          })}
                          style={{ padding: '0.5rem 1.25rem', backgroundColor: '#FEF9E7', color: '#D4A017', fontWeight: 700, borderRadius: '0.5rem', border: '1px solid #D4A017', cursor: 'pointer', fontSize: '0.875rem' }}
                        >
                          ★ Leave a Compliment
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#94B7A2', fontWeight: 600, alignSelf: 'center' }}>✓ Compliment Left</span>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* ── Event attendance entries ── */}
              {eventAttendances.map(ea => {
                const alreadyReviewed = reviewedOrgIds.has(ea.event.org_id)
                const orgName = ea.org?.full_name || ea.org?.username || 'Unknown Organization'
                const dateStr = ea.event.event_date
                  ? new Date(ea.event.event_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                  : null

                return (
                  <div
                    key={`event-${ea.signupId}`}
                    style={{ backgroundColor: '#FAFAFA', border: '1px solid #E0E0DC', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 2px 8px rgba(42,39,42,0.04)', opacity: 0.9 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.7rem', color: '#94B7A2', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{ea.event.category}</span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '9999px', backgroundColor: '#EBF5F0', color: '#237371', border: '1px solid #c5e3da' }}>Event</span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '9999px', backgroundColor: '#F5F5F3', color: '#94B7A2', border: '1px solid #E0E0DC' }}>Attended</span>
                        </div>
                        <h3 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.25rem', fontWeight: 700, color: '#94B7A2', marginBottom: '0.25rem' }}>
                          {ea.event.title}
                        </h3>
                        <p style={{ color: '#94B7A2', fontSize: '0.8rem' }}>
                          Hosted by{' '}
                          <Link href={`/profile/${ea.event.org_id}`} style={{ color: '#94B7A2', fontWeight: 600, textDecoration: 'none' }}>
                            {orgName}
                          </Link>
                        </p>
                        {dateStr && (
                          <p style={{ color: '#94B7A2', fontSize: '0.75rem', marginTop: '0.2rem' }}>{dateStr}</p>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1.5rem' }}>
                        <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: '2rem', fontWeight: 700, color: '#94B7A2', lineHeight: 1 }}>
                          +{ea.event.hours_awarded}<span style={{ fontSize: '0.9rem', fontWeight: 600, marginLeft: '0.2rem' }}>hrs</span>
                        </p>
                        <p style={{ fontSize: '0.7rem', color: '#94B7A2', marginTop: '0.15rem' }}>earned</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <Link
                        href={`/events/${ea.eventId}`}
                        style={{ padding: '0.5rem 1.25rem', backgroundColor: '#F5F5F3', color: '#94B7A2', fontWeight: 700, borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.875rem', border: '1px solid #E0E0DC' }}
                      >
                        🗓️ View Event
                      </Link>
                      {!alreadyReviewed ? (
                        <button
                          onClick={() => setReviewModal({
                            revieweeId: ea.event.org_id,
                            revieweeName: orgName,
                            isEventReview: true,
                          })}
                          style={{ padding: '0.5rem 1.25rem', backgroundColor: '#FEF9E7', color: '#D4A017', fontWeight: 700, borderRadius: '0.5rem', border: '1px solid #D4A017', cursor: 'pointer', fontSize: '0.875rem' }}
                        >
                          ★ Leave a Compliment
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#94B7A2', fontWeight: 600, alignSelf: 'center' }}>✓ Compliment Left</span>
                      )}
                    </div>
                  </div>
                )
              })}

            </div>
          )}
        </div>

        {/* ── Services I've Requested ────────────────────────── */}
        <div>
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.15rem' }}>Services I've Requested</h2>
            <p style={{ color: '#94B7A2', fontSize: '0.875rem' }}>Posts you created that have been fulfilled.</p>
          </div>

          {requested.length === 0 ? (
            <div style={{ backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC', borderRadius: '1rem', padding: '2rem', textAlign: 'center' }}>
              <p style={{ color: '#94B7A2', fontSize: '0.875rem' }}>No completed requests yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {requested.map(post => {
                const approvedApp = post.applications?.find(a => a.status === 'approved')
                const alreadyReviewed = reviewedPostIds.includes(post.id)
                const providerName = approvedApp?.profiles?.full_name || approvedApp?.profiles?.username

                return (
                  <div
                    key={post.id}
                    style={{ backgroundColor: '#FAFAFA', border: '1px solid #E0E0DC', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 2px 8px rgba(42,39,42,0.04)', opacity: 0.9 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.7rem', color: '#94B7A2', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{post.category}</span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '9999px', backgroundColor: '#F5F5F3', color: '#94B7A2', border: '1px solid #E0E0DC' }}>Completed</span>
                        </div>
                        <h3 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.25rem', fontWeight: 700, color: '#94B7A2', marginBottom: '0.25rem' }}>{post.title}</h3>
                        {providerName && (
                          <p style={{ color: '#94B7A2', fontSize: '0.8rem' }}>
                            Completed by{' '}
                            <Link href={`/profile/${approvedApp.applicant_id}`} style={{ color: '#94B7A2', fontWeight: 600, textDecoration: 'none' }}>
                              {providerName}
                            </Link>
                          </p>
                        )}
                        <p style={{ color: '#94B7A2', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                          Completed {new Date(post.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1.5rem' }}>
                        <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: '2rem', fontWeight: 700, color: '#94B7A2', lineHeight: 1 }}>
                          -{post.hours_required}<span style={{ fontSize: '0.9rem', fontWeight: 600, marginLeft: '0.2rem' }}>hrs</span>
                        </p>
                        <p style={{ fontSize: '0.7rem', color: '#94B7A2', marginTop: '0.15rem' }}>spent</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {approvedApp && (
                        <Link
                          href={`/messages/${approvedApp.id}`}
                          style={{ padding: '0.5rem 1.25rem', backgroundColor: '#F5F5F3', color: '#94B7A2', fontWeight: 700, borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.875rem', border: '1px solid #E0E0DC' }}
                        >
                          💬 View Messages
                        </Link>
                      )}
                      {approvedApp && !alreadyReviewed ? (
                        <button
                          onClick={() => setReviewModal({
                            postId: post.id,
                            revieweeId: approvedApp.applicant_id,
                            revieweeName: providerName,
                            applicationId: approvedApp.id,
                            isEventReview: false,
                          })}
                          style={{ padding: '0.5rem 1.25rem', backgroundColor: '#FEF9E7', color: '#D4A017', fontWeight: 700, borderRadius: '0.5rem', border: '1px solid #D4A017', cursor: 'pointer', fontSize: '0.875rem' }}
                        >
                          ★ Leave a Compliment
                        </button>
                      ) : alreadyReviewed ? (
                        <span style={{ fontSize: '0.8rem', color: '#94B7A2', fontWeight: 600, alignSelf: 'center' }}>✓ Compliment Left</span>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

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
