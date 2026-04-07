'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function PostDetail() {
  const router = useRouter()
  const { id } = useParams()
  const [post, setPost] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUser(user)

      const { data: postData } = await supabase
        .from('service_posts')
        .select(`*, profiles (username, full_name, bio)`)
        .eq('id', id)
        .single()

      setPost(postData)

      // Check if already applied
      const { data: existing } = await supabase
        .from('applications')
        .select('id')
        .eq('post_id', id)
        .eq('applicant_id', user.id)
        .single()

      if (existing) setApplied(true)
      setLoading(false)
    }
    init()
  }, [id])

  const handleApply = async () => {
    setApplying(true)
    setError(null)

    const { error } = await supabase
      .from('applications')
      .insert({
        post_id: id,
        applicant_id: currentUser.id,
      })

    if (error) {
      setError(error.message)
    } else {
      setApplied(true)
    }
    setApplying(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center">
        <p className="text-stone-400">Loading...</p>
      </main>
    )
  }

  if (!post) {
    return (
      <main className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center">
        <p className="text-stone-400">Post not found.</p>
      </main>
    )
  }

  const isOwner = currentUser?.id === post.poster_id

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">

      {/* Nav */}
      <nav className="flex justify-between items-center px-8 py-5 border-b border-stone-800">
        <Link href="/dashboard" className="text-xl font-bold tracking-tight text-emerald-400">
          ACC Timebank
        </Link>
        <Link href="/posts" className="text-sm text-stone-400 hover:text-white transition">
          ← Back to Posts
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* Category & Status */}
        <div className="flex gap-3 mb-4">
          <span className="text-xs text-emerald-400 font-medium uppercase tracking-widest bg-emerald-900 px-3 py-1 rounded-full">
            {post.category}
          </span>
          <span className="text-xs text-stone-400 font-medium uppercase tracking-widest bg-stone-800 px-3 py-1 rounded-full">
            {post.status}
          </span>
        </div>

        {/* Title & Hours */}
        <div className="flex justify-between items-start mb-6">
          <h1 className="text-3xl font-bold leading-tight">{post.title}</h1>
          <div className="text-right shrink-0 ml-6">
            <p className="text-4xl font-bold text-emerald-400">{post.hours_required}</p>
            <p className="text-stone-400 text-sm">hours</p>
          </div>
        </div>

        {/* Description */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-medium text-stone-400 uppercase tracking-widest mb-3">Description</h2>
          <p className="text-stone-200 leading-relaxed">{post.description}</p>
        </div>

        {/* Posted By */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 mb-8">
          <h2 className="text-sm font-medium text-stone-400 uppercase tracking-widest mb-3">Posted By</h2>
          <p className="font-semibold">{post.profiles?.full_name || post.profiles?.username}</p>
          {post.profiles?.bio && (
            <p className="text-stone-400 text-sm mt-1">{post.profiles.bio}</p>
          )}
          <p className="text-stone-500 text-xs mt-2">
            {new Date(post.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Action */}
        {isOwner ? (
          <div className="bg-stone-800 rounded-2xl p-6 text-center">
            <p className="text-stone-400 text-sm">This is your post. You'll be notified when someone applies.</p>
          </div>
        ) : applied ? (
          <div className="bg-emerald-900 border border-emerald-700 rounded-2xl p-6 text-center">
            <p className="text-emerald-400 font-semibold">✓ You've applied to this request</p>
            <p className="text-stone-400 text-sm mt-1">The requester will review your application.</p>
          </div>
        ) : (
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
            <h2 className="font-bold text-lg mb-2">Offer to Help</h2>
            <p className="text-stone-400 text-sm mb-4">
              Apply to fulfill this request. Your contact info stays private until the requester approves you.
            </p>
            {error && (
              <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-3 mb-4">
                {error}
              </p>
            )}
            <button
              onClick={handleApply}
              disabled={applying}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-stone-700 text-black font-bold rounded-lg transition"
            >
              {applying ? 'Applying...' : `Apply to Help — Earn ${post.hours_required} Hours`}
            </button>
          </div>
        )}

      </div>
    </main>
  )
}