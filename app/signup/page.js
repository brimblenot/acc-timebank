'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

const SKILLS = [
  'Cooking & Meals', 'Transportation', 'Home Repair', 'Gardening & Yard Work',
  'Tech Help', 'Childcare', 'Pet Care', 'Tutoring & Education',
  'Errands & Shopping', 'Translation', 'Healthcare Support',
  'Music & Arts', 'Sewing & Crafts', 'Emotional Support', 'Other',
]

export default function Signup() {
  const router = useRouter()
  const [tab, setTab] = useState('member') // 'member' | 'organization'

  // Member fields
  const [memberForm, setMemberForm] = useState({ fullName: '', username: '', email: '', password: '' })
  const [selectedSkills, setSelectedSkills] = useState([])
  const [showCompliments, setShowCompliments] = useState(true)

  // Org fields
  const [orgForm, setOrgForm] = useState({ orgName: '', username: '', email: '', password: '', description: '' })
  const [orgSuccess, setOrgSuccess] = useState(false)

  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const toggleSkill = (skill) => {
    setSelectedSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill])
  }

  // ─── Member signup ────────────────────────────────────
  const handleMemberSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user }, error: authErr } = await supabase.auth.signUp({
      email: memberForm.email,
      password: memberForm.password,
      options: { data: { username: memberForm.username, full_name: memberForm.fullName } },
    })

    if (authErr) { setError(authErr.message); setLoading(false); return }

    if (user && (selectedSkills.length > 0 || !showCompliments)) {
      setTimeout(async () => {
        const updates = {}
        if (selectedSkills.length > 0) updates.skills = selectedSkills
        if (!showCompliments) updates.show_compliments = false
        await supabase.from('profiles').update(updates).eq('id', user.id)
      }, 600)
    }

    router.push('/dashboard')
  }

  // ─── Org signup ───────────────────────────────────────
  const handleOrgSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user }, error: authErr } = await supabase.auth.signUp({
      email: orgForm.email,
      password: orgForm.password,
      options: { data: { username: orgForm.username, full_name: orgForm.orgName } },
    })

    if (authErr) { setError(authErr.message); setLoading(false); return }

    if (user) {
      // Wait briefly for the trigger to create the profile row, then update it
      await new Promise(r => setTimeout(r, 800))
      await supabase.from('profiles').update({
        account_type: 'organization',
        org_status: 'pending',
        bio: orgForm.description,
        full_name: orgForm.orgName,
        username: orgForm.username,
      }).eq('id', user.id)
    }

    setOrgSuccess(true)
    setLoading(false)
  }

  const inputStyle = {
    width: '100%', backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC',
    borderRadius: '0.5rem', padding: '0.75rem 1rem', fontSize: '0.875rem',
    color: '#2A272A', outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle = { fontSize: '0.8rem', color: '#2A272A', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', color: '#2A272A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>

      <Link href="/" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', marginBottom: '2rem' }}>
        <Image src="/acc-logo.png" alt="ACC Logo" width={70} height={70} />
        <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.3rem', fontWeight: 700, color: '#2A272A', marginTop: '0.5rem' }}>
          Alachua Community Collective
        </span>
        <span style={{ color: '#237371', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600 }}>
          A Mutual Aid Network
        </span>
      </Link>

      <div style={{ width: '100%', maxWidth: '440px', backgroundColor: '#FEFFFF', border: '1px solid #E0E0DC', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 4px 24px rgba(42,39,42,0.08)' }}>

        {/* Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #E0E0DC' }}>
          {['member', 'organization'].map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null) }}
              style={{
                padding: '0.875rem',
                fontSize: '0.875rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                textTransform: 'capitalize',
                backgroundColor: tab === t ? '#FEFFFF' : '#F5F5F3',
                color: tab === t ? '#237371' : '#94B7A2',
                borderBottom: tab === t ? '2px solid #237371' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              {t === 'member' ? 'Member' : 'Organization'}
            </button>
          ))}
        </div>

        <div style={{ padding: '2rem' }}>

          {tab === 'member' ? (
            <>
              <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                Create your account
              </h1>
              <p style={{ color: '#94B7A2', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Join the Alachua community exchange
              </p>

              <form onSubmit={handleMemberSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <input name="fullName" type="text" required value={memberForm.fullName}
                    onChange={e => setMemberForm(p => ({ ...p, fullName: e.target.value }))}
                    placeholder="Jane Smith" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Username</label>
                  <input name="username" type="text" required value={memberForm.username}
                    onChange={e => setMemberForm(p => ({ ...p, username: e.target.value }))}
                    placeholder="janesmith" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input name="email" type="email" required value={memberForm.email}
                    onChange={e => setMemberForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="jane@email.com" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Password</label>
                  <input name="password" type="password" required value={memberForm.password}
                    onChange={e => setMemberForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="Min. 6 characters" style={inputStyle} />
                </div>

                <div>
                  <label style={{ ...labelStyle, marginBottom: '0.5rem' }}>
                    Skills I can offer <span style={{ color: '#94B7A2', fontWeight: 400 }}>(optional)</span>
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {SKILLS.map(skill => (
                      <button key={skill} type="button" onClick={() => toggleSkill(skill)}
                        style={{ padding: '0.35rem 0.75rem', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: selectedSkills.includes(skill) ? '#237371' : '#F5F5F3', color: selectedSkills.includes(skill) ? '#FEFFFF' : '#2A272A' }}>
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={showCompliments} onChange={e => setShowCompliments(e.target.checked)}
                    style={{ marginTop: '0.15rem', accentColor: '#237371', width: '16px', height: '16px', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>Show compliments I receive on my public profile</span>
                </label>

                {error && <p style={{ color: '#c0392b', fontSize: '0.875rem', backgroundColor: '#fdf0ef', border: '1px solid #f5c6c2', borderRadius: '0.5rem', padding: '0.75rem 1rem' }}>{error}</p>}

                <button type="submit" disabled={loading}
                  style={{ width: '100%', backgroundColor: loading ? '#E0E0DC' : '#237371', color: '#FEFFFF', fontWeight: 700, padding: '0.875rem', borderRadius: '0.5rem', border: 'none', fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '0.25rem' }}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>
            </>
          ) : orgSuccess ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏛️</div>
              <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                Application Submitted
              </h2>
              <p style={{ color: '#94B7A2', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Your organization account is <strong style={{ color: '#D4A017' }}>pending admin approval</strong>.
                You will receive a notification once your account has been reviewed.
                This usually takes 1–2 business days.
              </p>
              <Link href="/login"
                style={{ display: 'inline-block', padding: '0.75rem 2rem', backgroundColor: '#237371', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.875rem' }}>
                Back to Login
              </Link>
            </div>
          ) : (
            <>
              <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                Register your organization
              </h1>
              <p style={{ color: '#94B7A2', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Organizations can host community events and award hours to members.
              </p>

              <form onSubmit={handleOrgSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Organization Name</label>
                  <input type="text" required value={orgForm.orgName}
                    onChange={e => setOrgForm(p => ({ ...p, orgName: e.target.value }))}
                    placeholder="Gainesville Food Bank" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Username</label>
                  <input type="text" required value={orgForm.username}
                    onChange={e => setOrgForm(p => ({ ...p, username: e.target.value }))}
                    placeholder="gvlfoodbank" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input type="email" required value={orgForm.email}
                    onChange={e => setOrgForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="contact@org.org" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Password</label>
                  <input type="password" required value={orgForm.password}
                    onChange={e => setOrgForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="Min. 6 characters" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>
                    About your organization <span style={{ color: '#c0392b' }}>*</span>
                  </label>
                  <textarea required value={orgForm.description}
                    onChange={e => setOrgForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Briefly describe your organization and how you plan to engage with the community..."
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
                </div>

                {error && <p style={{ color: '#c0392b', fontSize: '0.875rem', backgroundColor: '#fdf0ef', border: '1px solid #f5c6c2', borderRadius: '0.5rem', padding: '0.75rem 1rem' }}>{error}</p>}

                <p style={{ fontSize: '0.78rem', color: '#94B7A2', lineHeight: 1.5 }}>
                  Organization accounts require admin approval before you can log in and create events.
                </p>

                <button type="submit" disabled={loading}
                  style={{ width: '100%', backgroundColor: loading ? '#E0E0DC' : '#237371', color: '#FEFFFF', fontWeight: 700, padding: '0.875rem', borderRadius: '0.5rem', border: 'none', fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer' }}>
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>
              </form>
            </>
          )}

          <p style={{ textAlign: 'center', color: '#94B7A2', fontSize: '0.875rem', marginTop: '1.5rem' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#237371', fontWeight: 600, textDecoration: 'none' }}>Log in</Link>
          </p>
        </div>
      </div>

    </main>
  )
}
