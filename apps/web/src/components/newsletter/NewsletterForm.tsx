'use client'

/**
 * NewsletterForm — Formulaire d'inscription newsletter
 *
 * - Champ email visible + honeypot caché via CSS (position absolute, hors écran)
 * - États : idle | loading | success | error
 * - Submit POST /api/newsletter
 * - Props : source? (tracking)
 */

import { useRef, useState } from 'react'
import { useToast } from '@/hooks/use-toast'

type FormState = 'idle' | 'loading' | 'success' | 'error'

interface NewsletterFormProps {
  source?: string
}

export function NewsletterForm({ source = 'homepage' }: NewsletterFormProps) {
  const { toast } = useToast()
  const [state, setState] = useState<FormState>('idle')
  const [email, setEmail] = useState('')
  const honeypotRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (state === 'loading' || state === 'success') return

    const honeypot = honeypotRef.current?.value ?? ''

    setState('loading')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          locale: navigator.language?.slice(0, 2) ?? 'fr',
          source,
          honeypot,
        }),
      })

      const data = (await res.json()) as { success?: boolean; error?: string }

      if (data.success) {
        setState('success')
        setEmail('')
      } else if (res.status === 400) {
        setState('error')
        toast({ title: 'Email invalide', description: 'Vérifie le format de ton adresse email.', variant: 'destructive' })
      } else {
        setState('error')
        toast({ title: 'Oups', description: "Impossible de t'inscrire pour le moment. Réessaie dans quelques instants.", variant: 'destructive' })
      }
    } catch {
      setState('error')
      toast({ title: 'Erreur réseau', description: 'Impossible de contacter le serveur. Vérifie ta connexion.', variant: 'destructive' })
    }
  }

  if (state === 'success') {
    return (
      <div
        className="flex flex-col items-center gap-3 rounded-2xl border border-relief-500/30 bg-relief-500/10 px-6 py-8 text-center animate-[fade-in_0.4s_ease-out_forwards]"
        role="status"
        aria-live="polite"
      >
        <span className="text-3xl" aria-hidden="true">✅</span>
        <p className="font-display text-lg font-bold text-relief-400">Tu es dans la liste !</p>
        <p className="text-sm text-surface-600">
          Tu recevras un email dès que le FCI bouge. Spoiler : il bouge souvent.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} noValidate className="w-full max-w-md mx-auto">
      {/* Honeypot — caché via CSS, jamais via display:none */}
      <div
        tabIndex={-1}
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          opacity: 0,
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        <label htmlFor="website">Ne pas remplir</label>
        <input
          ref={honeypotRef}
          id="website"
          name="website"
          type="text"
          autoComplete="off"
          tabIndex={-1}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Email input */}
        <div className="flex-1">
          <label htmlFor="newsletter-email" className="sr-only">
            Adresse email
          </label>
          <input
            id="newsletter-email"
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="ton@email.fr"
            autoComplete="email"
            disabled={state === 'loading'}
            className={[
              'w-full rounded-full border border-surface-200 bg-white px-5 py-3 text-sm text-surface-900 placeholder-surface-500',
              'transition-colors duration-200 outline-none',
              'focus:border-republic-500 focus:ring-2 focus:ring-republic-500/30',
              state === 'error' ? 'border-alert-500' : 'border-surface-200',
              state === 'loading' ? 'opacity-70 cursor-not-allowed' : '',
            ].join(' ')}
          />
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={state === 'loading' || !email}
          aria-busy={state === 'loading'}
          className={[
            'rounded-full px-6 py-3 text-sm font-semibold transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-republic-500',
            'bg-republic-500 text-white',
            state === 'loading' || !email
              ? 'cursor-not-allowed opacity-60'
              : 'hover:bg-republic-400 active:scale-95',
          ].join(' ')}
        >
          {state === 'loading' ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Envoi…
            </span>
          ) : (
            'Je m\'inscris'
          )}
        </button>
      </div>

      <p className="mt-3 text-center text-xs text-surface-600">
        Pas de spam. Pas de partage. Juste le FCI.{' '}
        <a href="/disclaimer" className="underline hover:text-surface-800 transition-colors">
          En savoir plus.
        </a>
      </p>
    </form>
  )
}
