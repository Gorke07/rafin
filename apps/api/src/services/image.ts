import sharp from 'sharp'
import { randomUUID } from 'crypto'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const UPLOAD_DIR = 'uploads/covers'

interface ProcessedImage {
  coverPath: string
  filename: string
}

/**
 * Download an image from a URL and save it locally with resizing.
 */
export async function downloadAndProcessCover(url: string): Promise<ProcessedImage | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null

    const buffer = Buffer.from(await response.arrayBuffer())
    return processAndSaveCover(buffer)
  } catch (error) {
    console.error('Failed to download cover:', error)
    return null
  }
}

/**
 * Process an image buffer: resize, optimize, and save as WebP.
 */
export async function processAndSaveCover(input: Buffer): Promise<ProcessedImage> {
  await mkdir(UPLOAD_DIR, { recursive: true })

  const filename = `${randomUUID()}.webp`
  const filepath = join(UPLOAD_DIR, filename)

  await sharp(input)
    .resize(600, 900, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toFile(filepath)

  return {
    coverPath: `/uploads/covers/${filename}`,
    filename,
  }
}
