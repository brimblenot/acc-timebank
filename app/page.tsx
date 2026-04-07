import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      
      {/* Nav */}
      <nav className="flex justify-between items-center px-8 py-5 border-b border-stone-800">
        <span className="text-xl font-bold tracking-tight text-emerald-400">
          ACC Timebank
        </span>
        <div className="flex gap-4">
          <Link href="/login" className="px-4 py-2 text-sm text-stone-300 hover:text-white transition">
            Log In
          </Link>
          <Link href="/signup" className="px-4 py-2 text-sm bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-lg transition">
            Join Free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 pt-24 pb-20">
        <div className="inline-block px-3 py-1 mb-6 text-xs font-medium bg-emerald-900 text-emerald-400 rounded-full tracking-widest uppercase">
          Alachua Community Collective
        </div>
        <h1 className="text-5xl font-bold leading-tight max-w-2xl mb-6">
          Exchange Skills,<br />
          <span className="text-emerald-400">Not Money</span>
        </h1>
        <p className="text-stone-400 text-lg max-w-xl mb-10">
          ACC Timebank connects community members to share services using time as currency. One hour of help given earns one hour of help received.
        </p>
        <Link href="/signup" className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-lg transition">
          Get Started — It's Free
        </Link>
      </section>

      {/* How It Works */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <h2 className="text-2xl font-bold text-center mb-12 text-stone-200">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="bg-stone-900 rounded-2xl p-6 border border-stone-800">
            <div className="text-3xl mb-4">🙋</div>
            <h3 className="font-bold text-lg mb-2">Post a Request</h3>
            <p className="text-stone-400 text-sm">Need help with something? Post a service request and offer hours in exchange.</p>
          </div>

          <div className="bg-stone-900 rounded-2xl p-6 border border-stone-800">
            <div className="text-3xl mb-4">🤝</div>
            <h3 className="font-bold text-lg mb-2">Connect Safely</h3>
            <p className="text-stone-400 text-sm">Community members apply to help. You approve who you work with before any contact info is shared.</p>
          </div>

          <div className="bg-stone-900 rounded-2xl p-6 border border-stone-800">
            <div className="text-3xl mb-4">⏱️</div>
            <h3 className="font-bold text-lg mb-2">Earn Hours</h3>
            <p className="text-stone-400 text-sm">Complete a service, get verified, and earn hours to spend on your own requests.</p>
          </div>

        </div>
      </section>

    </main>
  )
}