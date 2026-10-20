import { useRef } from 'react'
import { Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface LogoUploaderProps {
  logoUrl?: string
  initials?: string
  onLogoChange: (url: string) => void
  disabled?: boolean
}

export function LogoUploader({
  logoUrl,
  initials = 'SS',
  onLogoChange,
  disabled = false,
}: LogoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Allowed types: image/jpeg, image/png, image/webp
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      toast.error('Only JPG, PNG, and WebP images are supported.')
      return
    }

    // Max size: 2MB (2 * 1024 * 1024 bytes)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be under 2MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        onLogoChange(event.target.result)
        toast.success('Logo uploaded successfully.')
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRemove = () => {
    onLogoChange('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-4">
      {/* Visual Avatar / Logo Box */}
      <div className="size-20 rounded-2xl border-2 border-border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0 shadow-xs relative">
        {logoUrl ? (
          <img src={logoUrl} alt="Business logo" className="size-full object-cover" />
        ) : (
          <span className="font-serif font-bold text-xl text-brand">{initials}</span>
        )}
      </div>

      <div className="space-y-1.5">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          disabled={disabled}
          className="hidden"
          id="vendor-logo-input"
        />

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="text-xs h-8 gap-1.5"
          >
            <Upload className="size-3.5" />
            <span>{logoUrl ? 'Change logo' : 'Upload logo'}</span>
          </Button>

          {logoUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={handleRemove}
              className="text-xs h-8 text-danger hover:text-danger hover:bg-danger/10 gap-1.5"
            >
              <Trash2 className="size-3.5" />
              <span>Remove</span>
            </Button>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground">
          JPG, PNG or WebP up to 2MB. Square aspect recommended.
        </p>
      </div>
    </div>
  )
}
