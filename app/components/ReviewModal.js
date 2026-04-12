'use client'

import { useState } from 'react'
import Link from 'next/link'

const QUALITY_TAGS = [
  'Timeliness',
  'Followed Directions',
  'Courteous',
  'Great Communication',
  'Went Above and Beyond',
  'Would Recommend',
]

export default function ReviewModal({ revieweeName, onSubmit, onClose, submitting, messagesLink }) {
  const [selected, setSelected] = useState([])

  const toggleTag = (tag) => {
    setSelected(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(42,39,42,0.4)' }} onClick={onClose} />
      <div style={{ position: 'relative', backgroundColor: '#FEFFFF', borderRadius: '1rem', padding: '2rem', width: '100%', maxWidth: '460px', boxShadow: '0 8px 40px rgba(42,39,42,0.15)', border: '1px solid #E0E0DC' }}>

        <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>Leave a Compliment</h2>
        <p style={{ color: '#94B7A2', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
          What did {revieweeName} do well? Select all that apply.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '2rem' }}>
          {QUALITY_TAGS.map(tag => {
            const isActive = selected.includes(tag)
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '9999px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  border: isActive ? '2px solid #237371' : '2px solid #E0E0DC',
                  backgroundColor: isActive ? '#EBF5F0' : '#F5F5F3',
                  color: isActive ? '#237371' : '#94B7A2',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {isActive ? '✓ ' : ''}{tag}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => onSubmit(selected)}
            disabled={submitting}
            style={{ flex: 1, padding: '0.875rem', backgroundColor: submitting ? '#E0E0DC' : '#237371', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}
          >
            {submitting ? 'Submitting...' : selected.length > 0 ? 'Share Compliment' : 'Skip'}
          </button>
          <button
            onClick={onClose}
            style={{ padding: '0.875rem 1.5rem', backgroundColor: '#F5F5F3', color: '#2A272A', fontWeight: 600, borderRadius: '0.5rem', border: '1px solid #E0E0DC', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            Cancel
          </button>
        </div>

        {messagesLink && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #E0E0DC', textAlign: 'center' }}>
            <Link href={messagesLink} style={{ color: '#237371', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
              💬 Go to Messages
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
