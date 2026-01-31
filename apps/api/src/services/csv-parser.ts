export interface ParsedImportBook {
  title: string
  authors: string[]
  isbn: string | null
  publisher: string | null
  pageCount: number | null
  publishedYear: number | null
  bindingType: 'paperback' | 'hardcover' | 'ebook' | null
  status: 'tbr' | 'reading' | 'completed' | 'dnf'
  rating: number | null
  review: string | null
  dateRead: Date | null
  dateAdded: Date | null
}

export interface ImportResult {
  total: number
  imported: number
  skipped: number
  errors: string[]
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      fields.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  fields.push(current.trim())
  return fields
}

function cleanISBN(raw: string): string | null {
  const cleaned = raw.replace(/[=""\s-]/g, '')
  if (/^\d{10}$/.test(cleaned) || /^\d{13}$/.test(cleaned)) return cleaned
  return null
}

function mapShelfToStatus(shelf: string): 'tbr' | 'reading' | 'completed' | 'dnf' {
  const normalized = shelf.toLowerCase().trim()
  if (normalized === 'read') return 'completed'
  if (normalized === 'currently-reading') return 'reading'
  if (normalized === 'did-not-finish' || normalized === 'dnf') return 'dnf'
  return 'tbr'
}

function mapBinding(binding: string): 'paperback' | 'hardcover' | 'ebook' | null {
  const normalized = binding.toLowerCase().trim()
  if (normalized.includes('paperback') || normalized.includes('mass market')) return 'paperback'
  if (normalized.includes('hardcover') || normalized.includes('hardback')) return 'hardcover'
  if (normalized.includes('ebook') || normalized.includes('kindle')) return 'ebook'
  return null
}

function parseGoodreadsDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null
  const cleaned = dateStr.trim()

  const slashMatch = cleaned.match(/^(\d{4})\/(\d{2})\/(\d{2})$/)
  if (slashMatch) {
    return new Date(Number(slashMatch[1]), Number(slashMatch[2]) - 1, Number(slashMatch[3]))
  }

  const parsed = new Date(cleaned)
  if (!Number.isNaN(parsed.getTime())) return parsed

  return null
}

function parseNumber(val: string): number | null {
  const num = Number.parseInt(val, 10)
  return Number.isNaN(num) || num <= 0 ? null : num
}

export function parseGoodreadsCSV(csvContent: string): ParsedImportBook[] {
  const lines = csvContent.split('\n').filter((line) => line.trim() !== '')
  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim())

  const colIndex = (name: string): number => headers.findIndex((h) => h === name.toLowerCase())

  const titleIdx = colIndex('title')
  const authorIdx = colIndex('author')
  const additionalAuthorsIdx = colIndex('additional authors')
  const isbnIdx = colIndex('isbn')
  const isbn13Idx = colIndex('isbn13')
  const ratingIdx = colIndex('my rating')
  const publisherIdx = colIndex('publisher')
  const bindingIdx = colIndex('binding')
  const pagesIdx = colIndex('number of pages')
  const yearIdx = colIndex('year published')
  const origYearIdx = colIndex('original publication year')
  const dateReadIdx = colIndex('date read')
  const dateAddedIdx = colIndex('date added')
  const shelfIdx = colIndex('exclusive shelf')
  const reviewIdx = colIndex('my review')

  if (titleIdx === -1) return []

  const books: ParsedImportBook[] = []

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i])
    if (fields.length < 3) continue

    const get = (idx: number): string => (idx >= 0 && idx < fields.length ? fields[idx] : '')

    const title = get(titleIdx)
    if (!title) continue

    const mainAuthor = get(authorIdx)
    const additionalAuthors = get(additionalAuthorsIdx)
    const allAuthors = [mainAuthor, ...additionalAuthors.split(',')]
      .map((a) => a.trim())
      .filter(Boolean)

    const isbn13 = cleanISBN(get(isbn13Idx))
    const isbn10 = cleanISBN(get(isbnIdx))

    const rating = parseNumber(get(ratingIdx))
    const review = get(reviewIdx) || null

    const yearPublished = parseNumber(get(yearIdx))
    const origYear = parseNumber(get(origYearIdx))

    books.push({
      title,
      authors: allAuthors.length > 0 ? allAuthors : ['Unknown'],
      isbn: isbn13 || isbn10,
      publisher: get(publisherIdx) || null,
      pageCount: parseNumber(get(pagesIdx)),
      publishedYear: origYear || yearPublished,
      bindingType: mapBinding(get(bindingIdx)),
      status: mapShelfToStatus(get(shelfIdx)),
      rating: rating && rating > 0 ? rating : null,
      review: review && review.length > 0 ? review : null,
      dateRead: parseGoodreadsDate(get(dateReadIdx)),
      dateAdded: parseGoodreadsDate(get(dateAddedIdx)),
    })
  }

  return books
}
