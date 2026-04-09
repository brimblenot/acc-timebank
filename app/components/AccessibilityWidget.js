'use client'

import { useState, useEffect } from 'react'

const FONT_STEPS = [
  { label: 'A',   key: 'normal', cls: ''            },
  { label: 'A+',  key: 'large',  cls: 'text-large'  },
  { label: 'A++', key: 'xl',     cls: 'text-xl'     },
]

function applySettings({ fontStep, highContrast }) {
  const html = document.documentElement
  FONT_STEPS.forEach(s => { if (s.cls) html.classList.remove(s.cls) })
  const step = FONT_STEPS.find(s => s.key === fontStep) || FONT_STEPS[0]
  if (step.cls) html.classList.add(step.cls)
  html.classList.toggle('high-contrast', highContrast)
}

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false)
  const [fontStep, setFontStep] = useState('normal')
  const [highContrast, setHighContrast] = useState(false)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('acc_a11y') || '{}')
      const fs = saved.fontStep || 'normal'
      const hc = saved.highContrast || false
      setFontStep(fs)
      setHighContrast(hc)
      applySettings({ fontStep: fs, highContrast: hc })
    } catch {}
  }, [])

  const update = (newFontStep, newHighContrast) => {
    setFontStep(newFontStep)
    setHighContrast(newHighContrast)
    applySettings({ fontStep: newFontStep, highContrast: newHighContrast })
    localStorage.setItem('acc_a11y', JSON.stringify({ fontStep: newFontStep, highContrast: newHighContrast }))
  }

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Accessibility settings"
          style={{
            position: 'fixed',
            bottom: '5rem',
            left: '1.5rem',
            zIndex: 41,
            backgroundColor: '#FEFFFF',
            border: '1px solid #E0E0DC',
            borderRadius: '1rem',
            padding: '1.25rem',
            boxShadow: '0 4px 20px rgba(42,39,42,0.14)',
            minWidth: '220px',
          }}
        >
          <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94B7A2', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
            Accessibility
          </p>

          {/* Font size */}
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#2A272A', marginBottom: '0.4rem' }}>Text Size</p>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {FONT_STEPS.map(step => (
                <button
                  key={step.key}
                  onClick={() => update(step.key, highContrast)}
                  aria-pressed={fontStep === step.key}
                  style={{
                    flex: 1,
                    padding: '0.4rem',
                    borderRadius: '0.5rem',
                    border: '1px solid',
                    borderColor: fontStep === step.key ? '#237371' : '#E0E0DC',
                    backgroundColor: fontStep === step.key ? '#EBF5F0' : '#F5F5F3',
                    color: fontStep === step.key ? '#237371' : '#2A272A',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  {step.label}
                </button>
              ))}
            </div>
          </div>

          {/* High contrast */}
          <div>
            <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#2A272A', marginBottom: '0.4rem' }}>High Contrast</p>
            <button
              onClick={() => update(fontStep, !highContrast)}
              aria-pressed={highContrast}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '0.5rem',
                border: '1px solid',
                borderColor: highContrast ? '#237371' : '#E0E0DC',
                backgroundColor: highContrast ? '#EBF5F0' : '#F5F5F3',
                color: highContrast ? '#237371' : '#2A272A',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              {highContrast ? '✓ On' : 'Off'}
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        title="Accessibility settings"
        aria-expanded={open}
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          left: '1.5rem',
          zIndex: 40,
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: open ? '#237371' : '#F5F5F3',
          color: open ? '#FEFFFF' : '#237371',
          border: '1px solid #E0E0DC',
          cursor: 'pointer',
          fontSize: '1.4rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(42,39,42,0.12)',
        }}
      >
        ♿
      </button>
    </>
  )
}
