'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const CATEGORIES = [
  'Home & Garden',
  'Tech Help',
  'Transportation',
  'Tutoring & Education',
  'Arts & Crafts',
  'Cooking & Food',
  'Health & Wellness',
  'Childcare & Eldercare',
  'Administrative',
  'Other',
]

export default function NewPost() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    hours_required: 1,
  })

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push('/login')
      else setUser(user)
    }
    getUser()
  }, [])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: profile } = await supabase
      .from('profiles')
      .select('hour_balance')
      .eq('id', user.id)
      .single()

    if (profile.hour_balance - formData.hours_required < -5) {
      setError(`This would exceed your debt limit. Your balance would go below -5 hours.`)
      setLoading(false)
      return
    }

    const { error: postError } = await supabase
      .from('service_posts')
      .insert({
        poster_id: user.id,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        hours_required: parseInt(formData.hours_required),
      })

    if (postError) {
      setError(postError.message)
      setLoading(false)
      return
    }

    router.push('/posts')
  }

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">

      {/* Nav */}
      <nav className="flex justify-between items-center px-8 py-5 border-b border-stone-800">
        <Link href="/dashboard" className="text-xl font-bold tracking-tight text-emerald-400">
          ACC Timebank
        </Link>
        <Link href="/posts" className="text-sm text-stone-400 hover:text-white transition">
          Browse Posts
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Post a Service Request</h1>
          <p className="text-stone-400">Describe what you need help with and how many hours you're offering.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          <div>
            <label className="text-sm text-stone-400 mb-1 block">Title</label>
            <input
              name="title"
              type="text"
              required
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Help moving furniture this Saturday"
              className="w-full bg-stone-900 border border-stone-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div>
            <label className="text-sm text-stone-400 mb-1 block">Category</label>
            <select
              name="category"
              required
              value={formData.category}
              onChange={handleChange}
              className="w-full bg-stone-900 border border-stone-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="">Select a category</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-stone-400 mb-1 block">Description</label>
            <textarea
              name="description"
              required
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe what you need in detail. The more specific, the better."
              rows={5}
              className="w-full bg-stone-900 border border-stone-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition resize-none"
            />
          </div>

          <div>
            <label className="text-sm text-stone-400 mb-1 block">Hours Offered</label>
            <div className="flex items-center gap-4">
              <input
                name="hours_required"
                type="number"
                min="1"
                max="20"
                required
                value={formData.hours_required}
                onChange={handleChange}
                className="w-24 bg-stone-900 border border-stone-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition"
              />
              <span className="text-stone-400 text-sm">hours in exchange for this service</span>
            </div>
            <p className="text-stone-500 text-xs mt-2">You can go up to -5 hours in debt.</p>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-stone-700 disabled:text-stone-500 text-black font-bold rounded-lg transition"
            >
              {loading ? 'Posting...' : 'Post Request'}
            </button>
            <Link
              href="/posts"
              className="px-8 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium rounded-lg transition text-center"
            >
              Cancel
            </Link>
          </div>

        </form>
      </div>
    </main>
  )
}