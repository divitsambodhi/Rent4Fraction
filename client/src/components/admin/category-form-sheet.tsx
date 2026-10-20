import { useEffect, useState } from 'react'
import { EntitySheet } from '@/components/shared/entity-sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { Category } from '@/types'

interface CategoryFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: Category | null // null for new category
  existingCategories: Category[]
  onSave: (categoryData: Partial<Category>) => Promise<void>
}

export function CategoryFormSheet({
  open,
  onOpenChange,
  category,
  existingCategories,
  onSave,
}: CategoryFormSheetProps) {
  const isNew = !category

  const [name, setName] = useState(category?.name || '')
  const [description, setDescription] = useState(category?.description || '')
  const [startingPrice, setStartingPrice] = useState(String(category?.starting_price || 1000))
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (category) {
      setName(category.name)
      setDescription(category.description || '')
      setStartingPrice(String(category.starting_price || 1000))
    } else {
      setName('')
      setDescription('')
      setStartingPrice('1000')
    }
    setError(null)
  }, [category, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanName = name.trim()
    if (!cleanName) {
      setError('Category name is required.')
      return
    }

    // Name uniqueness check
    const duplicate = existingCategories.find(
      (c) => c.name.toLowerCase() === cleanName.toLowerCase() && c.id !== category?.id
    )
    if (duplicate) {
      setError('A category with this name already exists.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await onSave({
        id: category?.id,
        name: cleanName,
        description: description.trim(),
        starting_price: parseFloat(startingPrice) || 1000,
        icon: category?.icon || 'Package',
      })
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <EntitySheet
      open={open}
      onOpenChange={onOpenChange}
      eyebrow={isNew ? 'CATALOGUE GOVERNANCE' : `CATEGORY #${category.id}`}
      title={isNew ? 'Create Equipment Category' : `Edit ${category.name}`}
      subtitle="Manage catalogue taxonomic hierarchy and starting rental pricing"
      widthClass="sm:max-w-[480px]"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Category Name <span className="text-destructive">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError(null)
            }}
            placeholder="e.g. Stage Rigging & Trusses"
            className="h-9 text-xs"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Starting Rental Price (₹/day)
          </label>
          <Input
            type="number"
            min={0}
            value={startingPrice}
            onChange={(e) => setStartingPrice(e.target.value)}
            className="h-9 text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe equipment grouped within this rental classification..."
            rows={3}
            className="text-xs resize-none"
          />
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="pt-4 flex items-center justify-end gap-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="h-9 text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || !name.trim()}
            className="h-9 text-xs bg-brand hover:bg-brand-hover text-brand-foreground"
          >
            {isSubmitting ? 'Saving...' : isNew ? 'Create Category' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </EntitySheet>
  )
}
