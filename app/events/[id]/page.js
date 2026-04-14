'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import NavLinks from '../../components/NavLinks'

function formatDate(ts) {
  if (!ts) return null
  return new Date(ts).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function EventDetail() {
  const router = useRouter()
  const { id } = useParams()

  const [event, setEvent] = useState(null)
  const [org, setOrg] = useState(null)
  const [signups, setSignups] = useState([]) // { id, member_id, attended, profiles:{full_name,username} }
  const [currentUser, setCurrentUser] = useState(null)
  const [accountType, setAccountType] = useState('member')
  const [loading, setLoading] = useState(true)
  const [mySignupId, setMySignupId] = useState(null)

  // Member actions
  const [signingUp, setSigningUp] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  // Org actions
  const [completing, setCompleting] = useState(false)
  const [attendanceMap, setAttendanceMap] = useState({}) // signupId → boolean
  const [awardingHours, setAwardingHours] = useState(false)
  const [awardSuccess, setAwardSuccess] = useState(false)
  const [awardError, setAwardError] = useState(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase.from('profiles').select('id, account_type').eq('id', user.id).single()
      setCurrentUser(user)
      setAccountType(profile?.account_type || 'member')

      await loadEvent(user.id)
      setLoading(false)
    }
    init()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadEvent = async (userId) => {
    const [eventRes, signupsRes] = await Promise.all([
      supabase.from('events').select('*, profiles!org_id(id, full_name, username)').eq('id', id).single(),
      supabase.from('event_signups').select('id, member_id, attended, profiles!member_id(full_name, username)').eq('event_id', id).order('created_at'),
    ])

    if (!eventRes.data) { router.push('/events'); return }

    setEvent(eventRes.data)
    setOrg(eventRes.data.profiles)
    const sups = signupsRes.data || []
    setSignups(sups)

    const mine = sups.find(s => s.member_id === userId)
    setMySignupId(mine?.id || null)

    // Initialize attendance map from existing data
    const map = {}
    sups.forEach(s => { map[s.id] = s.attended ?? false })
    setAttendanceMap(map)
  }

  // ─── Member: sign up ──────────────────────────────
  const handleSignUp = async () => {
    setSigningUp(true)
    const { data, error } = await supabase.from('event_signups').insert({
      event_id: id,
      member_id: currentUser.id,
    }).select('id').single()
    if (!error) {
      setMySignupId(data.id)
      await loadEvent(currentUser.id)
    }
    setSigningUp(false)
  }

  // ─── Member: cancel signup ────────────────────────
  const handleCancelSignup = async () => {
    if (!mySignupId) return
    setCancelling(true)
    await supabase.from('event_signups').delete().eq('id', mySignupId)
    setMySignupId(null)
    await loadEvent(currentUser.id)
    setCancelling(false)
  }

  // ─── Org: mark event complete ─────────────────────
  const handleMarkComplete = async () => {
    setCompleting(true)
    await supabase.from('events').update({ status: 'completed' }).eq('id', id)
    setEvent(prev => ({ ...prev, status: 'completed' }))
    setCompleting(false)
  }

  // ─── Org: save attendance toggle ──────────────────
  const toggleAttendance = (signupId, value) => {
    setAttendanceMap(prev => ({ ...prev, [signupId]: value }))
  }

  const saveAttendanceAndAward = async () => {
    setAwardingHours(true)
    setAwardError(null)

    // Persist attended flags
    await Promise.all(
      signups.map(s =>
        supabase.from('event_signups').update({ attended: attendanceMap[s.id] ?? false }).eq('id', s.id)
      )
    )

    // Award hours to attended members
    const attended = signups.filter(s => attendanceMap[s.id] === true)
    let failed = 0
    for (const signup of attended) {
      const { error } = await supabase.rpc('award_event_hours', {
        p_to_user: signup.member_id,
        p_amount: event.hours_awarded,
        p_event_id: id,
      })
      if (error) { console.error('[award_event_hours] error:', error); failed++ }
    }

    if (failed > 0) {
      setAwardError(`${failed} award(s) failed. Check console for details.`)
      setAwardingHours(false)
      return
    }

    // Mark hours as finalized
    await supabase.from('events').update({ hours_finalized: true }).eq('id', id)
    setEvent(prev => ({ ...prev, hours_finalized: true }))
    setAwardSuccess(true)
    setAwardingHours(false)
    await loadEvent(currentUser.id)
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#94B7A2' }}>Loading...</p>
    </main>
  )

  if (!event) return null

  const isOrg = accountType === 'organization' && currentUser?.id === event.org_id
  const isMember = accountType === 'member'
  const isOpen = event.status === 'open'
  const isCompleted = event.status === 'completed'

  const statusBadgeStyle = isOpen
    ? { backgroundColor: '#EBF5F0', color: '#237371' }
    : isCompleted
      ? { backgroundColor: '#F5F5F3', color: '#94B7A2' }
      : { backgroundColor: '#fdf0ef', color: '#c0392b' }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', color: '#2A272A' }}>

      <nav style={{ borderBottom: '1px solid #E0E0DC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2.5rem', backgroundColor: '#FEFFFF' }}>
        {isOrg ? (
          <Link href="/org-dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            <Image src="/acc-logo.png" alt="ACC Logo" width={40} height={40} />
            <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.1rem', fontWeight: 700, color: '#2A272A' }}>ACC Timebank</span>
          </Link>
        ) : (
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            <Image src="/acc-logo.png" alt="ACC Logo" width={40} height={40} />
            <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.1rem', fontWeight: 700, color: '#2A272A' }}>ACC Timebank</span>
          </Link>
        )}
        {isOrg ? (
          <div className="nav-links">
            <Link href="/events" style={{ color: '#94B7A2', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>Events</Link>
            <Link href="/org-dashboard" style={{ color: '#94B7A2', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>Dashboard</Link>
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
              style={{ color: '#94B7A2', fontSize: '0.875rem', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              Log Out
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <NavLinks userId={currentUser?.id} />
          </div>
        )}
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '3rem 1.5rem' }}>

        {/* Breadcrumb */}
        <p style={{ fontSize: '0.8rem', color: '#94B7A2', marginBottom: '1.5rem' }}>
          <Link href="/events" style={{ color: '#237371', textDecoration: 'none', fontWeight: 600 }}>Events</Link>
          {' '} / {event.title}
        </p>

        {/* Event Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#237371', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{event.category}</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.7rem', borderRadius: '9999px', ...statusBadgeStyle }}>
              {event.status}
            </span>
            {event.hours_finalized && (
              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.7rem', borderRadius: '9999px', backgroundColor: '#EBF5F0', color: '#237371' }}>
                ✓ Hours Finalized
              </span>
            )}
          </div>
          <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>{event.title}</h1>
          <p style={{ color: '#94B7A2', fontSize: '0.875rem' }}>
            Hosted by{' '}
            <Link href={`/profile/${event.org_id}`} style={{ color: '#237371', fontWeight: 700, textDecoration: 'none' }}>
              {org?.full_name || org?.username}
            </Link>
          </p>
        </div>

        {/* Event Meta */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '2rem' }}>
          <div style={{ backgroundColor: '#EBF5F0', borderRadius: '0.75rem', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.25rem' }}>⭐</span>
            <div>
              <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.5rem', fontWeight: 700, color: '#237371', lineHeight: 1 }}>{event.hours_awarded}</p>
              <p style={{ color: '#237371', fontSize: '0.72rem', fontWeight: 600 }}>hrs per attendee</p>
            </div>
          </div>
          {event.event_date && (
            <div style={{ backgroundColor: '#F5F5F3', borderRadius: '0.75rem', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.25rem' }}>📅</span>
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#2A272A' }}>{formatDate(event.event_date)}</p>
              </div>
            </div>
          )}
          {event.location && (
            <div style={{ backgroundColor: '#F5F5F3', borderRadius: '0.75rem', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.25rem' }}>📍</span>
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#2A272A' }}>{event.location}</p>
            </div>
          )}
        </div>

        {/* Description */}
        <div style={{ backgroundColor: '#F5F5F3', borderRadius: '1rem', padding: '1.5rem', marginBottom: '2rem' }}>
          <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#2A272A', whiteSpace: 'pre-wrap' }}>{event.description}</p>
        </div>

        {/* ─── MEMBER ACTIONS ──────────────────────────── */}
        {isMember && isOpen && (
          <div style={{ marginBottom: '2rem' }}>
            {mySignupId ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.25rem', backgroundColor: '#EBF5F0', color: '#237371', fontWeight: 700, borderRadius: '9999px', fontSize: '0.875rem', border: '1px solid #94B7A2' }}>
                  ✓ Signed Up
                </span>
                <button
                  onClick={handleCancelSignup}
                  disabled={cancelling}
                  style={{ padding: '0.6rem 1.25rem', backgroundColor: 'transparent', color: '#94B7A2', fontWeight: 600, borderRadius: '9999px', border: '1px solid #E0E0DC', cursor: 'pointer', fontSize: '0.875rem' }}
                >
                  {cancelling ? 'Cancelling…' : 'Cancel Signup'}
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignUp}
                disabled={signingUp}
                style={{ padding: '0.875rem 2.5rem', backgroundColor: signingUp ? '#E0E0DC' : '#237371', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.75rem', border: 'none', cursor: signingUp ? 'not-allowed' : 'pointer', fontSize: '0.95rem' }}
              >
                {signingUp ? 'Signing up…' : 'Sign Up for This Event'}
              </button>
            )}
          </div>
        )}

        {/* ─── ORG ACTIONS ─────────────────────────────── */}
        {isOrg && isOpen && (
          <div style={{ marginBottom: '2rem' }}>
            <button
              onClick={handleMarkComplete}
              disabled={completing || signups.length === 0}
              style={{ padding: '0.875rem 2rem', backgroundColor: completing ? '#E0E0DC' : '#2A272A', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.75rem', border: 'none', cursor: completing ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}
            >
              {completing ? 'Marking Complete…' : 'Mark Event as Complete'}
            </button>
            {signups.length === 0 && (
              <p style={{ color: '#94B7A2', fontSize: '0.78rem', marginTop: '0.5rem' }}>No sign-ups yet — the event can be completed once members sign up.</p>
            )}
          </div>
        )}

        {/* ─── SIGNUP LIST ─────────────────────────────── */}
        <div>
          <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>
            Sign-ups <span style={{ color: '#94B7A2', fontSize: '1rem', fontWeight: 400 }}>({signups.length})</span>
          </h2>

          {signups.length === 0 ? (
            <p style={{ color: '#94B7A2', fontSize: '0.875rem' }}>No one has signed up yet. Be the first!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {signups.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F5F5F3', borderRadius: '0.75rem', padding: '0.75rem 1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <Link href={`/profile/${s.member_id}`} style={{ fontWeight: 600, fontSize: '0.875rem', color: '#2A272A', textDecoration: 'none' }}>
                    {s.profiles?.full_name || s.profiles?.username || 'Member'}
                  </Link>
                  {/* Org: attendance toggles after event completed */}
                  {isOrg && isCompleted && !event.hours_finalized && (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        onClick={() => toggleAttendance(s.id, true)}
                        style={{ padding: '0.35rem 0.75rem', borderRadius: '0.4rem', fontSize: '0.78rem', fontWeight: 600, border: '2px solid', cursor: 'pointer', backgroundColor: attendanceMap[s.id] === true ? '#EBF5F0' : '#F5F5F3', borderColor: attendanceMap[s.id] === true ? '#237371' : '#E0E0DC', color: attendanceMap[s.id] === true ? '#237371' : '#94B7A2' }}
                      >
                        ✓ Attended
                      </button>
                      <button
                        onClick={() => toggleAttendance(s.id, false)}
                        style={{ padding: '0.35rem 0.75rem', borderRadius: '0.4rem', fontSize: '0.78rem', fontWeight: 600, border: '2px solid', cursor: 'pointer', backgroundColor: attendanceMap[s.id] === false ? '#fdf0ef' : '#F5F5F3', borderColor: attendanceMap[s.id] === false ? '#c0392b' : '#E0E0DC', color: attendanceMap[s.id] === false ? '#c0392b' : '#94B7A2' }}
                      >
                        ✗ Did Not Attend
                      </button>
                    </div>
                  )}
                  {/* Show finalized attendance */}
                  {isCompleted && event.hours_finalized && s.attended !== null && (
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '9999px', backgroundColor: s.attended ? '#EBF5F0' : '#F5F5F3', color: s.attended ? '#237371' : '#94B7A2' }}>
                      {s.attended ? '✓ Attended' : '✗ Did Not Attend'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Org: submit attendance and award hours */}
          {isOrg && isCompleted && !event.hours_finalized && signups.length > 0 && (
            <div style={{ backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC', borderRadius: '1rem', padding: '1.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Finalize Attendance & Award Hours</h3>
              <p style={{ color: '#94B7A2', fontSize: '0.8rem', marginBottom: '1rem' }}>
                Mark attendance above, then click below to award {event.hours_awarded} hour{event.hours_awarded !== 1 ? 's' : ''} to each attended member.
                <strong style={{ color: '#c0392b' }}> This cannot be undone.</strong>
              </p>
              <p style={{ color: '#2A272A', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem' }}>
                {Object.values(attendanceMap).filter(Boolean).length} of {signups.length} members marked as attended
                = {Object.values(attendanceMap).filter(Boolean).length * event.hours_awarded} hours total
              </p>

              {awardError && (
                <p style={{ color: '#c0392b', fontSize: '0.8rem', backgroundColor: '#fdf0ef', border: '1px solid #f5c6c2', borderRadius: '0.5rem', padding: '0.6rem 0.875rem', marginBottom: '1rem' }}>
                  {awardError}
                </p>
              )}

              <button
                onClick={saveAttendanceAndAward}
                disabled={awardingHours}
                style={{ padding: '0.875rem 2rem', backgroundColor: awardingHours ? '#E0E0DC' : '#237371', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', border: 'none', cursor: awardingHours ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}
              >
                {awardingHours ? 'Awarding Hours…' : `Award Hours to Attended Members`}
              </button>
            </div>
          )}

          {awardSuccess && (
            <div style={{ backgroundColor: '#EBF5F0', border: '1px solid #94B7A2', borderRadius: '1rem', padding: '1.25rem', marginTop: '1rem' }}>
              <p style={{ color: '#237371', fontWeight: 700, fontSize: '0.875rem' }}>
                ✓ Hours successfully awarded to all attended members!
              </p>
            </div>
          )}
        </div>

      </div>
    </main>
  )
}
