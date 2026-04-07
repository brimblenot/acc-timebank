'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Signup() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
  })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          username: formData.username,
          full_name: formData.fullName,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center px-4">
      
      <Link href="/" className="text-emerald-400 font-bold text-xl mb-8">
        ACC Timebank
      </Link>

      <div className="w-full max-w-md bg-stone-900 rounded-2xl p-8 border border-stone-800">
        <h1 className="text-2xl font-bold mb-2">Create your account</h1>
        <p className="text-stone-400 text-sm mb-8">Join the Alachua community exchange</p>

        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          
          <div>
            <label className="text-sm text-stone-400 mb-1 block">Full Name</label>
            <input
              name="fullName"
              type="text"
              required
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Jane Smith"
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div>
            <label className="text-sm text-stone-400 mb-1 block">Username</label>
            <input
              name="username"
              type="text"
              required
              value={formData.username}
              onChange={handleChange}
              placeholder="janesmith"
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div>
            <label className="text-sm text-stone-400 mb-1 block">Email</label>
            <input
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="jane@email.com"
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div>
            <label className="text-sm text-stone-400 mb-1 block">Password</label>
            <input
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="Min. 6 characters"
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-stone-700 disabled:text-stone-500 text-black font-bold py-3 rounded-lg transition mt-2"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

        </form>

        <p className="text-center text-stone-400 text-sm mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-emerald-400 hover:underline">
            Log in
          </Link>
        </p>
      </div>

    </main>
  )
}