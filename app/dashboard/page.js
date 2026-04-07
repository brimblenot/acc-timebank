'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(data)
      setLoading(false)
    }

    getProfile()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
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
        <span className="text-xl font-bold tracking-tight text-emerald-400">
          ACC Timebank
        </span>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm text-stone-400 hover:text-white transition"
        >
          Log Out
        </button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* Welcome */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-1">
            Welcome, {profile?.full_name || profile?.username} 👋
          </h1>
          <p className="text-stone-400">Here's your community exchange dashboard.</p>
        </div>

        {/* Hour Balance Card */}
        <div className="bg-emerald-900 border border-emerald-700 rounded-2xl p-8 mb-8 flex items-center justify-between">
          <div>
            <p className="text-emerald-400 text-sm font-medium uppercase tracking-widest mb-1">Hour Balance</p>
            <p className="text-6xl font-bold text-white">{profile?.hour_balance ?? 0}</p>
            <p className="text-emerald-400 mt-1 text-sm">hours available to spend</p>
          </div>
          <div className="text-7xl">⏱️</div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button className="bg-stone-900 border border-stone-800 hover:border-emerald-600 rounded-2xl p-6 text-left transition">
            <div className="text-2xl mb-3">📋</div>
            <h3 className="font-bold mb-1">Browse Requests</h3>
            <p className="text-stone-400 text-sm">See what your community needs</p>
          </button>

          <button className="bg-stone-900 border border-stone-800 hover:border-emerald-600 rounded-2xl p-6 text-left transition">
            <div className="text-2xl mb-3">✏️</div>
            <h3 className="font-bold mb-1">Post a Request</h3>
            <p className="text-stone-400 text-sm">Ask for help with something</p>
          </button>

          <button className="bg-stone-900 border border-stone-800 hover:border-emerald-600 rounded-2xl p-6 text-left transition">
            <div className="text-2xl mb-3">👤</div>
            <h3 className="font-bold mb-1">My Profile</h3>
            <p className="text-stone-400 text-sm">Edit your skills and bio</p>
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 text-center">
            <p className="text-2xl font-bold">0</p>
            <p className="text-stone-400 text-sm mt-1">Active Posts</p>
          </div>
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 text-center">
            <p className="text-2xl font-bold">0</p>
            <p className="text-stone-400 text-sm mt-1">Services Given</p>
          </div>
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 text-center">
            <p className="text-2xl font-bold">0</p>
            <p className="text-stone-400 text-sm mt-1">Services Received</p>
          </div>
        </div>

      </div>
    </main>
  )
}