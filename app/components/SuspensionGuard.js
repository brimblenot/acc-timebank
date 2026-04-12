'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

// Pages that never trigger the suspension check
const EXEMPT = ['/', '/login', '/signup', '/suspended']

export default function SuspensionGuard() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (EXEMPT.includes(pathname)) return

    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('suspensions')
        .select('id')
        .eq('user_id', user.id)
        .gt('suspended_until', new Date().toISOString())
        .maybeSingle()

      if (data) router.push('/suspended')
    }

    check()
  }, [pathname, router])

  return null
}
