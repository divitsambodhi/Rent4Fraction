import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SpecRow {
  id: string
  key: string
  value: string
}

interface SpecsEditorProps {
  specifications: Record<string, string | number>
  onChange: (specs: Record<string, string | number>) => void
  disabled?: boolean
  maxSpecs?: number
}

export function SpecsEditor({
  specifications,
  onChange,
  disabled = false,
  maxSpecs = 20,
}: SpecsEditorProps) {
  // Local state initialized from specifications Record
  const [rows, setRows] = useState<SpecRow[]>(() => {
    const entries = Object.entries(specifications || {})
    if (entries.length === 0) {
      return [{ id: 'row-0', key: '', value: '' }]
    }
    return entries.map(([key, val], idx) => ({
      id: `row-${idx}`,
      key,
      value: String(val),
    }))
  })

  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const emitChange = (updatedRows: SpecRow[]) => {
    const obj: Record<string, string | number> = {}
    updatedRows.forEach((r) => {
      const k = r.key.trim()
      const v = r.value.trim()
      if (k && v) {
        // Parse as number if numeric
        const num = Number(v)
        obj[k] = !isNaN(num) && v !== '' ? num : v
      }
    })
    onChange(obj)
  }

  const handleAdd = () => {
    const k = newKey.trim()
    const v = newValue.trim()
    if (!k || !v) {
      setErrorMsg('Both specification name and value are required.')
      return
    }

    if (rows.some((r) => r.key.toLowerCase() === k.toLowerCase())) {
      setErrorMsg(`Specification "${k}" already exists. Keys must be unique.`)
      return
    }

    if (rows.length >= maxSpecs) {
      setErrorMsg(`Maximum ${maxSpecs} specifications allowed.`)
      return
    }

    setErrorMsg('')
    const next = [...rows.filter((r) => r.key.trim() || r.value.trim()), { id: `row-${Date.now()}`, key: k, value: v }]
    setRows(next)
    emitChange(next)
    setNewKey('')
    setNewValue('')
  }

  const handleRemove = (id: string) => {
    const next = rows.filter((r) => r.id !== id)
    setRows(next)
    emitChange(next)
  }

  const validCount = rows.filter((r) => r.key.trim() && r.value.trim()).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground">
          Technical specifications (Key / Value pairs)
        </label>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {validCount}/{maxSpecs} specs
        </span>
      </div>

      {/* Add New Spec Row */}
      <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          <input
            type="text"
            value={newKey}
            onChange={(e) => {
              setNewKey(e.target.value)
              setErrorMsg('')
            }}
            disabled={disabled || validCount >= maxSpecs}
            placeholder="Spec name (e.g. Power, Weight)"
            className="sm:col-span-2 text-xs sm:text-sm p-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <input
            type="text"
            value={newValue}
            onChange={(e) => {
              setNewValue(e.target.value)
              setErrorMsg('')
            }}
            disabled={disabled || validCount >= maxSpecs}
            placeholder="Value (e.g. 2400W RMS, 18 kg)"
            className="sm:col-span-2 text-xs sm:text-sm p-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleAdd}
            disabled={disabled || !newKey.trim() || !newValue.trim() || validCount >= maxSpecs}
            className="text-xs h-9 bg-brand hover:bg-brand-hover text-white gap-1"
          >
            <Plus className="size-3.5" />
            <span>Add</span>
          </Button>
        </div>
        {errorMsg && (
          <p className="text-[11px] text-danger">{errorMsg}</p>
        )}
      </div>

      {/* Existing Specs Rows */}
      {rows.length > 0 && rows.some((r) => r.key.trim() || r.value.trim()) && (
        <div className="rounded-xl border border-border divide-y divide-border/60 overflow-hidden bg-background">
          {rows
            .filter((r) => r.key.trim() || r.value.trim())
            .map((row) => (
              <div
                key={row.id}
                className="p-2.5 flex items-center justify-between gap-3 text-xs text-foreground group hover:bg-muted/30"
              >
                <div className="grid grid-cols-2 gap-2 flex-1 min-w-0">
                  <span className="font-semibold text-foreground truncate">{row.key}</span>
                  <span className="text-muted-foreground truncate">{row.value}</span>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled}
                  onClick={() => handleRemove(row.id)}
                  className="size-7 text-danger hover:text-danger hover:bg-danger/10 shrink-0"
                  aria-label={`Remove ${row.key}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
