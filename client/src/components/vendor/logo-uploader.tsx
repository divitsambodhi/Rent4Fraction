import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { useSignedUpload } from '@/hooks/use-signed-upload'
import { CloudImage } from '@/components/shared/cloud-image'
import { toast } from 'sonner'

interface LogoUploaderProps {
  logoUrl?: string
  logoPublicId?: string
  initials?: string
  onLogoChange: (url: string, publicId?: string) => void
  disabled?: boolean
}

export function LogoUploader({
  logoUrl,
  logoPublicId,
  initials = 'SS',
  onLogoChange,
  disabled = false,
}: LogoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { upload, isUploading, progress } = useSignedUpload({
    kind: 'vendor_logo',
  })

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const res = await upload(file, 'vendor_logo')
      onLogoChange(res.secure_url, res.public_id)
      toast.success('Logo uploaded and optimized.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Logo upload failed.')
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemove = () => {
    onLogoChange('', '')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const hasLogo = Boolean(logoUrl || logoPublicId)

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
      {/* Visual Avatar / Logo Box */}
      <div className="size-20 rounded-2xl border-2 border-border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0 shadow-xs relative">
        {hasLogo ? (
          <CloudImage
            publicId={logoPublicId}
            src={logoUrl}
            alt="Business logo"
            preset="logo"
            aspectRatio="1/1"
            className="size-full rounded-none"
          />
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
          disabled={disabled || isUploading}
          className="hidden"
          id="vendor-logo-input"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={disabled || isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="text-xs h-11 sm:h-9 px-4 gap-1.5 cursor-pointer"
          >
            {isUploading ? (
              <>
                <Icon name="loader" size={14} className="animate-spin" />
                <span>Uploading {progress > 0 ? `${progress}%` : '...'}</span>
              </>
            ) : (
              <>
                <Icon name="upload" size={14} />
                <span>{hasLogo ? 'Change logo' : 'Upload logo'}</span>
              </>
            )}
          </Button>

          {hasLogo && (
            <Button
              type="button"
              variant="ghost"
              disabled={disabled || isUploading}
              onClick={handleRemove}
              className="text-xs h-11 sm:h-9 px-3 text-danger hover:text-danger hover:bg-danger/10 gap-1.5 cursor-pointer"
            >
              <Icon name="trash" size={14} />
              <span>Remove</span>
            </Button>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground">
          Auto-scaled square photo up to 800px (max 2 MB).
        </p>
      </div>
    </div>
  )
}
