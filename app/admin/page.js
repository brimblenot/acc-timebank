'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

const DURATION_OPTIONS = [
  { label: '1 Hour', value: '1h', ms: 60 * 60 * 1000 },
  { label: '6 Hours', value: '6h', ms: 6 * 60 * 60 * 1000 },
  { label: '24 Hours', value: '24h', ms: 24 * 60 * 60 * 1000 },
  { label: '3 Days', value: '3d', ms: 3 * 24 * 60 * 60 * 1000 },
  { label: '1 Week', value: '1w', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: '1 Month', value: '1mo', ms: 30 * 24 * 60 * 60 * 1000 },
  { label: 'Permanent', value: 'permanent', ms: null },
]

function getSuspendedUntil(value) {
  if (value === 'permanent') return '9999-12-31T23:59:59Z'
  const opt = DURATION_OPTIONS.find(o => o.value === value)
  return new Date(Date.now() + opt.ms).toISOString()
}

function isPermanent(ts) {
  return new Date(ts).getFullYear() > 2100
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatDateTime(ts) {
  return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ─── Section header ───────────────────────────────────
function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.75rem', fontWeight: 700, color: '#2A272A', marginBottom: '0.15rem' }}>{title}</h2>
      {subtitle && <p style={{ color: '#94B7A2', fontSize: '0.875rem' }}>{subtitle}</p>}
    </div>
  )
}

// ─── Search input ─────────────────────────────────────
function SearchInput({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: '100%', maxWidth: '360px', backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC', borderRadius: '0.5rem', padding: '0.6rem 1rem', fontSize: '0.875rem', color: '#2A272A', outline: 'none', boxSizing: 'border-box', marginBottom: '1rem' }}
    />
  )
}

// ─── Modal wrapper ────────────────────────────────────
function Modal({ onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(42,39,42,0.4)' }} onClick={onClose} />
      <div style={{ position: 'relative', backgroundColor: '#FEFFFF', borderRadius: '1rem', padding: '2rem', width: '100%', maxWidth: '440px', boxShadow: '0 8px 40px rgba(42,39,42,0.15)', border: '1px solid #E0E0DC' }}>
        {children}
      </div>
    </div>
  )
}

// ─── Status badge ─────────────────────────────────────
function StatusBadge({ status }) {
  const configs = {
    open:        { bg: '#EBF5F0', color: '#237371' },
    in_progress: { bg: '#FEF9E7', color: '#D4A017' },
    completed:   { bg: '#F5F5F3', color: '#94B7A2' },
  }
  const c = configs[status] || configs.completed
  return (
    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '9999px', backgroundColor: c.bg, color: c.color, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
      {status?.replace('_', ' ')}
    </span>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const [adminId, setAdminId] = useState(null)
  const [isMasterAdmin, setIsMasterAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  // Posts
  const [posts, setPosts] = useState([])
  const [postsSearch, setPostsSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deletingPost, setDeletingPost] = useState(null)

  // Users
  const [users, setUsers] = useState([])
  const [emailMap, setEmailMap] = useState({})
  const [suspensions, setSuspensions] = useState([])
  const [usersSearch, setUsersSearch] = useState('')
  const [unsuspending, setUnsuspending] = useState(null)

  // Warn modal
  const [warnModal, setWarnModal] = useState(null)
  const [warnReason, setWarnReason] = useState('')
  const [sending, setSending] = useState(false)

  // Suspend modal
  const [suspendModal, setSuspendModal] = useState(null)
  const [suspendDuration, setSuspendDuration] = useState('24h')
  const [suspendReason, setSuspendReason] = useState('')
  const [suspending, setSuspending] = useState(false)

  // Warning history
  const [warnings, setWarnings] = useState([])

  // Manage admins (master admin only)
  const [adminUsers, setAdminUsers] = useState([])
  const [adminSearch, setAdminSearch] = useState('')
  const [makingAdmin, setMakingAdmin] = useState(null)
  const [revokingAdmin, setRevokingAdmin] = useState(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Step 1: verify admin access (only is_admin — safe even if master_admin.sql not yet applied)
      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
      if (!profile?.is_admin) { router.push('/dashboard'); return }

      setAdminId(user.id)

      // Step 2: check master admin status in a separate, guarded query so a missing
      // is_master_admin column (migration not yet applied) does not crash the page.
      const { data: masterProfile, error: masterErr } = await supabase
        .from('profiles')
        .select('is_master_admin')
        .eq('id', user.id)
        .single()
      if (masterErr) {
        console.warn('[admin] is_master_admin unavailable — run supabase/master_admin.sql:', masterErr.message)
      } else {
        console.log('[admin] is_master_admin =', masterProfile?.is_master_admin)
        setIsMasterAdmin(masterProfile?.is_master_admin === true)
      }

      await fetchAll()
      setLoading(false)
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAll = async () => {
    const [postsRes, usersRes, suspensionsRes, warningsRes] = await Promise.all([
      supabase
        .from('service_posts')
        .select('id, title, category, status, created_at, poster_id, profiles!poster_id(full_name, username)')
        .order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('id, full_name, username, created_at')
        .eq('is_admin', false)
        .order('created_at', { ascending: false }),
      supabase
        .from('suspensions')
        .select('*')
        .gt('suspended_until', new Date().toISOString()),
      supabase
        .from('notifications')
        .select('id, message, created_at, user_id')
        .eq('type', 'admin_warning')
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    setPosts(postsRes.data || [])
    setUsers(usersRes.data || [])

    // Fetch current admins separately — guarded in case migration hasn't run yet
    const { data: adminUsersData, error: adminUsersErr } = await supabase
      .from('profiles')
      .select('id, full_name, username, created_at')
      .eq('is_admin', true)
      .eq('is_master_admin', false)
      .order('created_at', { ascending: false })
    if (adminUsersErr) {
      console.warn('[admin] Could not load admin users list:', adminUsersErr.message)
    } else {
      setAdminUsers(adminUsersData || [])
    }
    setSuspensions(suspensionsRes.data || [])

    // Enrich warnings with profile names
    const warnRows = warningsRes.data || []
    const uniqueIds = [...new Set(warnRows.map(w => w.user_id))]
    if (uniqueIds.length > 0) {
      const { data: warnProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .in('id', uniqueIds)
      const profileMap = {}
      ;(warnProfiles || []).forEach(p => { profileMap[p.id] = p })
      setWarnings(warnRows.map(w => ({ ...w, profile: profileMap[w.user_id] })))
    } else {
      setWarnings([])
    }

    // Fetch emails via admin RPC
    const { data: emailRows } = await supabase.rpc('get_user_emails_for_admin')
    if (emailRows) {
      const map = {}
      emailRows.forEach(r => { map[r.user_id] = r.email })
      setEmailMap(map)
    }
  }

  // ─── Post actions ─────────────────────────────────

  const handleDeletePost = async (postId) => {
    setDeletingPost(postId)
    const { data: apps } = await supabase.from('applications').select('id').eq('post_id', postId)
    if (apps?.length > 0) {
      await supabase.from('messages').delete().in('application_id', apps.map(a => a.id))
    }
    await supabase.from('applications').delete().eq('post_id', postId)
    await supabase.from('service_posts').delete().eq('id', postId)
    setPosts(prev => prev.filter(p => p.id !== postId))
    setDeleteConfirm(null)
    setDeletingPost(null)
  }

  // ─── Warn action ──────────────────────────────────

  const handleWarn = async () => {
    if (!warnReason.trim() || !warnModal) return
    setSending(true)
    await supabase.from('notifications').insert({
      user_id: warnModal.userId,
      type: 'admin_warning',
      message: `You have received a warning from a moderator: ${warnReason.trim()}`,
    })
    // Refresh warnings list
    const { data: warnRows } = await supabase
      .from('notifications')
      .select('id, message, created_at, user_id')
      .eq('type', 'admin_warning')
      .order('created_at', { ascending: false })
      .limit(50)
    const uniqueIds = [...new Set((warnRows || []).map(w => w.user_id))]
    const { data: warnProfiles } = uniqueIds.length
      ? await supabase.from('profiles').select('id, full_name, username').in('id', uniqueIds)
      : { data: [] }
    const profileMap = {}
    ;(warnProfiles || []).forEach(p => { profileMap[p.id] = p })
    setWarnings((warnRows || []).map(w => ({ ...w, profile: profileMap[w.user_id] })))
    setWarnModal(null)
    setWarnReason('')
    setSending(false)
  }

  // ─── Suspend action ───────────────────────────────

  const handleSuspend = async () => {
    if (!suspendReason.trim() || !suspendModal) return
    setSuspending(true)
    await supabase.from('suspensions').insert({
      user_id: suspendModal.userId,
      reason: suspendReason.trim(),
      suspended_until: getSuspendedUntil(suspendDuration),
      suspended_by: adminId,
    })
    const { data } = await supabase
      .from('suspensions')
      .select('*')
      .gt('suspended_until', new Date().toISOString())
    setSuspensions(data || [])
    setSuspendModal(null)
    setSuspendReason('')
    setSuspendDuration('24h')
    setSuspending(false)
  }

  // ─── Unsuspend action ─────────────────────────────

  const handleUnsuspend = async (userId) => {
    setUnsuspending(userId)
    await supabase.from('suspensions').delete().eq('user_id', userId)
    setSuspensions(prev => prev.filter(s => s.user_id !== userId))
    setUnsuspending(null)
  }

  // ─── Make / Revoke admin ─────────────────────────

  const handleMakeAdmin = async (userId) => {
    setMakingAdmin(userId)
    const { error } = await supabase.from('profiles').update({ is_admin: true }).eq('id', userId)
    if (!error) {
      const user = users.find(u => u.id === userId)
      if (user) {
        setAdminUsers(prev => [...prev, user])
        setUsers(prev => prev.filter(u => u.id !== userId))
      }
    }
    setMakingAdmin(null)
  }

  const handleRevokeAdmin = async (userId) => {
    setRevokingAdmin(userId)
    const { error } = await supabase.from('profiles').update({ is_admin: false }).eq('id', userId)
    if (!error) {
      const user = adminUsers.find(u => u.id === userId)
      if (user) {
        setUsers(prev => [user, ...prev])
        setAdminUsers(prev => prev.filter(u => u.id !== userId))
      }
    }
    setRevokingAdmin(null)
  }

  // ─── Filters ──────────────────────────────────────

  const filteredPosts = posts.filter(p => {
    const q = postsSearch.toLowerCase()
    return !q || p.title?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q) ||
      p.profiles?.full_name?.toLowerCase().includes(q) || p.profiles?.username?.toLowerCase().includes(q)
  })

  const filteredUsers = users.filter(u => {
    const q = usersSearch.toLowerCase()
    return !q || u.full_name?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q) ||
      emailMap[u.id]?.toLowerCase().includes(q)
  })

  const filteredAdminSearch = users.filter(u => {
    const q = adminSearch.toLowerCase()
    return !q || u.full_name?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q)
  })

  if (loading) return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#94B7A2' }}>Loading admin panel...</p>
    </main>
  )

  const tdStyle = { padding: '0.875rem 1rem', fontSize: '0.85rem', color: '#2A272A', borderBottom: '1px solid #E0E0DC', verticalAlign: 'middle' }
  const thStyle = { padding: '0.625rem 1rem', fontSize: '0.7rem', fontWeight: 700, color: '#94B7A2', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid #E0E0DC', backgroundColor: '#F5F5F3' }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', color: '#2A272A' }}>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #E0E0DC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2.5rem', backgroundColor: '#FEFFFF' }}>
        <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <Image src="/acc-logo.png" alt="ACC Logo" width={36} height={36} />
          <div>
            <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.1rem', fontWeight: 700, color: '#2A272A', display: 'block', lineHeight: 1.1 }}>ACC Timebank</span>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#c0392b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Admin Panel</span>
          </div>
        </Link>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') localStorage.setItem('adminMode', 'true')
              router.push('/dashboard')
            }}
            style={{ padding: '0.5rem 1.25rem', backgroundColor: '#EBF5F0', color: '#237371', fontWeight: 600, borderRadius: '0.5rem', border: '1px solid #94B7A2', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            Member View
          </button>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
            style={{ padding: '0.5rem 1.25rem', backgroundColor: '#F5F5F3', color: '#2A272A', fontWeight: 600, borderRadius: '0.5rem', border: '1px solid #E0E0DC', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            Log Out
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 1.5rem' }}>

        <div style={{ marginBottom: '3rem' }}>
          <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Admin Panel</h1>
          <p style={{ color: '#94B7A2' }}>Manage posts, users, and community moderation.</p>
        </div>

        {/* ──────────────────────────────────────────────────
            SECTION 1: MANAGE POSTS
        ────────────────────────────────────────────────── */}
        <section style={{ marginBottom: '4rem' }}>
          <SectionHeader title="Manage Posts" subtitle={`${posts.length} total posts across the platform`} />
          <SearchInput value={postsSearch} onChange={setPostsSearch} placeholder="Search by title, category, or poster…" />

          <div style={{ border: '1px solid #E0E0DC', borderRadius: '0.75rem', overflow: 'hidden' }}>
            {filteredPosts.length === 0 ? (
              <p style={{ padding: '2rem', color: '#94B7A2', fontSize: '0.875rem', textAlign: 'center' }}>
                {postsSearch ? 'No posts match your search.' : 'No posts yet.'}
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Title</th>
                      <th style={thStyle}>Category</th>
                      <th style={thStyle}>Posted by</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Date</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPosts.map(post => (
                      <tr key={post.id} style={{ backgroundColor: deleteConfirm === post.id ? '#fdf9f8' : '#FEFFFF' }}>
                        <td style={{ ...tdStyle, fontWeight: 600, maxWidth: '220px' }}>
                          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</span>
                        </td>
                        <td style={{ ...tdStyle, color: '#94B7A2' }}>{post.category}</td>
                        <td style={tdStyle}>
                          <Link href={`/profile/${post.poster_id}`} target="_blank" style={{ color: '#237371', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}>
                            {post.profiles?.full_name || post.profiles?.username || '—'}
                          </Link>
                        </td>
                        <td style={tdStyle}><StatusBadge status={post.status} /></td>
                        <td style={{ ...tdStyle, color: '#94B7A2', whiteSpace: 'nowrap' }}>{formatDate(post.created_at)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {deleteConfirm === post.id ? (
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.75rem', color: '#94B7A2' }}>Confirm delete?</span>
                              <button
                                onClick={() => handleDeletePost(post.id)}
                                disabled={deletingPost === post.id}
                                style={{ padding: '0.3rem 0.75rem', backgroundColor: '#c0392b', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.4rem', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}
                              >
                                {deletingPost === post.id ? '…' : 'Delete'}
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                style={{ padding: '0.3rem 0.6rem', backgroundColor: '#F5F5F3', color: '#94B7A2', fontWeight: 600, borderRadius: '0.4rem', border: '1px solid #E0E0DC', cursor: 'pointer', fontSize: '0.75rem' }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(post.id)}
                              style={{ padding: '0.35rem 0.875rem', backgroundColor: 'transparent', color: '#c0392b', fontWeight: 600, borderRadius: '0.4rem', border: '1px solid #f5c6c2', cursor: 'pointer', fontSize: '0.8rem' }}
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* ──────────────────────────────────────────────────
            SECTION 2: MANAGE USERS
        ────────────────────────────────────────────────── */}
        <section style={{ marginBottom: '4rem' }}>
          <SectionHeader title="Manage Users" subtitle={`${users.length} members`} />
          <SearchInput value={usersSearch} onChange={setUsersSearch} placeholder="Search by name, username, or email…" />

          <div style={{ border: '1px solid #E0E0DC', borderRadius: '0.75rem', overflow: 'hidden' }}>
            {filteredUsers.length === 0 ? (
              <p style={{ padding: '2rem', color: '#94B7A2', fontSize: '0.875rem', textAlign: 'center' }}>
                {usersSearch ? 'No users match your search.' : 'No users yet.'}
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Name</th>
                      <th style={thStyle}>Username</th>
                      <th style={thStyle}>Email</th>
                      <th style={thStyle}>Joined</th>
                      <th style={thStyle}>Status</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => {
                      const susp = suspensions.find(s => s.user_id === user.id)
                      const isSusp = !!susp
                      const perm = isSusp && isPermanent(susp.suspended_until)

                      return (
                        <tr key={user.id} style={{ backgroundColor: isSusp ? '#fdf9f8' : '#FEFFFF' }}>
                          <td style={{ ...tdStyle, fontWeight: 600 }}>
                            <Link href={`/profile/${user.id}`} target="_blank" style={{ color: '#2A272A', textDecoration: 'none' }}>
                              {user.full_name || '—'}
                            </Link>
                          </td>
                          <td style={{ ...tdStyle, color: '#94B7A2' }}>@{user.username || '—'}</td>
                          <td style={{ ...tdStyle, color: '#94B7A2', fontSize: '0.8rem' }}>{emailMap[user.id] || '—'}</td>
                          <td style={{ ...tdStyle, color: '#94B7A2', whiteSpace: 'nowrap' }}>{formatDate(user.created_at)}</td>
                          <td style={tdStyle}>
                            {isSusp ? (
                              <div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '9999px', backgroundColor: '#fdf0ef', color: '#c0392b', border: '1px solid #f5c6c2', display: 'inline-block', marginBottom: '0.2rem' }}>
                                  ● Suspended
                                </span>
                                <p style={{ fontSize: '0.7rem', color: '#94B7A2', margin: 0 }}>
                                  {perm ? 'Permanent' : `Until ${formatDateTime(susp.suspended_until)}`}
                                </p>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '9999px', backgroundColor: '#EBF5F0', color: '#237371' }}>
                                Active
                              </span>
                            )}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => { setWarnModal({ userId: user.id, userName: user.full_name || user.username }); setWarnReason('') }}
                                style={{ padding: '0.35rem 0.875rem', backgroundColor: '#fff4e5', color: '#e67e22', fontWeight: 600, borderRadius: '0.4rem', border: '1px solid #f5c6a0', cursor: 'pointer', fontSize: '0.8rem' }}
                              >
                                Warn
                              </button>
                              {isSusp ? (
                                <button
                                  onClick={() => handleUnsuspend(user.id)}
                                  disabled={unsuspending === user.id}
                                  style={{ padding: '0.35rem 0.875rem', backgroundColor: '#EBF5F0', color: '#237371', fontWeight: 600, borderRadius: '0.4rem', border: '1px solid #94B7A2', cursor: 'pointer', fontSize: '0.8rem' }}
                                >
                                  {unsuspending === user.id ? '…' : 'Unsuspend'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => { setSuspendModal({ userId: user.id, userName: user.full_name || user.username }); setSuspendReason(''); setSuspendDuration('24h') }}
                                  style={{ padding: '0.35rem 0.875rem', backgroundColor: '#fdf0ef', color: '#c0392b', fontWeight: 600, borderRadius: '0.4rem', border: '1px solid #f5c6c2', cursor: 'pointer', fontSize: '0.8rem' }}
                                >
                                  Suspend
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* ──────────────────────────────────────────────────
            SECTION 3: MANAGE ADMINS (master admin only)
        ────────────────────────────────────────────────── */}
        {isMasterAdmin && (
          <section style={{ marginBottom: '4rem' }}>
            <SectionHeader title="Manage Admins" subtitle="Grant or revoke admin access for community members" />

            {/* Current admins */}
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94B7A2', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Current Admins</p>
            <div style={{ border: '1px solid #E0E0DC', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '2rem' }}>
              {adminUsers.length === 0 ? (
                <p style={{ padding: '1.5rem', color: '#94B7A2', fontSize: '0.875rem', textAlign: 'center' }}>No regular admins yet.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Name</th>
                        <th style={thStyle}>Username</th>
                        <th style={thStyle}>Joined</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminUsers.map(u => (
                        <tr key={u.id} style={{ backgroundColor: '#FEFFFF' }}>
                          <td style={{ ...tdStyle, fontWeight: 600 }}>
                            <Link href={`/profile/${u.id}`} target="_blank" style={{ color: '#2A272A', textDecoration: 'none' }}>
                              {u.full_name || '—'}
                            </Link>
                          </td>
                          <td style={{ ...tdStyle, color: '#94B7A2' }}>@{u.username || '—'}</td>
                          <td style={{ ...tdStyle, color: '#94B7A2', whiteSpace: 'nowrap' }}>{formatDate(u.created_at)}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>
                            <button
                              onClick={() => handleRevokeAdmin(u.id)}
                              disabled={revokingAdmin === u.id}
                              style={{ padding: '0.35rem 0.875rem', backgroundColor: '#fdf0ef', color: '#c0392b', fontWeight: 600, borderRadius: '0.4rem', border: '1px solid #f5c6c2', cursor: revokingAdmin === u.id ? 'not-allowed' : 'pointer', fontSize: '0.8rem' }}
                            >
                              {revokingAdmin === u.id ? '…' : 'Revoke Admin'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Grant admin to a regular user */}
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94B7A2', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Grant Admin Access</p>
            <SearchInput value={adminSearch} onChange={setAdminSearch} placeholder="Search by name or username…" />
            <div style={{ border: '1px solid #E0E0DC', borderRadius: '0.75rem', overflow: 'hidden' }}>
              {filteredAdminSearch.length === 0 ? (
                <p style={{ padding: '1.5rem', color: '#94B7A2', fontSize: '0.875rem', textAlign: 'center' }}>
                  {adminSearch ? 'No users match your search.' : 'No regular users found.'}
                </p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Name</th>
                        <th style={thStyle}>Username</th>
                        <th style={thStyle}>Joined</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAdminSearch.map(u => (
                        <tr key={u.id} style={{ backgroundColor: '#FEFFFF' }}>
                          <td style={{ ...tdStyle, fontWeight: 600 }}>
                            <Link href={`/profile/${u.id}`} target="_blank" style={{ color: '#2A272A', textDecoration: 'none' }}>
                              {u.full_name || '—'}
                            </Link>
                          </td>
                          <td style={{ ...tdStyle, color: '#94B7A2' }}>@{u.username || '—'}</td>
                          <td style={{ ...tdStyle, color: '#94B7A2', whiteSpace: 'nowrap' }}>{formatDate(u.created_at)}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>
                            <button
                              onClick={() => handleMakeAdmin(u.id)}
                              disabled={makingAdmin === u.id}
                              style={{ padding: '0.35rem 0.875rem', backgroundColor: '#EBF5F0', color: '#237371', fontWeight: 600, borderRadius: '0.4rem', border: '1px solid #94B7A2', cursor: makingAdmin === u.id ? 'not-allowed' : 'pointer', fontSize: '0.8rem' }}
                            >
                              {makingAdmin === u.id ? '…' : 'Make Admin'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ──────────────────────────────────────────────────
            SECTION 4: WARNING HISTORY
        ────────────────────────────────────────────────── */}
        <section>
          <SectionHeader title="Warning History" subtitle="All warnings sent to members, most recent first" />

          {warnings.length === 0 ? (
            <div style={{ backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC', borderRadius: '0.75rem', padding: '2rem', textAlign: 'center' }}>
              <p style={{ color: '#94B7A2', fontSize: '0.875rem' }}>No warnings have been issued yet.</p>
            </div>
          ) : (
            <div style={{ border: '1px solid #E0E0DC', borderRadius: '0.75rem', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Recipient</th>
                    <th style={thStyle}>Warning</th>
                    <th style={{ ...thStyle, whiteSpace: 'nowrap' }}>Date Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {warnings.map(w => (
                    <tr key={w.id} style={{ backgroundColor: '#FEFFFF' }}>
                      <td style={{ ...tdStyle, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        <Link href={`/profile/${w.user_id}`} target="_blank" style={{ color: '#237371', textDecoration: 'none' }}>
                          {w.profile?.full_name || w.profile?.username || 'Unknown'}
                        </Link>
                      </td>
                      <td style={{ ...tdStyle, color: '#2A272A', maxWidth: '500px' }}>
                        <span style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>{w.message}</span>
                      </td>
                      <td style={{ ...tdStyle, color: '#94B7A2', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                        {formatDateTime(w.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>

      {/* ─── Warn Modal ──────────────────────────────────── */}
      {warnModal && (
        <Modal onClose={() => setWarnModal(null)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#fff4e5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e67e22" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Send Warning</h2>
              <p style={{ color: '#94B7A2', fontSize: '0.8rem', margin: 0 }}>to {warnModal.userName}</p>
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
              Warning reason <span style={{ color: '#c0392b' }}>*</span>
            </label>
            <textarea
              value={warnReason}
              onChange={e => setWarnReason(e.target.value)}
              placeholder="Describe the reason for this warning…"
              rows={4}
              style={{ width: '100%', backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#2A272A', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>

          <p style={{ fontSize: '0.78rem', color: '#94B7A2', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            The user will receive an orange warning notification immediately in their notification bell.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={handleWarn}
              disabled={sending || !warnReason.trim()}
              style={{ flex: 1, padding: '0.875rem', backgroundColor: sending || !warnReason.trim() ? '#E0E0DC' : '#e67e22', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', border: 'none', cursor: sending || !warnReason.trim() ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}
            >
              {sending ? 'Sending…' : 'Send Warning'}
            </button>
            <button
              onClick={() => setWarnModal(null)}
              style={{ padding: '0.875rem 1.25rem', backgroundColor: '#F5F5F3', color: '#2A272A', fontWeight: 600, borderRadius: '0.5rem', border: '1px solid #E0E0DC', cursor: 'pointer', fontSize: '0.875rem' }}
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* ─── Suspend Modal ───────────────────────────────── */}
      {suspendModal && (
        <Modal onClose={() => setSuspendModal(null)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#fdf0ef', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
              </svg>
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Suspend User</h2>
              <p style={{ color: '#94B7A2', fontSize: '0.8rem', margin: 0 }}>{suspendModal.userName}</p>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Duration</label>
            <select
              value={suspendDuration}
              onChange={e => setSuspendDuration(e.target.value)}
              style={{ width: '100%', backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#2A272A', outline: 'none', boxSizing: 'border-box' }}
            >
              {DURATION_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
              Reason <span style={{ color: '#c0392b' }}>*</span>
            </label>
            <textarea
              value={suspendReason}
              onChange={e => setSuspendReason(e.target.value)}
              placeholder="Describe the reason for this suspension…"
              rows={4}
              style={{ width: '100%', backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#2A272A', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={handleSuspend}
              disabled={suspending || !suspendReason.trim()}
              style={{ flex: 1, padding: '0.875rem', backgroundColor: suspending || !suspendReason.trim() ? '#E0E0DC' : '#c0392b', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', border: 'none', cursor: suspending || !suspendReason.trim() ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}
            >
              {suspending ? 'Suspending…' : 'Suspend User'}
            </button>
            <button
              onClick={() => setSuspendModal(null)}
              style={{ padding: '0.875rem 1.25rem', backgroundColor: '#F5F5F3', color: '#2A272A', fontWeight: 600, borderRadius: '0.5rem', border: '1px solid #E0E0DC', cursor: 'pointer', fontSize: '0.875rem' }}
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

    </main>
  )
}
