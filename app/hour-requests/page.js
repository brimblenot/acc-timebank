'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import NavLinks from '../components/NavLinks'

function StatusBadge({ status }) {
  const styles = {
    pending:  { backgroundColor: '#FEF9E7', color: '#D4A017', borderColor: '#D4A017' },
    approved: { backgroundColor: '#E8F4F3', color: '#237371', borderColor: '#237371' },
    declined: { backgroundColor: '#FDF2F2', color: '#c0392b', borderColor: '#c0392b' },
  }
  const labels = { pending: 'Pending', approved: 'Approved', declined: 'Declined' }
  const s = styles[status] || styles.pending
  return (
    <span style={{
      fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem',
      borderRadius: '9999px', border: '1px solid',
      ...s
    }}>
      {labels[status] || status}
    </span>
  )
}

function timeAgo(dateStr) {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function HourRequestsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState(null)
  const [viewerBalance, setViewerBalance] = useState(0)
  const [incoming, setIncoming] = useState([])
  const [outgoing, setOutgoing] = useState([])
  const [profileMap, setProfileMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('incoming')
  const [actioning, setActioning] = useState(null) // request id being actioned
  const [actionError, setActionError] = useState(null)
  const ch1Ref = useRef(null)
  const ch2Ref = useRef(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      await fetchAll(user.id)
      subscribeRealtime(user.id)
    }
    init()
    return () => {
      if (ch1Ref.current) supabase.removeChannel(ch1Ref.current)
      if (ch2Ref.current) supabase.removeChannel(ch2Ref.current)
    }
  }, [])

  const fetchAll = async (uid) => {
    const [incomingRes, outgoingRes, profileRes] = await Promise.all([
      supabase.from('hour_requests').select('*').eq('to_user_id', uid).eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('hour_requests').select('*').eq('from_user_id', uid).order('created_at', { ascending: false }),
      supabase.from('profiles').select('hour_balance').eq('id', uid).single(),
    ])

    const inc = incomingRes.data || []
    const out = outgoingRes.data || []

    setIncoming(inc)
    setOutgoing(out)
    setViewerBalance(profileRes.data?.hour_balance ?? 0)

    // Fetch profile names for all referenced users
    const ids = [...new Set([...inc.map(r => r.from_user_id), ...out.map(r => r.to_user_id)])]
    if (ids.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, username').in('id', ids)
      const map = {}
      profiles?.forEach(p => { map[p.id] = p.full_name || p.username || 'Community Member' })
      setProfileMap(map)
    }

    setLoading(false)
  }

  const subscribeRealtime = (uid) => {
    if (ch1Ref.current) supabase.removeChannel(ch1Ref.current)
    if (ch2Ref.current) supabase.removeChannel(ch2Ref.current)

    ch1Ref.current = supabase
      .channel('hr-incoming')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hour_requests', filter: `to_user_id=eq.${uid}` },
        () => fetchAll(uid))
      .subscribe()

    ch2Ref.current = supabase
      .channel('hr-outgoing')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hour_requests', filter: `from_user_id=eq.${uid}` },
        () => fetchAll(uid))
      .subscribe()
  }

  const handleApprove = async (request) => {
    setActionError(null)
    if (viewerBalance - request.amount < -5) {
      setActionError(`Insufficient balance — approving this would bring you below −5 hours. (Your balance: ${viewerBalance} hrs)`)
      return
    }
    setActioning(request.id)

    const { error: rpcError } = await supabase.rpc('transfer_hours_for_request', {
      from_user: userId,
      to_user: request.from_user_id,
      amount: request.amount,
    })

    if (rpcError) {
      setActionError(rpcError.message)
      setActioning(null)
      return
    }

    await supabase.from('hour_requests').update({ status: 'approved' }).eq('id', request.id)
    setViewerBalance(prev => prev - request.amount)
    setIncoming(prev => prev.filter(r => r.id !== request.id))
    setActioning(null)
  }

  const handleDecline = async (requestId) => {
    setActionError(null)
    setActioning(requestId)
    await supabase.from('hour_requests').update({ status: 'declined' }).eq('id', requestId)
    setIncoming(prev => prev.filter(r => r.id !== requestId))
    setActioning(null)
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#94B7A2' }}>Loading...</p>
    </main>
  )

  const tabStyle = (tab) => ({
    padding: '0.6rem 1.5rem',
    fontWeight: 700,
    fontSize: '0.875rem',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    backgroundColor: activeTab === tab ? '#237371' : 'transparent',
    color: activeTab === tab ? '#FEFFFF' : '#94B7A2',
    transition: 'all 0.15s',
  })

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', color: '#2A272A' }}>

      <nav style={{ borderBottom: '1px solid #E0E0DC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2.5rem', backgroundColor: '#FEFFFF' }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <Image src="/acc-logo.png" alt="ACC Logo" width={40} height={40} />
          <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.2rem', fontWeight: 700, color: '#2A272A' }}>ACC Timebank</span>
        </Link>
        <NavLinks userId={userId} />
      </nav>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '3rem 1.5rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '2.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>Hour Requests</h1>
          <p style={{ color: '#94B7A2', fontSize: '0.875rem' }}>
            Your balance: <strong style={{ color: '#237371' }}>{viewerBalance} hrs</strong>
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.25rem', backgroundColor: '#F5F5F3', borderRadius: '0.625rem', padding: '0.25rem', marginBottom: '1.75rem', width: 'fit-content' }}>
          <button style={tabStyle('incoming')} onClick={() => setActiveTab('incoming')}>
            Incoming {incoming.length > 0 && <span style={{ marginLeft: '0.35rem', backgroundColor: '#FEFFFF', color: '#237371', borderRadius: '9999px', fontSize: '0.65rem', fontWeight: 800, padding: '1px 6px' }}>{incoming.length}</span>}
          </button>
          <button style={tabStyle('outgoing')} onClick={() => setActiveTab('outgoing')}>
            Outgoing
          </button>
        </div>

        {/* Error banner */}
        {actionError && (
          <div style={{ backgroundColor: '#fdf0ef', border: '1px solid #f5c6c2', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1.25rem', color: '#c0392b', fontSize: '0.875rem' }}>
            {actionError}
            <button onClick={() => setActionError(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: '#c0392b', fontWeight: 700, lineHeight: 1 }}>✕</button>
          </div>
        )}

        {/* Incoming tab */}
        {activeTab === 'incoming' && (
          <div>
            {incoming.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94B7A2' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⏳</div>
                <p style={{ fontWeight: 600 }}>No pending requests</p>
                <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>When someone requests hours from you, they'll appear here.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {incoming.map(req => {
                  const name = profileMap[req.from_user_id] || 'Community Member'
                  const isActioning = actioning === req.id
                  return (
                    <div key={req.id} style={{ backgroundColor: '#FEFFFF', border: '1px solid #E0E0DC', borderRadius: '1rem', padding: '1.25rem 1.5rem', boxShadow: '0 2px 8px rgba(42,39,42,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div>
                          <Link href={`/profile/${req.from_user_id}`} style={{ fontWeight: 700, fontSize: '0.9rem', color: '#2A272A', textDecoration: 'none' }}>
                            {name}
                          </Link>
                          <p style={{ color: '#94B7A2', fontSize: '0.75rem', marginTop: '0.1rem' }}>{timeAgo(req.created_at)}</p>
                        </div>
                        <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.5rem', fontWeight: 700, color: '#237371' }}>
                          {req.amount} hr{req.amount !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {req.message && (
                        <p style={{ fontSize: '0.875rem', color: '#2A272A', backgroundColor: '#F5F5F3', borderRadius: '0.5rem', padding: '0.6rem 0.875rem', marginBottom: '1rem', lineHeight: 1.5 }}>
                          "{req.message}"
                        </p>
                      )}

                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: req.message ? 0 : '0.875rem' }}>
                        <button
                          onClick={() => handleApprove(req)}
                          disabled={isActioning}
                          style={{ flex: 1, padding: '0.7rem', backgroundColor: isActioning ? '#E0E0DC' : '#237371', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', border: 'none', cursor: isActioning ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}
                        >
                          {isActioning ? 'Processing...' : `Approve & Send ${req.amount} hr${req.amount !== 1 ? 's' : ''}`}
                        </button>
                        <button
                          onClick={() => handleDecline(req.id)}
                          disabled={isActioning}
                          style={{ padding: '0.7rem 1.25rem', backgroundColor: '#F5F5F3', color: '#2A272A', fontWeight: 600, borderRadius: '0.5rem', border: '1px solid #E0E0DC', cursor: isActioning ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Outgoing tab */}
        {activeTab === 'outgoing' && (
          <div>
            {outgoing.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94B7A2' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⏱️</div>
                <p style={{ fontWeight: 600 }}>No outgoing requests</p>
                <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Visit a member's profile to request hours from them.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {outgoing.map(req => {
                  const name = profileMap[req.to_user_id] || 'Community Member'
                  return (
                    <div key={req.id} style={{ backgroundColor: '#FEFFFF', border: '1px solid #E0E0DC', borderRadius: '1rem', padding: '1.25rem 1.5rem', boxShadow: '0 2px 8px rgba(42,39,42,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: req.message ? '0.5rem' : 0 }}>
                        <div>
                          <Link href={`/profile/${req.to_user_id}`} style={{ fontWeight: 700, fontSize: '0.9rem', color: '#2A272A', textDecoration: 'none' }}>
                            {name}
                          </Link>
                          <p style={{ color: '#94B7A2', fontSize: '0.75rem', marginTop: '0.1rem' }}>{timeAgo(req.created_at)}</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                          <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.5rem', fontWeight: 700, color: '#237371' }}>
                            {req.amount} hr{req.amount !== 1 ? 's' : ''}
                          </span>
                          <StatusBadge status={req.status} />
                        </div>
                      </div>

                      {req.message && (
                        <p style={{ fontSize: '0.875rem', color: '#2A272A', backgroundColor: '#F5F5F3', borderRadius: '0.5rem', padding: '0.6rem 0.875rem', lineHeight: 1.5 }}>
                          "{req.message}"
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  )
}
