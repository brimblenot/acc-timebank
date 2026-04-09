'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default function Members() {
  const router = useRouter()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [skillFilter, setSkillFilter] = useState('all')
  const [currentUserId, setCurrentUserId] = useState(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, username, bio, skills, avatar_url, vacation_mode')
        .order('full_name', { ascending: true })
      setMembers(data || [])
      setLoading(false)
    }
    init()
  }, [])

  const allSkills = [...new Set(members.flatMap(m => m.skills || []))].sort()

  const filtered = members.filter(m => {
    const name = (m.full_name || m.username || '').toLowerCase()
    const matchSearch = !search || name.includes(search.toLowerCase()) || (m.bio || '').toLowerCase().includes(search.toLowerCase())
    const matchSkill = skillFilter === 'all' || (m.skills || []).includes(skillFilter)
    return matchSearch && matchSkill
  })

  if (loading) return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#94B7A2' }}>Loading...</p>
    </main>
  )

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', color: '#2A272A' }}>

      <nav style={{ borderBottom: '1px solid #E0E0DC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2.5rem', backgroundColor: '#FEFFFF' }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <Image src="/acc-logo.png" alt="ACC Logo" width={40} height={40} />
          <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.2rem', fontWeight: 700, color: '#2A272A' }}>ACC Timebank</span>
        </Link>
        <Link href="/dashboard" style={{ color: '#94B7A2', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>← Dashboard</Link>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem 1.5rem' }}>

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Community Members</h1>
          <p style={{ color: '#94B7A2' }}>Find members to donate to, request from, or connect with.</p>
        </div>

        {/* Search + skill filter */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by name or bio..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: '1 1 220px', backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC', borderRadius: '0.5rem', padding: '0.65rem 1rem', fontSize: '0.875rem', color: '#2A272A', outline: 'none' }}
          />
          <select
            value={skillFilter}
            onChange={e => setSkillFilter(e.target.value)}
            style={{ backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC', borderRadius: '0.5rem', padding: '0.65rem 1rem', fontSize: '0.875rem', color: '#2A272A', outline: 'none', cursor: 'pointer' }}
          >
            <option value="all">All Skills</option>
            {allSkills.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <p style={{ color: '#94B7A2', textAlign: 'center', padding: '3rem 0' }}>No members found.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            {filtered.map(member => {
              const displayName = member.full_name || member.username
              const initials = displayName?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
              const isMe = member.id === currentUserId
              return (
                <div
                  key={member.id}
                  style={{ backgroundColor: '#FEFFFF', border: '1px solid #E0E0DC', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 2px 8px rgba(42,39,42,0.06)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {member.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={member.avatar_url} alt={displayName} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#237371', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FEFFFF', fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>
                        {initials}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <Link href={`/profile/${member.id}`} style={{ fontWeight: 700, fontSize: '0.95rem', color: '#2A272A', textDecoration: 'none' }}>
                          {displayName}
                        </Link>
                        {member.vacation_mode && (
                          <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '9999px', backgroundColor: '#FEF9E7', color: '#D4A017', border: '1px solid #D4A017' }}>🌴</span>
                        )}
                      </div>
                      {member.username && member.full_name && (
                        <p style={{ color: '#94B7A2', fontSize: '0.75rem' }}>@{member.username}</p>
                      )}
                    </div>
                  </div>

                  {/* Bio */}
                  {member.bio && (
                    <p style={{ color: '#94B7A2', fontSize: '0.8rem', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {member.bio}
                    </p>
                  )}

                  {/* Skills */}
                  {(member.skills || []).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                      {(member.skills || []).slice(0, 4).map(skill => (
                        <span key={skill} style={{ padding: '0.2rem 0.55rem', backgroundColor: '#EBF5F0', color: '#237371', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 600 }}>
                          {skill}
                        </span>
                      ))}
                      {(member.skills || []).length > 4 && (
                        <span style={{ padding: '0.2rem 0.55rem', backgroundColor: '#F5F5F3', color: '#94B7A2', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 600 }}>
                          +{member.skills.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.25rem' }}>
                    <Link
                      href={`/profile/${member.id}`}
                      style={{ flex: 1, textAlign: 'center', padding: '0.5rem', backgroundColor: '#F5F5F3', color: '#2A272A', fontWeight: 600, borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.8rem', border: '1px solid #E0E0DC' }}
                    >
                      View Profile
                    </Link>
                    {!isMe && (
                      <Link
                        href={`/profile/${member.id}`}
                        style={{ flex: 1, textAlign: 'center', padding: '0.5rem', backgroundColor: '#237371', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.8rem' }}
                      >
                        🎁 Donate
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </main>
  )
}
