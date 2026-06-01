import type { Client } from '@/types'

export type ClientStatus = Client['status']

export const CLIENT_STATUS_OPTIONS: { value: ClientStatus; label: string }[] = [
  { value: 'call_back',         label: 'Call Back' },
  { value: 'catalogue_shared',  label: 'Catalogue Shared' },
  { value: 'costing_shared',    label: 'Costing Shared' },
  { value: 'interested',        label: 'Interested' },
  { value: 'language_barrier',  label: 'Language Barrier' },
  { value: 'not_interested',    label: 'Not Interested' },
  { value: 'not_responding',    label: 'Not Responding after Multiple Attempts' },
  { value: 'unanswered',        label: 'Unanswered' },
]

export const CLIENT_STATUS_LABEL: Record<ClientStatus, string> = Object.fromEntries(
  CLIENT_STATUS_OPTIONS.map(({ value, label }) => [value, label])
) as Record<ClientStatus, string>

/** Tailwind colour classes for each status badge */
export const CLIENT_STATUS_COLOR: Record<ClientStatus, string> = {
  call_back:        'bg-blue-50   text-blue-700   border-blue-200   dark:bg-blue-900/30   dark:text-blue-300   dark:border-blue-700',
  catalogue_shared: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700',
  costing_shared:   'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
  interested:       'bg-green-50  text-green-700  border-green-200  dark:bg-green-900/30  dark:text-green-300  dark:border-green-700',
  language_barrier: 'bg-amber-50  text-amber-700  border-amber-200  dark:bg-amber-900/30  dark:text-amber-300  dark:border-amber-700',
  not_interested:   'bg-red-50    text-red-700    border-red-200    dark:bg-red-900/30    dark:text-red-300    dark:border-red-700',
  not_responding:   'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700',
  unanswered:       'bg-black/5   text-black/60   border-black/10   dark:bg-white/5       dark:text-slate-400  dark:border-white/10',
}
