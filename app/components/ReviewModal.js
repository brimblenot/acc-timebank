'use client'

import { useState } from 'react'
import Link from 'next/link'

const EMOTES = [
  { emoji: '😶', label: 'It was okay', value: 1 },
  { emoji: '🙂', label: 'Pretty fine', value: 2 },
  { emoji: '😊', label: 'Pretty good', value: 3 },
  { emoji: '😄', label: 'Really great', value: 4 },
  { emoji: '🤩', label: 'Amazing!', value: 5 },
]

export default function ReviewModal({ revieweeName, onSubmit, onClose, submitting, messagesLink }) {
  const [rating, setRating] = useState(3)
  const [comment, setComment] = useState('')

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(42,39,42,0.4)' }} onClick={onClose} />
      <div style={{ position: 'relative', backgroundColor: '#FEFFFF', borderRadius: '1rem', padding: '2rem', width: '100%', maxWidth: '460px', boxShadow: '0 8px 40px rgba(42,39,42,0.15)', border: '1px solid #E0E0DC' }}>

        <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>Leave a Review</h2>
        <p style={{ color: '#94B7A2', fontSize: '0.875rem', marginBottom: '1.75rem' }}>How was your experience with {revieweeName}?</p>

        {/* Emoticon picker */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {EMOTES.map(e => (
            <button
              key={e.value}
              onClick={() => setRating(e.value)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.75rem 0.25rem',
                backgroundColor: rating === e.value ? '#EBF5F0' : 'transparent',
                border: rating === e.value ? '2px solid #237371' : '2px solid #E0E0DC',
                borderRadius: '0.75rem',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: rating === e.value ? '2.25rem' : '1.75rem', lineHeight: 1 }}>{e.emoji}</span>
              <span style={{ fontSize: '0.65rem', color: rating === e.value ? '#237371' : '#94B7A2', fontWeight: rating === e.value ? 700 : 500, textAlign: 'center', lineHeight: 1.2 }}>
                {e.label}
              </span>
            </button>
          ))}
        </div>

        {/* Comment */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Add a note (optional)</label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="What did you appreciate about this exchange?"
            rows={3}
            style={{ width: '100%', backgroundColor: '#F5F5F3', border: '1px solid #E0E0DC', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#2A272A', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => onSubmit(rating, comment)}
            disabled={submitting}
            style={{ flex: 1, padding: '0.875rem', backgroundColor: submitting ? '#E0E0DC' : '#237371', color: '#FEFFFF', fontWeight: 700, borderRadius: '0.5rem', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}
          >
            {submitting ? 'Submitting...' : 'Share Review'}
          </button>
          <button
            onClick={onClose}
            style={{ padding: '0.875rem 1.5rem', backgroundColor: '#F5F5F3', color: '#2A272A', fontWeight: 600, borderRadius: '0.5rem', border: '1px solid #E0E0DC', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            Skip
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
