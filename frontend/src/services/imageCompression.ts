/**
 * Shrinks large phone photos before upload. Lab report text stays readable at
 * 2000px on the long edge, while a 12 MP photo drops from ~4-6 MB to a few
 * hundred KB, which makes the upload and the scan much faster on mobile data.
 */
const MAX_EDGE_PX = 2000
const JPEG_QUALITY = 0.85
const COMPRESSIBLE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export interface PreparedUpload {
  file: File
  wasCompressed: boolean
  originalSize: number
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('image could not be read'))
    }
    image.src = url
  })
}

export async function prepareLabUpload(file: File): Promise<PreparedUpload> {
  const unchanged = { file, wasCompressed: false, originalSize: file.size }
  if (!COMPRESSIBLE_TYPES.has(file.type) || typeof document === 'undefined') return unchanged
  // Small images are already fast to send.
  if (file.size < 700_000) return unchanged

  try {
    const image = await loadImage(file)
    const scale = Math.min(1, MAX_EDGE_PX / Math.max(image.naturalWidth, image.naturalHeight))
    const width = Math.round(image.naturalWidth * scale)
    const height = Math.round(image.naturalHeight * scale)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return unchanged
    // White background so transparent PNGs do not turn black as JPEG.
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    context.drawImage(image, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    )
    if (!blob || blob.size >= file.size) return unchanged

    const baseName = file.name.replace(/\.[^.]+$/, '')
    return {
      file: new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() }),
      wasCompressed: true,
      originalSize: file.size,
    }
  } catch {
    // If the browser cannot decode the image, fall back to the original file.
    return unchanged
  }
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
