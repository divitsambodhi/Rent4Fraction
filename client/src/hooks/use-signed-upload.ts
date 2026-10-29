import { useState, useRef, useCallback, useEffect } from 'react'
import { apiClient } from '@/lib/api/client'
import { processImageUpload, type ProcessedImage } from '@/lib/image-processing'

export type UploadKind = 'equipment_image' | 'vendor_logo' | 'delivery_proof' | 'return_evidence'

export interface SignedUploadResponse {
  cloud_name: string
  api_key: string
  timestamp: number
  signature: string
  public_id: string
  folder: string
  upload_preset: string
  type: string
}

export interface UploadedAssetResult {
  public_id: string
  version: number
  width: number
  height: number
  format: string
  bytes: number
  secure_url: string
}

export interface UseSignedUploadOptions {
  kind?: UploadKind
  entityId?: string
  maxFiles?: number
  onProgress?: (progressPercent: number, fileName: string) => void
  onSuccess?: (result: UploadedAssetResult, file: File) => void
  onError?: (err: Error, file?: File) => void
}

/**
 * Maps Cloudinary raw API error response or status code to actionable user messages.
 */
function mapCloudinaryError(status: number, responseBody: string): string {
  try {
    const parsed = JSON.parse(responseBody)
    const msg = parsed?.error?.message || ''
    if (msg.includes('File size exceeds')) {
      return 'The image exceeds Cloudinary size limit (5 MB max).'
    }
    if (msg.includes('Invalid image file') || msg.includes('Unsupported format')) {
      return 'The image format is corrupted or unsupported.'
    }
    if (status === 401 || msg.includes('Invalid Signature')) {
      return 'Upload authorization failed: invalid signature. Please refresh.'
    }
    if (status === 420 || msg.includes('Rate limit')) {
      return 'Upload rate limit reached. Please wait a moment and try again.'
    }
    if (msg) return msg
  } catch {
    // Non-JSON response
  }

  if (status === 0) return 'Network failure while uploading. Please check connection.'
  if (status >= 500) return 'Cloudinary service temporarily unavailable (HTTP 5xx).'
  return `Upload failed with status code ${status}.`
}

/**
 * Hook for executing secure, direct-to-Cloudinary signed uploads.
 * Enforces client canvas resize (max 2000px, EXIF/GPS stripped, <= 5 MB),
 * requests server signature, uploads via XHR with progress/abort/retry,
 * and guards against accidental navigation during active uploads.
 */
export function useSignedUpload(defaultOptions: UseSignedUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Track active XMLHttpRequest instances for abortion
  const activeRequestsRef = useRef<Map<string, XMLHttpRequest>>(new Map())
  const activeCountRef = useRef(0)

  // Navigation guard against closing tab during upload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (activeCountRef.current > 0) {
        e.preventDefault()
        e.returnValue = 'An image upload is currently in progress. Are you sure you want to leave?'
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // Abort any pending requests on unmount
      activeRequestsRef.current.forEach((xhr) => {
        try {
          xhr.abort()
        } catch {
          // Ignore
        }
      })
      activeRequestsRef.current.clear()
    }
  }, [])

  const executeXhrUpload = useCallback(
    (
      signed: SignedUploadResponse,
      blob: Blob,
      fileName: string,
      processed: ProcessedImage,
      requestId: string
    ): Promise<UploadedAssetResult> => {
      return new Promise<UploadedAssetResult>((resolve, reject) => {
        // Deterministic offline simulation for FakeStorageProvider in dev/tests
        if (signed.cloud_name === 'fake_cloud') {
          setTimeout(() => {
            setProgress(50)
            defaultOptions.onProgress?.(50, fileName)
          }, 40)

          setTimeout(() => {
            setProgress(100)
            defaultOptions.onProgress?.(100, fileName)
            activeRequestsRef.current.delete(requestId)
            resolve({
              public_id: signed.public_id,
              version: 1,
              width: processed.width,
              height: processed.height,
              format: 'webp',
              bytes: processed.sizeBytes,
              secure_url: `https://res.cloudinary.com/fake_cloud/image/upload/v1/${signed.public_id}.webp`,
            })
          }, 100)
          return
        }

        const url = `https://api.cloudinary.com/v1_1/${signed.cloud_name}/image/upload`
        const formData = new FormData()
        formData.append('file', blob, fileName)
        formData.append('api_key', signed.api_key)
        formData.append('timestamp', String(signed.timestamp))
        formData.append('signature', signed.signature)
        formData.append('public_id', signed.public_id)
        formData.append('upload_preset', signed.upload_preset)
        formData.append('type', signed.type)

        const xhr = new XMLHttpRequest()
        activeRequestsRef.current.set(requestId, xhr)

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 100)
            setProgress(pct)
            defaultOptions.onProgress?.(pct, fileName)
          }
        }

        xhr.onload = () => {
          activeRequestsRef.current.delete(requestId)
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const res = JSON.parse(xhr.responseText)
              resolve({
                public_id: res.public_id,
                version: res.version || 1,
                width: res.width || processed.width,
                height: res.height || processed.height,
                format: res.format || 'webp',
                bytes: res.bytes || processed.sizeBytes,
                secure_url: res.secure_url,
              })
            } catch {
              reject(new Error('Invalid JSON response received from Cloudinary.'))
            }
          } else {
            const errDetail = mapCloudinaryError(xhr.status, xhr.responseText)
            reject(new Error(errDetail))
          }
        }

        xhr.onerror = () => {
          activeRequestsRef.current.delete(requestId)
          reject(new Error(mapCloudinaryError(0, '')))
        }

        xhr.onabort = () => {
          activeRequestsRef.current.delete(requestId)
          reject(new Error('Upload was cancelled.'))
        }

        xhr.open('POST', url, true)
        xhr.send(formData)
      })
    },
    [defaultOptions]
  )

  /**
   * Uploads a single file through the pipeline:
   * resize/strip EXIF -> request server signature -> upload to Cloudinary -> return metadata.
   */
  const upload = useCallback(
    async (
      file: File,
      overrideKind?: UploadKind,
      overrideEntityId?: string
    ): Promise<UploadedAssetResult> => {
      const kind = overrideKind || defaultOptions.kind || 'equipment_image'
      const entityId = overrideEntityId || defaultOptions.entityId

      setIsUploading(true)
      setError(null)
      setProgress(0)
      activeCountRef.current += 1

      const reqId = `upl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

      try {
        // 1. Client-side canvas preprocessing: strip EXIF/GPS, resize, WebP conversion
        const maxLongEdge = kind === 'vendor_logo' ? 800 : 2000
        const maxBytes = kind === 'vendor_logo' ? 2 * 1024 * 1024 : 5 * 1024 * 1024

        const processed = await processImageUpload(file, maxLongEdge, 0.8)

        if (processed.sizeBytes > maxBytes) {
          throw new Error(
            `Image size (${Math.round(processed.sizeBytes / 1024)} KB) exceeds ${
              kind === 'vendor_logo' ? '2 MB' : '5 MB'
            } limit after compression.`
          )
        }

        // 2. Request upload signature from FastAPI backend
        const signedParams = await apiClient.post<SignedUploadResponse>('/api/v1/uploads/sign', {
          kind,
          entity_id: entityId,
        })

        // 3. Direct upload to Cloudinary with retry (up to 3 attempts on network/5xx error)
        let lastError: Error | null = null
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const result = await executeXhrUpload(
              signedParams,
              processed.file,
              file.name,
              processed,
              reqId
            )
            defaultOptions.onSuccess?.(result, file)
            return result
          } catch (err: unknown) {
            const e = err instanceof Error ? err : new Error(String(err))
            lastError = e
            // If cancelled, do not retry
            if (e.message.includes('cancelled')) {
              throw e
            }
            // Retry only on network failure or 5xx
            if (attempt < 3 && (e.message.includes('Network failure') || e.message.includes('HTTP 5xx'))) {
              await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500))
              continue
            }
            throw e
          }
        }

        throw lastError || new Error('Upload failed after retries.')
      } catch (err: unknown) {
        const e = err instanceof Error ? err : new Error(String(err))
        setError(e.message)
        defaultOptions.onError?.(e, file)
        throw e
      } finally {
        activeCountRef.current = Math.max(0, activeCountRef.current - 1)
        if (activeCountRef.current === 0) {
          setIsUploading(false)
        }
      }
    },
    [defaultOptions, executeXhrUpload]
  )

  /**
   * Uploads multiple files with a concurrency limit (up to 3 parallel).
   */
  const uploadMultiple = useCallback(
    async (
      files: File[],
      overrideKind?: UploadKind,
      overrideEntityId?: string
    ): Promise<UploadedAssetResult[]> => {
      const results: UploadedAssetResult[] = []
      const concurrency = 3
      const queue = [...files]

      const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
        while (queue.length > 0) {
          const item = queue.shift()
          if (!item) break
          const res = await upload(item, overrideKind, overrideEntityId)
          results.push(res)
        }
      })

      await Promise.all(workers)
      return results
    },
    [upload]
  )

  /**
   * Aborts all active in-flight uploads.
   */
  const abort = useCallback((uploadId?: string) => {
    if (uploadId) {
      const xhr = activeRequestsRef.current.get(uploadId)
      if (xhr) {
        xhr.abort()
        activeRequestsRef.current.delete(uploadId)
      }
    } else {
      activeRequestsRef.current.forEach((xhr) => xhr.abort())
      activeRequestsRef.current.clear()
    }
    setIsUploading(false)
  }, [])

  return {
    upload,
    uploadMultiple,
    abort,
    isUploading,
    progress,
    error,
  }
}
