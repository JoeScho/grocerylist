// Shrinks a photo so it fits comfortably inside a Firestore document (1 MB cap).
export async function fileToDataUrl(file: File, maxSide = 900, maxBytes = 600_000): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * ratio)
  canvas.height = Math.round(bitmap.height * ratio)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  let quality = 0.8
  let url = canvas.toDataURL('image/jpeg', quality)
  while (url.length > maxBytes && quality > 0.3) {
    quality -= 0.1
    url = canvas.toDataURL('image/jpeg', quality)
  }
  return url
}
