import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  FileText,
  DollarSign,
  Eye,
  ImageIcon,
  Layers,
  Save,
  Truck,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/account/confirm-dialog'
import { IncludesEditor } from './includes-editor'
import { SpecsEditor } from './specs-editor'
import { ImageUploader, type UploadedImage } from './image-uploader'
import { EquipmentPreview } from './equipment-preview'
import type { EquipmentImage, InventoryItem } from '@/types/vendor'
import { cn } from '@/lib/utils'

const equipmentSchema = z.object({
  name: z
    .string()
    .min(3, 'Equipment name must be at least 3 characters')
    .max(80, 'Equipment name cannot exceed 80 characters'),
  category_id: z.string().min(1, 'Please select a category'),
  description: z
    .string()
    .max(1000, 'Description cannot exceed 1000 characters'),
  delivery_available: z.boolean(),
  price_per_day: z.number().positive('Price per day must be greater than 0'),
  security_deposit: z.number().min(0, 'Deposit must be 0 or greater'),
  quantity: z.number().int().min(0, 'Quantity must be 0 or greater'),
  min_rental_days: z.number().int().min(1, 'Minimum rental days must be at least 1'),
  status: z.enum(['active', 'inactive', 'out_of_stock']),
})

export type EquipmentFormData = z.infer<typeof equipmentSchema>

interface EquipmentFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  equipmentId: string | null // 'new' or equipment ID
  initialItem?: InventoryItem | null
  categories: { id: string; name: string }[]
  onSave: (data: Partial<InventoryItem>, andAddAnother?: boolean) => Promise<void>
}

type SheetTab = 'details' | 'pricing' | 'images' | 'specs' | 'preview'

export function EquipmentFormSheet({
  open,
  onOpenChange,
  equipmentId,
  initialItem,
  categories,
  onSave,
}: EquipmentFormSheetProps) {
  const isNew = equipmentId === 'new'
  const [activeTab, setActiveTab] = useState<SheetTab>('details')
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Sub-states not handled directly by basic scalar inputs
  const [images, setImages] = useState<UploadedImage[]>([])
  const [includes, setIncludes] = useState<string[]>([])
  const [specifications, setSpecifications] = useState<Record<string, string | number>>({})

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<EquipmentFormData>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      name: '',
      category_id: categories[0]?.id || '1',
      description: '',
      delivery_available: true,
      price_per_day: 1500,
      security_deposit: 2000,
      quantity: 1,
      min_rental_days: 1,
      status: 'active',
    },
  })

  // Watch for live preview tab
  const formValues = watch()
  const descriptionLength = formValues.description?.length || 0

  // Populate form when initialItem or equipmentId changes
  useEffect(() => {
    if (initialItem && !isNew) {
      reset({
        name: initialItem.name,
        category_id: initialItem.category_id || categories[0]?.id || 'speakers',
        description: initialItem.description || '',
        delivery_available: initialItem.delivery_available ?? true,
        price_per_day: initialItem.price,
        security_deposit: initialItem.deposit,
        quantity: initialItem.stock,
        min_rental_days: initialItem.min_rental_days || 1,
        status: (initialItem.status === 'archived' ? 'inactive' : initialItem.status) as 'active' | 'inactive' | 'out_of_stock',
      })
      setIncludes(initialItem.included || [])
      setSpecifications(initialItem.specifications || {})
      const initialImages: UploadedImage[] = (initialItem.images || []).map((img, idx) => {
        const urlStr = typeof img === 'string' ? img : img.url || ''
        const isPrim = typeof img === 'object' && img ? img.is_primary : idx === 0
        return {
          id: `img-${idx}`,
          url: urlStr,
          isPrimary: isPrim,
        }
      })
      if (initialImages.length === 0 && initialItem.primary_image_url) {
        initialImages.push({
          id: 'img-0',
          url: initialItem.primary_image_url,
          isPrimary: true,
        })
      }
      setImages(initialImages)
    } else if (isNew) {
      reset({
        name: '',
        category_id: categories[0]?.id || '1',
        description: '',
        delivery_available: true,
        price_per_day: 1500,
        security_deposit: 2000,
        quantity: 1,
        min_rental_days: 1,
        status: 'active',
      })
      setIncludes([])
      setSpecifications({})
      setImages([])
    }
    setActiveTab('details')
  }, [initialItem, isNew, reset, categories])

  // Unsaved changes beforeunload guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  const handleClose = () => {
    if (isDirty) {
      setShowDiscardDialog(true)
    } else {
      onOpenChange(false)
    }
  }

  const submitForm = async (data: EquipmentFormData, andAddAnother = false) => {
    setIsSubmitting(true)
    try {
      const primaryUrl = images.find((i) => i.isPrimary)?.url || images[0]?.url || ''
      const mappedImages: EquipmentImage[] = images.map((img, idx) => ({
        image_id: img.id,
        url: img.url,
        is_primary: img.isPrimary,
        sort_order: idx,
      }))

      const payload: Partial<InventoryItem> = {
        ...data,
        equipment_id: isNew || !equipmentId ? undefined : equipmentId,
        id: isNew || !equipmentId ? undefined : equipmentId,
        included: includes,
        includes: includes,
        specifications: specifications,
        images: mappedImages,
        primary_image_url: primaryUrl,
        image: primaryUrl,
      }
      await onSave(payload, andAddAnother)

      if (andAddAnother) {
        reset({
          name: '',
          category_id: categories[0]?.id || '1',
          description: '',
          delivery_available: true,
          price_per_day: 1500,
          security_deposit: 2000,
          quantity: 1,
          min_rental_days: 1,
          status: 'active',
        })
        setIncludes([])
        setSpecifications({})
        setImages([])
        setActiveTab('details')
      } else {
        onOpenChange(false)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedCategoryName =
    categories.find((c) => c.id === formValues.category_id)?.name || 'Event Equipment'

  return (
    <>
      <Sheet open={open} onOpenChange={(val) => !val && handleClose()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[640px] p-0 flex flex-col z-50 overflow-hidden"
        >
          {/* Header */}
          <SheetHeader className="p-6 border-b border-border bg-surface shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Catalog Manager
                </span>
                <SheetTitle className="font-serif text-xl sm:text-2xl mt-0.5">
                  {isNew ? 'Add new equipment' : `Edit: ${initialItem?.name || 'Equipment'}`}
                </SheetTitle>
              </div>
            </div>

            {/* Sheet Tabs */}
            <nav
              aria-label="Equipment form sections"
              className="flex items-center gap-1 mt-4 pt-2 border-t border-border overflow-x-auto no-scrollbar"
            >
              {[
                { id: 'details', label: 'Details', icon: FileText },
                { id: 'pricing', label: 'Pricing & stock', icon: DollarSign },
                { id: 'images', label: 'Images', icon: ImageIcon, badge: images.length },
                { id: 'specs', label: 'Specs', icon: Layers },
                { id: 'preview', label: 'Preview', icon: Eye },
              ].map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as SheetTab)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap',
                      isActive
                        ? 'bg-brand text-white shadow-xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                    )}
                  >
                    <Icon className="size-3.5" />
                    <span>{tab.label}</span>
                    {typeof tab.badge === 'number' && tab.badge > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-white/20 text-white">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          </SheetHeader>

          {/* Form Body (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Tab 1: Details */}
            {activeTab === 'details' && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="eq-name" className="text-xs font-semibold text-foreground block mb-1.5">
                    Equipment Name <span className="text-danger">*</span>
                  </label>
                  <input
                    id="eq-name"
                    type="text"
                    {...register('name')}
                    placeholder="e.g. Pro Line-Array Speaker Pair"
                    className="w-full text-xs sm:text-sm p-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                  {errors.name && (
                    <p className="text-[11px] text-danger mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="eq-category" className="text-xs font-semibold text-foreground block mb-1.5">
                    Category <span className="text-danger">*</span>
                  </label>
                  <select
                    id="eq-category"
                    {...register('category_id')}
                    className="w-full text-xs sm:text-sm p-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="eq-desc" className="text-xs font-semibold text-foreground">
                      Description
                    </label>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {descriptionLength}/1000
                    </span>
                  </div>
                  <textarea
                    id="eq-desc"
                    rows={4}
                    maxLength={1000}
                    {...register('description')}
                    placeholder="Describe condition, ideal event types, and connection setup..."
                    className="w-full text-xs sm:text-sm p-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand resize-y"
                  />
                  {errors.description && (
                    <p className="text-[11px] text-danger mt-1">{errors.description.message}</p>
                  )}
                </div>

                <div className="pt-2">
                  <IncludesEditor items={includes} onChange={setIncludes} />
                </div>

                <div className="pt-3 border-t border-border">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('delivery_available')}
                      className="rounded border-border text-brand focus:ring-brand size-4"
                    />
                    <div>
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Truck className="size-3.5 text-brand" />
                        <span>Delivery & pickup offered</span>
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        Allow customers to choose venue delivery in addition to collection
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Tab 2: Pricing & Stock */}
            {activeTab === 'pricing' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="eq-price" className="text-xs font-semibold text-foreground block mb-1.5">
                      Daily Rental Rate (₹) <span className="text-danger">*</span>
                    </label>
                    <input
                      id="eq-price"
                      type="number"
                      step="50"
                      min="1"
                      {...register('price_per_day', { valueAsNumber: true })}
                      className="w-full text-xs sm:text-sm p-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-brand tabular-nums"
                    />
                    {errors.price_per_day && (
                      <p className="text-[11px] text-danger mt-1">{errors.price_per_day.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="eq-deposit" className="text-xs font-semibold text-foreground block mb-1.5">
                      Refundable Security Deposit (₹) <span className="text-danger">*</span>
                    </label>
                    <input
                      id="eq-deposit"
                      type="number"
                      step="100"
                      min="0"
                      {...register('security_deposit', { valueAsNumber: true })}
                      className="w-full text-xs sm:text-sm p-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-brand tabular-nums"
                    />
                    {errors.security_deposit && (
                      <p className="text-[11px] text-danger mt-1">{errors.security_deposit.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="eq-quantity" className="text-xs font-semibold text-foreground block mb-1.5">
                      Total Inventory Quantity <span className="text-danger">*</span>
                    </label>
                    <input
                      id="eq-quantity"
                      type="number"
                      min="0"
                      {...register('quantity', { valueAsNumber: true })}
                      className="w-full text-xs sm:text-sm p-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-brand tabular-nums"
                    />
                    {errors.quantity && (
                      <p className="text-[11px] text-danger mt-1">{errors.quantity.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="eq-min-days" className="text-xs font-semibold text-foreground block mb-1.5">
                      Minimum Rental Duration (Days) <span className="text-danger">*</span>
                    </label>
                    <input
                      id="eq-min-days"
                      type="number"
                      min="1"
                      {...register('min_rental_days', { valueAsNumber: true })}
                      className="w-full text-xs sm:text-sm p-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-brand tabular-nums"
                    />
                    {errors.min_rental_days && (
                      <p className="text-[11px] text-danger mt-1">{errors.min_rental_days.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="eq-status" className="text-xs font-semibold text-foreground block mb-1.5">
                    Listing Status <span className="text-danger">*</span>
                  </label>
                  <select
                    id="eq-status"
                    {...register('status')}
                    className="w-full text-xs sm:text-sm p-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer"
                  >
                    <option value="active">Active (Visible in public catalogue)</option>
                    <option value="inactive">Inactive (Hidden from public catalogue)</option>
                    <option value="out_of_stock">Out of stock (Shown as unavailable)</option>
                  </select>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Archived status can only be set from the inventory row actions menu.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 3: Images */}
            {activeTab === 'images' && (
              <ImageUploader images={images} onChange={setImages} />
            )}

            {/* Tab 4: Specs */}
            {activeTab === 'specs' && (
              <SpecsEditor specifications={specifications} onChange={setSpecifications} />
            )}

            {/* Tab 5: Preview */}
            {activeTab === 'preview' && (
              <EquipmentPreview
                formValues={{
                  name: formValues.name,
                  description: formValues.description,
                  category_id: formValues.category_id,
                  category_name: selectedCategoryName,
                  price_per_day: formValues.price_per_day,
                  security_deposit: formValues.security_deposit,
                  quantity: formValues.quantity,
                  min_rental_days: formValues.min_rental_days,
                  delivery_available: formValues.delivery_available,
                  images: images,
                  specifications: specifications,
                  included: includes,
                  status: formValues.status,
                }}
              />
            )}
          </div>

          {/* Sticky Footer */}
          <div className="p-4 border-t border-border bg-surface shrink-0 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>

            <div className="flex items-center gap-2">
              {isNew && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={handleSubmit((data) => submitForm(data, true))}
                  className="text-xs"
                >
                  Save and add another
                </Button>
              )}

              <Button
                type="button"
                size="sm"
                disabled={isSubmitting}
                onClick={handleSubmit((data) => submitForm(data, false))}
                className="bg-brand hover:bg-brand-hover text-white text-xs gap-1.5"
              >
                <Save className="size-3.5" />
                <span>{isSubmitting ? 'Saving...' : isNew ? 'Save equipment' : 'Save changes'}</span>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Discard Changes Dialog */}
      <ConfirmDialog
        open={showDiscardDialog}
        onOpenChange={setShowDiscardDialog}
        title="Discard unsaved modifications?"
        description="You have unsaved changes in this equipment form. Closing will discard them."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        variant="danger"
        onConfirm={() => {
          setShowDiscardDialog(false)
          onOpenChange(false)
        }}
      />
    </>
  )
}
