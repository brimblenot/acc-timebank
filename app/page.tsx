import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#FEFFFF', color: '#2A272A' }}>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2.5rem', backgroundColor: '#FEFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Image src="/acc-logo.png" alt="ACC Logo" width={60} height={60} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <span style={{ color: '#2A272A', fontFamily: 'var(--font-cormorant)', fontSize: '1.3rem', fontWeight: 700, letterSpacing: '0.05em' }}>
              Alachua Community Collective
            </span>
            <span style={{ color: '#237371', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600 }}>
              A Mutual Aid Network
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link href="/login" style={{ color: '#237371', fontSize: '0.875rem', padding: '0.5rem 1rem', textDecoration: 'none', fontWeight: 600 }}>
            Log In
          </Link>
          <Link href="/signup" style={{ backgroundColor: '#237371', color: '#FEFFFF', fontSize: '0.875rem', fontWeight: 700, padding: '0.6rem 1.5rem', borderRadius: '0.5rem', textDecoration: 'none' }}>
            Join Free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '7rem 1.5rem 6rem', backgroundColor: '#FEFFFF' }}>
        <div style={{ backgroundColor: '#237371', color: '#FEFFFF', fontSize: '0.65rem', letterSpacing: '0.2em', padding: '0.35rem 1.25rem', borderRadius: '9999px', textTransform: 'uppercase', fontWeight: 700, marginBottom: '2rem' }}>
          Est. 2025 · Alachua County, Florida
        </div>
        <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '5.5rem', fontWeight: 700, lineHeight: 1.0, maxWidth: '800px', marginBottom: '0.5rem', color: '#2A272A', letterSpacing: '-0.01em' }}>
          Exchange Skills,
        </h1>
        <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '5.5rem', fontWeight: 700, lineHeight: 1.0, maxWidth: '800px', marginBottom: '2.5rem', color: '#237371', letterSpacing: '-0.01em' }}>
          Not Money.
        </h1>
        <p style={{ color: '#2A272A', fontSize: '1.15rem', maxWidth: '540px', marginBottom: '0.75rem', lineHeight: 1.8, opacity: 0.75 }}>
          The ACC Timebank is a community exchange where your time is the currency. Every hour you give is an hour you can spend.
        </p>
        <p style={{ color: '#94B7A2', fontSize: '0.9rem', maxWidth: '400px', marginBottom: '3rem', lineHeight: 1.6 }}>
          No money. No barter. Just neighbors helping neighbors.
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link
            href="/signup"
            style={{ backgroundColor: '#237371', color: '#FEFFFF', fontWeight: 800, fontSize: '1rem', padding: '1rem 2.5rem', borderRadius: '0.75rem', textDecoration: 'none' }}
          >
            Join the Network
          </Link>
          <Link
            href="/login"
            style={{ backgroundColor: 'transparent', color: '#237371', fontWeight: 600, fontSize: '1rem', padding: '1rem 2rem', borderRadius: '0.75rem', textDecoration: 'none', border: '1px solid #237371' }}
          >
            Log In
          </Link>
        </div>
      </section>

      {/* Stats Bar */}
      <section style={{ backgroundColor: '#237371', padding: '3rem 1.5rem' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: '3.5rem', fontWeight: 700, color: '#FEFFFF', lineHeight: 1 }}>1:1</p>
            <p style={{ color: '#94B7A2', fontSize: '0.8rem', marginTop: '0.5rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Hour Exchange Rate</p>
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: '3.5rem', fontWeight: 700, color: '#FEFFFF', lineHeight: 1 }}>$0</p>
            <p style={{ color: '#94B7A2', fontSize: '0.8rem', marginTop: '0.5rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Cost to Join</p>
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: '3.5rem', fontWeight: 700, color: '#FEFFFF', lineHeight: 1 }}>10</p>
            <p style={{ color: '#94B7A2', fontSize: '0.8rem', marginTop: '0.5rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Hours to Start</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section style={{ maxWidth: '900px', margin: '0 auto', padding: '6rem 1.5rem' }}>
        <p style={{ color: '#237371', fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', textAlign: 'center', marginBottom: '1rem', fontWeight: 700 }}>How It Works</p>
        <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '3rem', fontWeight: 700, textAlign: 'center', marginBottom: '4rem', lineHeight: 1.1, color: '#2A272A' }}>
          Community built on<br />
          <span style={{ color: '#237371' }}>mutual trust</span>
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>

          <div style={{ backgroundColor: '#FEFFFF', border: '1px solid #e0e0e0', borderRadius: '1rem', padding: '2rem', boxShadow: '0 2px 12px rgba(42,39,42,0.06)' }}>
            <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: '4rem', fontWeight: 700, color: '#237371', lineHeight: 1, marginBottom: '1rem', opacity: 0.3 }}>01</div>
            <h3 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.75rem', color: '#2A272A' }}>Post a Request</h3>
            <p style={{ color: '#2A272A', fontSize: '0.875rem', lineHeight: 1.7, opacity: 0.7 }}>Describe what you need and how many hours you're offering in exchange.</p>
          </div>

          <div style={{ backgroundColor: '#FEFFFF', border: '1px solid #e0e0e0', borderRadius: '1rem', padding: '2rem', boxShadow: '0 2px 12px rgba(42,39,42,0.06)' }}>
            <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: '4rem', fontWeight: 700, color: '#237371', lineHeight: 1, marginBottom: '1rem', opacity: 0.3 }}>02</div>
            <h3 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.75rem', color: '#2A272A' }}>Connect Safely</h3>
            <p style={{ color: '#2A272A', fontSize: '0.875rem', lineHeight: 1.7, opacity: 0.7 }}>Members apply to help. You choose who you work with. Contact info stays private until you approve.</p>
          </div>

          <div style={{ backgroundColor: '#FEFFFF', border: '1px solid #e0e0e0', borderRadius: '1rem', padding: '2rem', boxShadow: '0 2px 12px rgba(42,39,42,0.06)' }}>
            <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: '4rem', fontWeight: 700, color: '#237371', lineHeight: 1, marginBottom: '1rem', opacity: 0.3 }}>03</div>
            <h3 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.75rem', color: '#2A272A' }}>Earn Hours</h3>
            <p style={{ color: '#2A272A', fontSize: '0.875rem', lineHeight: 1.7, opacity: 0.7 }}>Complete a service and get verified. Hours transfer automatically — spend them on your own requests.</p>
          </div>

        </div>
      </section>

      {/* CTA */}
      <section style={{ backgroundColor: '#2A272A', padding: '5rem 1.5rem', textAlign: 'center' }}>
        <Image src="/acc-logo.png" alt="ACC Logo" width={80} height={80} style={{ margin: '0 auto 1.5rem', opacity: 0.9 }} />
        <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '3rem', fontWeight: 700, color: '#FEFFFF', marginBottom: '1rem' }}>
          Ready to get involved?
        </h2>
        <p style={{ color: '#94B7A2', fontSize: '1rem', marginBottom: '2.5rem', maxWidth: '400px', margin: '0 auto 2.5rem' }}>
          Join your neighbors in building a stronger, more connected Alachua County.
        </p>
        <Link
          href="/signup"
          style={{ backgroundColor: '#2FB774', color: '#2A272A', fontWeight: 800, fontSize: '1rem', padding: '1rem 2.5rem', borderRadius: '0.75rem', textDecoration: 'none' }}
        >
          Create Your Account
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #e0e0e0', color: '#94B7A2', fontSize: '0.8rem', textAlign: 'center', padding: '2rem', backgroundColor: '#FEFFFF' }}>
        <p>© 2026 Alachua Community Collective · A Mutual Aid Network · Alachua County, Florida</p>
      </footer>

    </main>
  )
}