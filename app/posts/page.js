'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
      .select(`
        *,
        profiles (username, full_name)
      `)
      .eq('status', 'open')
      .order('created_at', { ascending: false })

    setPosts(data || [])
    setLoading(false)
  }

  const filtered = filter === 'all' ? posts : posts.filter(p => p.category === filter)
  const categories = ['all', ...new Set(posts.map(p => p.category))]

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">

      {/* Nav */}
      <nav className="flex justify-between items-center px-8 py-5 border-b border-stone-800">
        <Link href="/dashboard" className="text-xl font-bold tracking-tight text-emerald-400">
          ACC Timebank
        </Link>
        <div className="flex gap-4 items-center">
          <Link href="/dashboard" className="text-sm text-stone-400 hover:text-white transition">
            Dashboard
          </Link>
          <Link href="/posts/new" className="px-4 py-2 text-sm bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-lg transition">
            + Post Request
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">Community Requests</h1>
            <p className="text-stone-400">{posts.length} open requests in your community</p>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 flex-wrap mb-8">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition capitalize ${
                filter === cat
                  ? 'bg-emerald-500 text-black'
                  : 'bg-stone-800 text-stone-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Posts List */}
        {loading ? (
          <p className="text-stone-400">Loading posts...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-stone-400 text-lg mb-4">No requests yet.</p>
            <Link href="/posts/new" className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg transition">
              Be the first to post
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map(post => (
              <Link
                key={post.id}
                href={`/posts/${post.id}`}
                className="bg-stone-900 border border-stone-800 hover:border-emerald-600 rounded-2xl p-6 transition block"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-xs text-emerald-400 font-medium uppercase tracking-widest">
                      {post.category}
                    </span>
                    <h2 className="text-lg font-bold mt-1">{post.title}</h2>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-2xl font-bold text-emerald-400">{post.hours_required}</p>
                    <p className="text-xs text-stone-400">hours</p>
                  </div>
                </div>
                <p className="text-stone-400 text-sm line-clamp-2 mb-4">{post.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-stone-500">
                    Posted by {post.profiles?.full_name || post.profiles?.username}
                  </span>
                  <span className="text-xs text-stone-500">
                    {new Date(post.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}