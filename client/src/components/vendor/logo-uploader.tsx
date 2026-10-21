import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { processImageUpload } from '@/lib/image-processing'
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
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    try {
      // Downscale logo to max 800px on the long side with EXIF correction
      const processed = await processImageUpload(file, 800, 0.85)
      onLogoChange(processed.dataUrl)
      toast.success('Logo uploaded and optimized.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Logo upload failed.')
    } finally {
      setIsProcessing(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemove = () => {
    onLogoChange('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
      {/* Visual Avatar / Logo Box */}
      <div className="size-20 rounded-2xl border-2 border-border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0 shadow-xs relative">
        {logoUrl ? (
          <img src={logoUrl} alt="Business logo" className="size-full object-cover" />
        ) : (
          <span className="font-serif font-bold text-xl text-brand">{initials}</span>
        )}
      </div>

      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          disabled={disabled || isProcessing}
          className="hidden"
          id="vendor-logo-input"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={disabled || isProcessing}
            onClick={() => fileInputRef.current?.click()}
            className="text-xs h-11 sm:h-9 px-4 gap-1.5 cursor-pointer"
          >
            {isProcessing ? (
              <Icon name="loader" size={14} className="animate-spin" />
            ) : (
              <Icon name="upload" size={14} />
            )}
            <span>{isProcessing ? 'Optimizing...' : logoUrl ? 'Change logo' : 'Upload logo'}</span>
          </Button>

          {logoUrl && (
            <Button
              type="button"
              variant="ghost"
              disabled={disabled || isProcessing}
              onClick={handleRemove}
              className="text-xs h-11 sm:h-9 px-3 text-danger hover:text-danger hover:bg-danger/10 gap-1.5 cursor-pointer"
            >
              <Icon name="trash" size={14} />
              <span>Remove</span>
            </Button>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground">
          Auto-scaled square photo up to 1600px.
        </p>
      </div>
    </div>
  )
}
