'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default function Posts() {
  const router = useRouter()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push('/login')
      fetchPosts()
    }
    init()
  }, [])

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('service_posts')
      .select(`*, profiles (username, full_name)`)
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
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link href="/dashboard" style={{ color: '#94B7A2', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>Dashboard</Link>
          <Link href="/posts/new" style={{ backgroundColor: '#237371', color: '#FEFFFF', fontSize: '0.875rem', fontWeight: 700, padding: '0.6rem 1.25rem', borderRadius: '0.5rem', textDecoration: 'none' }}>
            + Post Request
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem 1.5rem' }}>

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Community Requests</h1>
          <p style={{ color: '#94B7A2' }}>{posts.length} open requests in your community</p>
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
                style={{ backgroundColor: '#FEFFFF', border: '1px solid #E0E0DC', borderRadius: '1rem', padding: '1.5rem', textDecoration: 'none', color: '#2A272A', boxShadow: '0 2px 8px rgba(42,39,42,0.06)', display: 'block' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#237371', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{post.category}</span>
                    <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>{post.title}</h2>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1rem' }}>
                    <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: '2rem', fontWeight: 700, color: '#237371', lineHeight: 1 }}>{post.hours_required}</p>
                    <p style={{ fontSize: '0.75rem', color: '#94B7A2' }}>hours</p>
                  </div>
                </div>
                <p style={{ color: '#94B7A2', fontSize: '0.875rem', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.description}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94B7A2' }}>Posted by {post.profiles?.full_name || post.profiles?.username}</span>
                  <span style={{ fontSize: '0.75rem', color: '#94B7A2' }}>{new Date(post.created_at).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}