'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import NavLinks from '../components/NavLinks'

export default function Posts() {
  const router = useRouter()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [currentUserId, setCurrentUserId] = useState(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)
      fetchPosts()
    }
    init()

    // Realtime subscription
    const channel = supabase
      .channel('posts-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'service_posts',
      }, () => {
        fetchPosts()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('service_posts')
      .select(`*, profiles (username, full_name, vacation_mode)`)
      .eq('status', 'open')
      .order('created_at', { ascending: false })

    setPosts(data || [])
    setLoading(false)
  }

  const filtered = filter === 'all' ? posts : posts.filter(p => p.category === filter)
  const categories = ['all', ...new Set(posts.map(p => p.category))]

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', color: '#2A272A' }}>

      <nav style={{ borderBottom: '1px solid #E0E0DC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2.5rem', backgroundColor: '#FEFFFF' }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <Image src="/acc-logo.png" alt="ACC Logo" width={40} height={40} />
          <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.2rem', fontWeight: 700, color: '#2A272A' }}>ACC Timebank</span>
        </Link>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <NavLinks userId={currentUserId} />
        </div>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem 1.5rem' }}>

        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Community Requests</h1>
            <p style={{ color: '#94B7A2', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {posts.length} open requests in your community
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#2FB774', fontWeight: 600 }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2FB774', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                Live
              </span>
            </p>
          </div>
        </div>

        {/* Category Filter */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{ padding: '0.4rem 1rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600, border: 'none', cursor: 'pointer', textTransform: 'capitalize', backgroundColor: filter === cat ? '#237371' : '#F5F5F3', color: filter === cat ? '#FEFFFF' : '#2A272A' }}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: '#94B7A2' }}>Loading posts...</p>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 0' }}>
            <p style={{ color: '#94B7A2', fontSize: '1.125rem', marginBottom: '1rem' }}>No requests yet.</p>
            <Link href="/posts/new" style={{ backgroundColor: '#237371', color: '#FEFFFF', fontWeight: 700, padding: '0.875rem 2rem', borderRadius: '0.75rem', textDecoration: 'none' }}>
              Be the first to post
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filtered.map(post => (
              <Link
                key={post.id}
                href={`/posts/${post.id}`}
                style={{ backgroundColor: '#FEFFFF', border: '1px solid #E0E0DC', borderRadius: '1rem', padding: '1.5rem', textDecoration: 'none', color: '#2A272A', boxShadow: '0 2px 8px rgba(42,39,42,0.06)', display: 'block', transition: 'border-color 0.2s' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#237371', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{post.category}</span>
                    {post.profiles?.vacation_mode && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: '9999px', backgroundColor: '#FEF9E7', color: '#D4A017', border: '1px solid #D4A017' }}>🌴 On Vacation</span>
                    )}
                  </div>
                    <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>{post.title}</h2>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1rem' }}>
                    <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: '2rem', fontWeight: 700, color: '#237371', lineHeight: 1 }}>{post.hours_required}<span style={{ fontSize: '0.9rem', fontWeight: 600, marginLeft: '0.2rem' }}>hrs</span></p>
                  </div>
                </div>
                <p style={{ color: '#94B7A2', fontSize: '0.875rem', marginBottom: '1rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{post.description}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94B7A2' }}>
                    Posted by{' '}
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/profile/${post.poster_id}`) }}
                      style={{ background: 'none', border: 'none', padding: 0, color: '#237371', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      {post.profiles?.full_name || post.profiles?.username}
                    </button>
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#94B7A2' }}>{new Date(post.created_at).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>

    </main>
  )
}