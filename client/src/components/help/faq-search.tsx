import { Search, X } from 'lucide-react'

interface FaqSearchProps {
  query: string
  onQueryChange: (q: string) => void
  selectedCategory: string
  onCategoryChange: (cat: string) => void
  categories: { id: string; label: string }[]
}

export function FaqSearch({
  query,
  onQueryChange,
  selectedCategory,
  onCategoryChange,
  categories,
}: FaqSearchProps) {
  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <Search className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search questions (e.g. security deposits, multi-vendor, cancellation, delivery)..."
          className="w-full text-xs sm:text-sm bg-surface border border-border rounded-xl pl-10 pr-9 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand shadow-xs"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onCategoryChange(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                isSelected
                  ? 'bg-brand text-white shadow-xs'
                  : 'bg-surface border border-border text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {cat.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Text highlighter utility for FAQ search results
 */
export function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(regex)

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-brand/20 text-brand rounded px-0.5 font-medium">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  )
}
