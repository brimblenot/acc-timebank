'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

const EMOTE_MAP = { 1: '😶', 2: '🙂', 3: '😊', 4: '😄', 5: '🤩' }

export default function ProfilePage() {
  const router = useRouter()
  const { id } = useParams()
  const [profile, setProfile] = useState(null)
  const [viewerBalance, setViewerBalance] = useState(0)
  const [viewerId, setViewerId] = useState(null)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [stats, setStats] = useState({ given: 0, received: 0 })
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [donateModal, setDonateModal] = useState(false)
  const [donateAmount, setDonateAmount] = useState('')
  const [donating, setDonating] = useState(false)
  const [donateSuccess, setDonateSuccess] = useState(false)
  const [donateError, setDonateError] = useState(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setViewerId(user.id)
      setIsOwnProfile(user.id === id)

      const [profileRes, viewerRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, username, bio, skills').eq('id', id).single(),
        supabase.from('profiles').select('hour_balance').eq('id', user.id).single(),
      ])

      if (!profileRes.data) { setLoading(false); return }
      setProfile(profileRes.data)
      setViewerBalance(viewerRes.data?.hour_balance ?? 0)

      // Stats
      const { data: completedPosts } = await supabase
        .from('service_posts').select('id').eq('status', 'completed')
      const completedIds = (completedPosts || []).map(p => p.id)

      const [givenRes, receivedRes, reviewsRes] = await Promise.all([
        completedIds.length
          ? supabase.from('applications').select('id', { count: 'exact', head: true }).eq('applicant_id', id).eq('status', 'approved').in('post_id', completedIds)
          : Promise.resolve({ count: 0 }),
        supabase.from('service_posts').select('id', { count: 'exact', head: true }).eq('poster_id', id).eq('status', 'completed'),
        supabase.from('reviews').select('rating, comment, created_at, reviewer_id, profiles!reviewer_id(full_name, username)').eq('reviewee_id', id).order('created_at', { ascending: false }).limit(10),
      ])

      setStats({ given: givenRes.count || 0, received: receivedRes.count || 0 })
      setReviews(reviewsRes.data || [])
      setLoading(false)
    }
    init()
  }, [id])

  const handleDonate = async () => {
    const amount = parseInt(donateAmount)
    if (!amount || amount <= 0) { setDonateError('Enter a valid amount.'); return }
    if (amount > viewerBalance) { setDonateError(`You only have ${viewerBalance} hour${viewerBalance !== 1 ? 's' : ''} available.`); return }
    setDonating(true)
    setDonateError(null)
    const { error } = await supabase.rpc('donate_hours', { from_user: viewerId, to_user: id, amount })
    if (error) {
      setDonateError(error.message)
      setDonating(false)
    } else {
      setViewerBalance(prev => prev - amount)
      setDonateSuccess(true)
      setDonating(false)
      setDonateAmount('')
    }
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#94B7A2' }}>Loading...</p>
    </main>
  )

  if (!profile) return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#94B7A2' }}>Profile not found.</p>
    </main>
  )

  const displayName = profile.full_name || profile.username
  const initials = displayName?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', color: '#2A272A' }}>

      <nav style={{ borderBottom: '1px solid #E0E0DC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2.5rem', backgroundColor: '#FEFFFF' }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <Image src="/acc-logo.png" alt="ACC Logo" width={40} height={40} />
          <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.2rem', fontWeight: 700, color: '#2A272A' }}>ACC Timebank</span>
        </Link>
        <Link href="/dashboard" style={{ color: '#94B7A2', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>← Dashboard</Link>
      </nav>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '3rem 1.5rem' }}>

        {/* Profile Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: '#237371', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FEFFFF', fontWeight: 700, fontSize: '1.5rem', flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '2rem', fontWeight: 700, marginBottom: '0.15rem' }}>{displayName}</h1>
            {profile.username && profile.full_name && (
              <p style={{ color: '#94B7A2', fontSize: '0.875rem', marginBottom: '0.5rem' }}>@{profile.username}</p>
            )}
            {profile.bio && <p style={{ color: '#2A272A', fontSize: '0.9rem', lineHeight: 1.6 }}>{profile.bio}</p>}
            {isOwnProfile && <p style={{ color: '#94B7A2', fontSize: '0.8rem', marginTop: '0.5rem' }}>This is your profile.</p>}
          </div>
        </div>

        {/* Skills */}
        {(profile.skills || []).length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <p style={{ fontSize: '0.7rem', color: '#94B7A2', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Skills Offered</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {(profile.skills || []).map(skill => (
                <span key={skill} style={{ padding: '0.35rem 0.875rem', backgroundColor: '#EBF5F0', color: '#237371', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600 }}>
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Services Given', value: stats.given },
            { label: 'Services Received', value: stats.received },
            { label: 'Reviews', value: reviews.length },
          ].map(s => (
            <div key={s.label} style={{ backgroundColor: '#F5F5F3', borderRadius: '1rem', padding: '1.25rem', textAlign: 'center', border: '1px solid #E0E0DC' }}>
              <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: '2rem', fontWeight: 700, color: '#237371' }}>{s.value}</p>
              <p style={{ color: '#94B7A2', fontSize: '0.8rem', marginTop: '0.15rem' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Donate */}
        {!isOwnProfile && (
          <div style={{ marginBottom: '2rem' }}>
            <button
              onClick={() => { setDonateModal(true); setDonateSuccess(false); setDonateError(null) }}
              style={{ padding: '0.75rem 1.75rem', backgroundColor: '#237371', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.75rem', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              🎁 Donate Hours to {profile.full_name || profile.username}
            </button>
          </div>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <div>
            <p style={{ fontSize: '0.7rem', color: '#94B7A2', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>Reviews</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {reviews.map((r, i) => (
                <div key={i} style={{ backgroundColor: '#FEFFFF', border: '1px solid #E0E0DC', borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 2px 8px rgba(42,39,42,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: r.comment ? '0.5rem' : 0 }}>
                    <span style={{ fontSize: '1.75rem' }}>{EMOTE_MAP[r.rating] || '😊'}</span>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#2A272A' }}>
                        {r.profiles?.full_name || r.profiles?.username || 'Community Member'}
                      </p>
                      <p style={{ color: '#94B7A2', fontSize: '0.75rem' }}>
                        {new Date(r.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  {r.comment && <p style={{ color: '#2A272A', fontSize: '0.875rem', lineHeight: 1.6 }}>{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Donate Modal */}
      {donateModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(42,39,42,0.4)' }} onClick={() => setDonateModal(false)} />
          <div style={{ position: 'relative', backgroundColor: '#FEFFFF', borderRadius: '1rem', padding: '2rem', width: '100%', maxWidth: '400px', boxShadow: '0 8px 40px rgba(42,39,42,0.15)', border: '1px solid #E0E0DC' }}>
            {donateSuccess ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎁</div>
                <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Hours Donated!</h2>
                <p style={{ color: '#94B7A2', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                  Your hours have been given to {profile.full_name || profile.username}.
                </p>
                <p style={{ color: '#237371', fontSize: '0.875rem', fontWeight: 600 }}>Your balance: {viewerBalance} hours</p>
                <button onClick={() => setDonateModal(false)} style={{ marginTop: '1.25rem', padding: '0.75rem 2rem', backgroundColor: '#237371', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}>Done</button>
              </div>
            ) : (
              <>
                <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>Donate Hours</h2>
                <p style={{ color: '#94B7A2', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                  Give hours to {profile.full_name || profile.username}. Your balance: <strong style={{ color: '#237371' }}>{viewerBalance} hours</strong>
                </p>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Number of hours</label>
                  <input
                    type="number"
                    min="1"
                    max={viewerBalance}
                    value={donateAmount}
                    onChange={e => { setDonateAmount(e.target.value); setDonateError(null) }}
                    placeholder="e.g. 2"
                    style={{ width: '100%', backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#2A272A', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                {donateError && (
                  <p style={{ color: '#c0392b', fontSize: '0.8rem', backgroundColor: '#fdf0ef', border: '1px solid #f5c6c2', borderRadius: '0.5rem', padding: '0.6rem 0.875rem', marginBottom: '1rem' }}>
                    {donateError}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={handleDonate}
                    disabled={donating || !donateAmount || viewerBalance === 0}
                    style={{ flex: 1, padding: '0.875rem', backgroundColor: donating || !donateAmount || viewerBalance === 0 ? '#E0E0DC' : '#237371', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', border: 'none', cursor: donating ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}
                  >
                    {donating ? 'Donating...' : 'Donate'}
                  </button>
                  <button onClick={() => setDonateModal(false)} style={{ padding: '0.875rem 1.25rem', backgroundColor: '#F5F5F3', color: '#2A272A', fontWeight: 600, borderRadius: '0.5rem', border: '1px solid #E0E0DC', cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </main>
  )
}
