import exifr from 'exifr'

const MAX_SIZE = 1600
const THUMB_SIZE = 320

async function resize(bitmap, maxSize, quality) {
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Compression impossible'))), 'image/jpeg', quality),
  )
}

// Lit le GPS et la date dans l'EXIF, puis compresse l'image et crée une miniature.
export async function processImage(file) {
  let exif = null
  try {
    // Il faut demander les balises GPS brutes : exifr en déduit latitude / longitude.
    exif = await exifr.parse(file, {
      pick: ['DateTimeOriginal', 'GPSLatitude', 'GPSLatitudeRef', 'GPSLongitude', 'GPSLongitudeRef'],
    })
  } catch {
    // Pas d'EXIF lisible : la photo sera placée à la main.
  }

  let bitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error(`Format non pris en charge : ${file.name}`)
  }
  const [blob, thumb] = await Promise.all([resize(bitmap, MAX_SIZE, 0.82), resize(bitmap, THUMB_SIZE, 0.7)])
  bitmap.close()

  const hasGps = Number.isFinite(exif?.latitude) && Number.isFinite(exif?.longitude)
  return {
    blob,
    thumb,
    lat: hasGps ? exif.latitude : null,
    lng: hasGps ? exif.longitude : null,
    gpsSource: hasGps ? 'exif' : null,
    takenAt: exif?.DateTimeOriginal instanceof Date ? exif.DateTimeOriginal.getTime() : null,
  }
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export async function dataUrlToBlob(dataUrl) {
  return (await fetch(dataUrl)).blob()
}
