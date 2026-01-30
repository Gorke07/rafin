import * as cheerio from 'cheerio'
import { sanitizeDescription } from '../sanitize-html'
import type { BookLookupResult, BookScraper } from './types'

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
}

interface IdefixVariant {
  id: number
  name: string
  originalName?: string
  authorName?: string
  images?: Array<{ src: string }>
  properties?: Array<{ text: string; valueText: string; id: number }>
}

interface IdefixSearchItem {
  brandName?: string
  isBook?: boolean
  variants?: IdefixVariant[]
}

interface IdefixProductDetail {
  id: number
  barcode?: string
  title?: string
  brandName?: string
  authorName?: string
  description?: string
  subDescription?: string
  images?: Array<{ src: string }>
}

function getNextData(html: string): unknown {
  const $ = cheerio.load(html)
  const script = $('#__NEXT_DATA__').html()
  if (!script) return null
  try {
    return JSON.parse(script)
  } catch {
    return null
  }
}

function getCoverFromImages(images?: Array<{ src: string }>): string | undefined {
  if (!images || images.length === 0) return undefined
  // URL format: resize/{width}/{height}/product/...
  // {size} placeholder gets replaced with "600/0/" (width 600, height auto)
  return images[0].src.replace('{size}', '600/0/')
}

function parseDescription(html: string): {
  pageCount?: number
  publishedYear?: number
  language?: string
  bindingType?: 'paperback' | 'hardcover' | 'ebook'
} {
  const result: ReturnType<typeof parseDescription> = {}
  const $ = cheerio.load(html)
  const text = $.text()

  const pageMatch = text.match(/sayfa\s*sayı?s[ıi]\s*:?\s*(\d+)/i)
  if (pageMatch) result.pageCount = Number.parseInt(pageMatch[1])

  const yearMatch = text.match(/bask[ıi]\s*y[ıi]l[ıi]\s*:?\s*(\d{4})/i) || text.match(/(\d{4})/)
  if (yearMatch) result.publishedYear = Number.parseInt(yearMatch[1])

  const langMatch = text.match(/dil[i]?\s*:?\s*([\wçğıöşüÇĞİÖŞÜ]+)/i)
  if (langMatch) result.language = langMatch[1]

  if (text.toLowerCase().includes('ciltsiz') || text.toLowerCase().includes('karton')) {
    result.bindingType = 'paperback'
  } else if (text.toLowerCase().includes('ciltli') || text.toLowerCase().includes('sert')) {
    result.bindingType = 'hardcover'
  }

  return result
}

export const idefixScraper: BookScraper = {
  name: 'idefix',

  async lookup(isbn: string): Promise<BookLookupResult | null> {
    try {
      // Search by ISBN to find the product
      const searchUrl = `https://www.idefix.com/search?q=${isbn}&cat=100001`
      const searchResponse = await fetch(searchUrl, { headers: HEADERS })
      if (!searchResponse.ok) return null

      const searchHtml = await searchResponse.text()
      const nextData = getNextData(searchHtml) as {
        props?: { pageProps?: { data?: { searchResult?: { items?: IdefixSearchItem[] } } } }
      } | null

      if (!nextData?.props?.pageProps?.data?.searchResult?.items?.length) return null

      const firstItem = nextData.props.pageProps.data.searchResult.items[0]
      const variant = firstItem.variants?.[0]
      if (!variant) return null

      // Get product detail page for full info
      const handleUrl = (variant as { handleUrl?: string }).handleUrl
      if (!handleUrl) return null

      const detailUrl = `https://www.idefix.com${handleUrl}`
      const detailResponse = await fetch(detailUrl, { headers: HEADERS })
      if (!detailResponse.ok) return null

      const detailHtml = await detailResponse.text()
      const detailData = getNextData(detailHtml) as {
        props?: { pageProps?: { productDetail?: IdefixProductDetail } }
      } | null

      const detail = detailData?.props?.pageProps?.productDetail
      if (!detail) return null

      const coverUrl = getCoverFromImages(detail.images)
      const descInfo = detail.description ? parseDescription(detail.description) : {}

      // Parse translator from subDescription
      let translator: string | undefined
      if (detail.subDescription) {
        const transMatch = detail.subDescription.match(/[Çç]evirmen\s*:\s*([^<]+)/i)
        if (transMatch) translator = transMatch[1].trim()
      }

      // Get properties from variant
      let bindingType = descInfo.bindingType
      let language = descInfo.language
      if (variant.properties) {
        for (const prop of variant.properties) {
          if (prop.text.toLowerCase().includes('format') && !bindingType) {
            if (prop.valueText.toLowerCase().includes('ciltsiz')) bindingType = 'paperback'
            else if (prop.valueText.toLowerCase().includes('ciltli')) bindingType = 'hardcover'
          }
          if (prop.text.toLowerCase().includes('dil') && !language) {
            language = prop.valueText
          }
        }
      }

      return {
        isbn: detail.barcode || isbn,
        title: detail.title || variant.originalName || variant.name || '',
        originalTitle: variant.originalName || undefined,
        author: detail.authorName || variant.authorName || '',
        publisher: detail.brandName || undefined,
        publishedYear: descInfo.publishedYear,
        pageCount: descInfo.pageCount,
        description: sanitizeDescription(detail.description),
        language,
        coverUrl,
        translator,
        bindingType,
      }
    } catch (error) {
      console.error('Idefix lookup error:', error)
      return null
    }
  },

  async lookupByUrl(url: string): Promise<BookLookupResult | null> {
    try {
      const detailResponse = await fetch(url, { headers: HEADERS })
      if (!detailResponse.ok) return null

      const detailHtml = await detailResponse.text()
      const detailData = getNextData(detailHtml) as {
        props?: { pageProps?: { productDetail?: IdefixProductDetail } }
      } | null

      const detail = detailData?.props?.pageProps?.productDetail
      if (!detail) return null

      const coverUrl = getCoverFromImages(detail.images)
      const descInfo = detail.description ? parseDescription(detail.description) : {}

      let translator: string | undefined
      if (detail.subDescription) {
        const transMatch = detail.subDescription.match(/[Çç]evirmen\s*:\s*([^<]+)/i)
        if (transMatch) translator = transMatch[1].trim()
      }

      return {
        isbn: detail.barcode || '',
        title: detail.title || '',
        author: detail.authorName || '',
        publisher: detail.brandName || undefined,
        publishedYear: descInfo.publishedYear,
        pageCount: descInfo.pageCount,
        description: sanitizeDescription(detail.description),
        language: descInfo.language,
        coverUrl,
        translator,
        bindingType: descInfo.bindingType,
      }
    } catch (error) {
      console.error('Idefix lookupByUrl error:', error)
      return null
    }
  },

  async searchByTitle(query: string): Promise<BookLookupResult[]> {
    try {
      const searchUrl = `https://www.idefix.com/search?q=${encodeURIComponent(query)}&cat=100001`
      const response = await fetch(searchUrl, { headers: HEADERS })
      if (!response.ok) return []

      const html = await response.text()
      const nextData = getNextData(html) as {
        props?: { pageProps?: { data?: { searchResult?: { items?: IdefixSearchItem[] } } } }
      } | null

      const items = nextData?.props?.pageProps?.data?.searchResult?.items
      if (!items || items.length === 0) return []

      const results: BookLookupResult[] = []

      for (const item of items.slice(0, 10)) {
        if (!item.isBook) continue
        const variant = item.variants?.[0]
        if (!variant) continue

        const coverUrl = getCoverFromImages(variant.images)

        // Extract language and binding from properties
        let language: string | undefined
        let bindingType: 'paperback' | 'hardcover' | 'ebook' | undefined
        if (variant.properties) {
          for (const prop of variant.properties) {
            if (prop.text.toLowerCase().includes('dil')) language = prop.valueText
            if (prop.text.toLowerCase().includes('format')) {
              if (prop.valueText.toLowerCase().includes('ciltsiz')) bindingType = 'paperback'
              else if (prop.valueText.toLowerCase().includes('ciltli')) bindingType = 'hardcover'
            }
          }
        }

        const handleUrl = (variant as { handleUrl?: string }).handleUrl
        const sourceUrl = handleUrl ? `https://www.idefix.com${handleUrl}` : undefined

        results.push({
          isbn: '',
          title: variant.originalName || variant.name || '',
          originalTitle: variant.originalName || undefined,
          author: variant.authorName || '',
          publisher: item.brandName || undefined,
          coverUrl,
          language,
          bindingType,
          sourceUrl,
        })
      }

      return results
    } catch (error) {
      console.error('Idefix title search error:', error)
      return []
    }
  },
}
