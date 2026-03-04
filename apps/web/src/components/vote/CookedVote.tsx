'use client'

/**
 * CookedVote — Module de vote Cooked / Uncooked
 *
 * - Fetch GET /api/votes?scope pour les comptages
 * - Submit POST /api/votes avec fingerprint navigateur
 * - Anti-doublon : localStorage (scope + jour)
 * - Animation pop sur le compteur après vote réussi
 * - Toast en cas d'erreur
 */

import { useCallback, useEffect, useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { hashString } from '@/lib/utils'
import type { VoteCounts, VoteScope, VoteType } from '@/types'

interface StoredVote {
  vote: VoteType
  day: string
}

function getLocalStorageKey(scope: VoteScope): string {
  return `fdm:voted:${scope}`
}

function getTodayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

async function getFingerprint(): Promise<string> {
  const raw = [
    navigator.userAgent,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    `${screen.width}x${screen.height}`,
  ].join('|')
  return hashString(raw)
}

interface CookedVoteProps {
  scope?: VoteScope
}

export function CookedVote({ scope = 'global' }: CookedVoteProps) {
  const { toast } = useToast()
  const [counts, setCounts] = useState<VoteCounts | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [votingFor, setVotingFor] = useState<VoteType | null>(null)
  const [myVote, setMyVote] = useState<VoteType | null>(null)
  const [popKey, setPopKey] = useState(0)

  useEffect(() => {
    const today = getTodayUTC()

    try {
      const stored = localStorage.getItem(getLocalStorageKey(scope))
      if (stored) {
        const parsed = JSON.parse(stored) as StoredVote
        if (parsed.day === today) setMyVote(parsed.vote)
      }
    } catch {
      // ignore
    }

    fetch(`/api/votes?scope=${scope}`)
      .then((r) => r.json())
      .then((data: VoteCounts) => setCounts(data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [scope])

  const handleVote = useCallback(
    async (vote: VoteType) => {
      if (myVote || votingFor) return

      setVotingFor(vote)
      try {
        const fingerprint = await getFingerprint()
        const res = await fetch('/api/votes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope, vote, fingerprint_hash: fingerprint }),
        })

        if (res.status === 409) {
          const today = getTodayUTC()
          setMyVote(vote)
          localStorage.setItem(getLocalStorageKey(scope), JSON.stringify({ vote, day: today }))
          return
        }

        if (!res.ok) {
          toast({
            title: 'Erreur',
            description: 'Impossible de voter pour le moment.',
            variant: 'destructive',
          })
          return
        }

        const data = (await res.json()) as VoteCounts
        setCounts(data)
        setMyVote(vote)
        setPopKey((k) => k + 1)

        const today = getTodayUTC()
        localStorage.setItem(getLocalStorageKey(scope), JSON.stringify({ vote, day: today }))
      } catch {
        toast({
          title: 'Erreur réseau',
          description: 'Impossible de voter pour le moment.',
          variant: 'destructive',
        })
      } finally {
        setVotingFor(null)
      }
    },
    [myVote, votingFor, scope, toast],
  )

  const cookedCount = counts?.cooked ?? 0
  const total = counts?.total ?? 0
  const ratioCookedPct = total > 0 ? Math.round((cookedCount / total) * 100) : 50

  return (
    <div className="text-center">
      {/* Boutons */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <VoteButton
          emoji="🔥"
          label="Cooked"
          vote="cooked"
          isSelected={myVote === 'cooked'}
          isLoading={votingFor === 'cooked'}
          isDisabled={!!myVote || !!votingFor}
          onClick={() => void handleVote('cooked')}
        />
        <VoteButton
          emoji="❄️"
          label="Uncooked"
          vote="uncooked"
          isSelected={myVote === 'uncooked'}
          isLoading={votingFor === 'uncooked'}
          isDisabled={!!myVote || !!votingFor}
          onClick={() => void handleVote('uncooked')}
        />
      </div>

      {/* Résultats */}
      {!isLoading && counts !== null && (
        <div key={popKey} className="mt-6 animate-[fade-in_0.4s_ease-out_forwards] space-y-3">
          {/* Barre de ratio */}
          <div
            className="bg-surface-200 mx-auto h-2.5 w-full max-w-sm overflow-hidden rounded-full"
            role="progressbar"
            aria-valuenow={ratioCookedPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${ratioCookedPct}% cooked`}
          >
            <div
              className="bg-alert-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${ratioCookedPct}%` }}
            />
          </div>

          {/* Compteurs */}
          <p className="text-surface-600 text-sm">
            <span className="text-alert-500 font-mono font-semibold">{ratioCookedPct}%</span> cooked
            ·{' '}
            <span className="text-republic-500 font-mono font-semibold">
              {100 - ratioCookedPct}%
            </span>{' '}
            uncooked ·{' '}
            <span className="text-surface-600 font-mono">{total.toLocaleString('fr-FR')}</span>{' '}
            votes
          </p>

          {myVote && (
            <p className="text-surface-600 text-xs">
              Vote enregistré — merci pour ta participation
            </p>
          )}
        </div>
      )}

      {isLoading && (
        <div className="mt-6 space-y-3">
          <div className="skeleton mx-auto h-2.5 w-full max-w-sm rounded-full" />
          <div className="skeleton mx-auto h-4 w-48 rounded" />
        </div>
      )}
    </div>
  )
}

interface VoteButtonProps {
  emoji: string
  label: string
  vote: VoteType
  isSelected: boolean
  isLoading: boolean
  isDisabled: boolean
  onClick: () => void
}

function VoteButton({
  emoji,
  label,
  vote,
  isSelected,
  isLoading,
  isDisabled,
  onClick,
}: VoteButtonProps) {
  const isCooked = vote === 'cooked'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-pressed={isSelected}
      aria-label={`Voter ${label}`}
      className={[
        'relative flex w-full max-w-[200px] flex-col items-center gap-2 rounded-2xl border px-6 py-4 transition-all duration-200',
        'focus-visible:ring-republic-500 focus-visible:outline-none focus-visible:ring-2',
        isDisabled && !isSelected
          ? 'border-surface-200 bg-surface-100 cursor-not-allowed opacity-50'
          : isSelected
            ? isCooked
              ? 'border-alert-400 bg-alert-50 shadow-[0_0_20px_rgba(244,63,94,0.15)]'
              : 'border-republic-400 bg-republic-50 shadow-[0_0_20px_rgba(35,85,238,0.15)]'
            : 'border-surface-200 hover:border-surface-300 bg-white hover:shadow-sm active:scale-95',
      ].join(' ')}
    >
      <span className="text-3xl" aria-hidden="true">
        {emoji}
      </span>
      <span
        className={`font-display text-sm font-bold ${
          isSelected ? (isCooked ? 'text-alert-500' : 'text-republic-500') : 'text-surface-800'
        }`}
      >
        {label}
      </span>
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/80">
          <svg
            className="text-surface-600 h-5 w-5 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </span>
      )}
    </button>
  )
}
