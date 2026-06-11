interface Props {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  disabled?: boolean
}

export function PaginationBar({ currentPage, totalPages, onPageChange, disabled }: Props) {
  if (totalPages <= 1) return null

  // Build the page numbers to show, with ellipsis gaps
  const pages: (number | '...')[] = []

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (currentPage > 3) pages.push('...')
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i)
    }
    if (currentPage < totalPages - 2) pages.push('...')
    pages.push(totalPages)
  }

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1 flex-wrap">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={disabled || currentPage === 1}
        aria-label="Previous page"
        className="px-2.5 py-1.5 text-sm rounded-lg border border-black/15 dark:border-white/15 text-black/60 dark:text-slate-300 hover:border-mustard hover:text-mustard disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        ‹
      </button>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="px-1.5 text-sm text-black/40 dark:text-slate-500" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            disabled={disabled || p === currentPage}
            aria-label={`Page ${p}`}
            aria-current={p === currentPage ? 'page' : undefined}
            className={`min-w-[32px] px-2.5 py-1.5 text-sm rounded-lg border transition-colors ${
              p === currentPage
                ? 'border-mustard bg-mustard text-white font-medium cursor-default'
                : 'border-black/15 dark:border-white/15 text-black/70 dark:text-slate-300 hover:border-mustard hover:text-mustard disabled:opacity-30 disabled:cursor-not-allowed'
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={disabled || currentPage === totalPages}
        aria-label="Next page"
        className="px-2.5 py-1.5 text-sm rounded-lg border border-black/15 dark:border-white/15 text-black/60 dark:text-slate-300 hover:border-mustard hover:text-mustard disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        ›
      </button>
    </nav>
  )
}
