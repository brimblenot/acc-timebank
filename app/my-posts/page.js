'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function MyPosts() {
  const router = useRouter()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)
  const [completing, setCompleting] = useState(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      fetchMyPosts(user.id)
    }
    init()
  }, [])

  const fetchMyPosts = async (userId) => {
    const { data } = await supabase
      .from('service_posts')
      .select(`
        *,
        applications (
          id,
          status,
          created_at,
          applicant_id,
          profiles (id, full_name, username, bio)
        )
      `)
      .eq('poster_id', userId)
      .order('created_at', { ascending: false })

    setPosts(data || [])
    setLoading(false)
  }

  const handleApplication = async (applicationId, newStatus, postId) => {
    setUpdating(applicationId)

    const { error } = await supabase
      .from('applications')
      .update({ status: newStatus })
      .eq('id', applicationId)

    if (!error && newStatus === 'approved') {
      await supabase
        .from('service_posts')
        .update({ status: 'in_progress' })
        .eq('id', postId)
    }

    const { data: { user } } = await supabase.auth.getUser()
    fetchMyPosts(user.id)
    setUpdating(null)
  }

  const handleComplete = async (post) => {
    setCompleting(post.id)

    // Find the approved application to get the provider's ID
    const approvedApp = post.applications.find(a => a.status === 'approved')
    if (!approvedApp) {
      alert('No approved applicant found.')
      setCompleting(null)
      return
    }

    const { error } = await supabase.rpc('transfer_hours', {
      from_user: post.poster_id,
      to_user: approvedApp.applicant_id,
      amount: post.hours_required,
      post_id: post.id,
    })

    if (error) {
      alert('Error completing service: ' + error.message)
    }

    const { data: { user } } = await supabase.auth.getUser()
    fetchMyPosts(user.id)
    setCompleting(null)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center">
        <p className="text-stone-400">Loading...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">

      {/* Nav */}
      <nav className="flex justify-between items-center px-8 py-5 border-b border-stone-800">
        <Link href="/dashboard" className="text-xl font-bold tracking-tight text-emerald-400">
          ACC Timebank
        </Link>
        <div className="flex gap-4 items-center">
          <Link href="/posts" className="text-sm text-stone-400 hover:text-white transition">
            Browse Posts
          </Link>
          <Link href="/dashboard" className="text-sm text-stone-400 hover:text-white transition">
            Dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">

        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2">My Posts</h1>
          <p className="text-stone-400">Manage your service requests and review applicants.</p>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-stone-400 text-lg mb-4">You haven't posted any requests yet.</p>
            <Link href="/posts/new" className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg transition">
              Post Your First Request
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {posts.map(post => (
              <div key={post.id} className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">

                {/* Post Header */}
                <div className="p-6 border-b border-stone-800">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs text-emerald-400 font-medium uppercase tracking-widest">
                        {post.category}
                      </span>
                      <h2 className="text-xl font-bold mt-1">{post.title}</h2>
                      <p className="text-stone-400 text-sm mt-1">{post.description}</p>
                    </div>
                    <div className="text-right shrink-0 ml-6">
                      <p className="text-3xl font-bold text-emerald-400">{post.hours_required}</p>
                      <p className="text-xs text-stone-400">hours</p>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full mt-2 inline-block ${
                        post.status === 'open' ? 'bg-emerald-900 text-emerald-400' :
                        post.status === 'in_progress' ? 'bg-yellow-900 text-yellow-400' :
                        post.status === 'completed' ? 'bg-stone-700 text-stone-400' :
                        'bg-stone-700 text-stone-400'
                      }`}>
                        {post.status}
                      </span>
                    </div>
                  </div>

                  {/* Complete Button */}
                  {post.status === 'in_progress' && (
                    <div className="mt-4 pt-4 border-t border-stone-800">
                      <div className="flex items-center justify-between">
                        <p className="text-stone-400 text-sm">
                          Service in progress — mark as complete when done to transfer hours.
                        </p>
                        <button
                          onClick={() => handleComplete(post)}
                          disabled={completing === post.id}
                          className="ml-4 px-5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-stone-700 disabled:text-stone-500 text-black text-sm font-bold rounded-lg transition shrink-0"
                        >
                          {completing === post.id ? 'Processing...' : '✓ Mark Complete'}
                        </button>
                      </div>
                    </div>
                  )}

                  {post.status === 'completed' && (
                    <div className="mt-4 pt-4 border-t border-stone-800">
                      <p className="text-emerald-400 text-sm font-medium">
                        ✓ Service completed — {post.hours_required} hours transferred
                      </p>
                    </div>
                  )}
                </div>

                {/* Applications */}
                <div className="p-6">
                  <h3 className="text-sm font-medium text-stone-400 uppercase tracking-widest mb-4">
                    Applications ({post.applications?.length || 0})
                  </h3>

                  {post.applications?.length === 0 ? (
                    <p className="text-stone-500 text-sm">No applications yet.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {post.applications.map(app => (
                        <div key={app.id} className="bg-stone-800 rounded-xl p-4 flex justify-between items-center">
                          <div>
                            <p className="font-semibold">
                              {app.profiles?.full_name || app.profiles?.username}
                            </p>
                            {app.profiles?.bio && (
                              <p className="text-stone-400 text-sm mt-0.5">{app.profiles.bio}</p>
                            )}
                            <p className="text-stone-500 text-xs mt-1">
                              Applied {new Date(app.created_at).toLocaleDateString()}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 ml-4">
                            {app.status === 'pending' ? (
                              <>
                                <button
                                  onClick={() => handleApplication(app.id, 'approved', post.id)}
                                  disabled={updating === app.id}
                                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-stone-600 text-black text-sm font-bold rounded-lg transition"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleApplication(app.id, 'declined', post.id)}
                                  disabled={updating === app.id}
                                  className="px-4 py-2 bg-stone-700 hover:bg-stone-600 disabled:bg-stone-600 text-stone-300 text-sm font-medium rounded-lg transition"
                                >
                                  Decline
                                </button>
                              </>
                            ) : (
                              <div className="flex items-center gap-3">
                                <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                                  app.status === 'approved'
                                    ? 'bg-emerald-900 text-emerald-400'
                                    : 'bg-stone-700 text-stone-400'
                                }`}>
                                  {app.status}
                                </span>
                                {app.status === 'approved' && (
                                  <Link
                                    href={`/messages/${app.id}`}
                                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold rounded-lg transition"
                                  >
                                    Messages →
                                  </Link>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}