'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function MyApplications() {
  const router = useRouter()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('applications')
        .select(`
          *,
          service_posts (
            id, title, description, category, hours_required, status,
            profiles (full_name, username)
          )
        `)
        .eq('applicant_id', user.id)
        .order('created_at', { ascending: false })

      setApplications(data || [])
      setLoading(false)
    }
    init()
  }, [])

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
          <h1 className="text-3xl font-bold mb-2">My Applications</h1>
          <p className="text-stone-400">Track the status of services you've offered to provide.</p>
        </div>

        {applications.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-stone-400 text-lg mb-4">You haven't applied to any requests yet.</p>
            <Link href="/posts" className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg transition">
              Browse Requests
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {applications.map(app => (
              <div key={app.id} className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-xs text-emerald-400 font-medium uppercase tracking-widest">
                      {app.service_posts?.category}
                    </span>
                    <h2 className="text-lg font-bold mt-1">{app.service_posts?.title}</h2>
                    <p className="text-stone-400 text-sm mt-1">
                      Posted by {app.service_posts?.profiles?.full_name || app.service_posts?.profiles?.username}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-6">
                    <p className="text-2xl font-bold text-emerald-400">{app.service_posts?.hours_required}</p>
                    <p className="text-xs text-stone-400">hours</p>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-4">
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                    app.status === 'approved'
                      ? 'bg-emerald-900 text-emerald-400'
                      : app.status === 'declined'
                      ? 'bg-red-950 text-red-400'
                      : 'bg-stone-800 text-stone-400'
                  }`}>
                    {app.status === 'pending' ? '⏳ Pending Review' :
                     app.status === 'approved' ? '✓ Approved' :
                     '✕ Declined'}
                  </span>

                  {app.status === 'approved' && (
                    <Link
                      href={`/messages/${app.id}`}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold rounded-lg transition"
                    >
                      Open Messages →
                    </Link>
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