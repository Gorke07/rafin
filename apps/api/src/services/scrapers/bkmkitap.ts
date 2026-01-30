import * as cheerio from 'cheerio'
import { sanitizeDescription } from '../sanitize-html'
import type { BookLookupResult, BookScraper } from './types'

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
}

function parseProductPage(html: string, isbn: string): BookLookupResult | null {
  const $ = cheerio.load(html)

  const title = $('h1.product-title').text().trim()
  const author = $('a.product-author').first().text().trim()
  const publisher = $('a.product-publisher').first().text().trim()

  let coverUrl = $('img.product-image').attr('src')
  if (coverUrl && !coverUrl.startsWith('http')) {
    coverUrl = `https://www.bkmkitap.com${coverUrl}`
  }

  let pageCount: number | undefined
  let publishedYear: number | undefined
  let language: string | undefined
  let bindingType: 'paperback' | 'hardcover' | 'ebook' | undefined
  let translator: string | undefined

  $('.product-info-list li').each((_, row) => {
    const label = $(row).find('.info-title').text().trim().toLowerCase()
    const value = $(row).find('.info-text').text().trim()

    if (label.includes('sayfa')) {
      pageCount = Number.parseInt(value) || undefined
    } else if (label.includes('baskı yılı') || label.includes('yıl')) {
      const year = value.match(/\d{4}/)
      if (year) {
        publishedYear = Number.parseInt(year[0])
      }
    } else if (label.includes('dil')) {
      language = value
    } else if (label.includes('cilt') || label.includes('kapak')) {
      if (value.toLowerCase().includes('karton') || value.toLowerCase().includes('ciltsiz')) {
        bindingType = 'paperback'
      } else if (value.toLowerCase().includes('ciltli') || value.toLowerCase().includes('sert')) {
        bindingType = 'hardcover'
      }
    } else if (label.includes('çevirmen') || label.includes('tercüme')) {
      translator = value
    }
  })

  const descriptionHtml = $('.product-description').html() || undefined
  const description = sanitizeDescription(descriptionHtml)

  if (!title) return null

  return {
    isbn,
    title,
    author,
    publisher: publisher || undefined,
    publishedYear,
    pageCount,
    description,
    language,
    coverUrl,
    translator,
    bindingType,
  }
}

export const bkmkitapScraper: BookScraper = {
  name: 'bkmkitap',

  async lookup(isbn: string): Promise<BookLookupResult | null> {
    try {
      const searchUrl = `https://www.bkmkitap.com/arama?q=${isbn}`
      const searchResponse = await fetch(searchUrl, { headers: HEADERS })

      if (!searchResponse.ok) return null

      const searchHtml = await searchResponse.text()
      const $search = cheerio.load(searchHtml)

      const productLink = $search('.product-item a.product-img').first().attr('href')
      if (!productLink) return null

      const fullUrl = productLink.startsWith('http')
        ? productLink
        : `https://www.bkmkitap.com${productLink}`

      const productResponse = await fetch(fullUrl, { headers: HEADERS })
      if (!productResponse.ok) return null

      return parseProductPage(await productResponse.text(), isbn)
    } catch (error) {
      console.error('BKM Kitap lookup error:', error)
      return null
    }
  },

  async lookupByUrl(url: string): Promise<BookLookupResult | null> {
    try {
      const fullUrl = url.startsWith('http') ? url : `https://www.bkmkitap.com${url}`
      const response = await fetch(fullUrl, { headers: HEADERS })
      if (!response.ok) return null
      return parseProductPage(await response.text(), '')
    } catch (error) {
      console.error('BKM Kitap lookupByUrl error:', error)
      return null
    }
  },

  async searchByTitle(query: string): Promise<BookLookupResult[]> {
    try {
      const searchUrl = `https://www.bkmkitap.com/arama?q=${encodeURIComponent(query)}`
      const searchResponse = await fetch(searchUrl, { headers: HEADERS })

      if (!searchResponse.ok) return []

      const html = await searchResponse.text()
      const $ = cheerio.load(html)
      const results: BookLookupResult[] = []

      $('.product-item').each((i, el) => {
        if (i >= 10) return false
        const title = $(el).find('.product-title, .name a').text().trim()
        const author = $(el).find('.product-author, .author a').first().text().trim()
        const publisher = $(el).find('.product-publisher, .publisher a').first().text().trim()
        let coverUrl = $(el).find('img.product-img, a.product-img img').attr('src') || undefined
        if (coverUrl && !coverUrl.startsWith('http')) {
          coverUrl = `https://www.bkmkitap.com${coverUrl}`
        }

        // Extract product URL
        let sourceUrl = $(el).find('a.product-img').first().attr('href') || undefined
        if (sourceUrl && !sourceUrl.startsWith('http')) {
          sourceUrl = `https://www.bkmkitap.com${sourceUrl}`
        }

        if (title) {
          results.push({
            isbn: '',
            title,
            author,
            publisher: publisher || undefined,
            coverUrl,
            sourceUrl,
          })
        }
      })

      return results
    } catch (error) {
      console.error('BKM Kitap title search error:', error)
      return []
    }
  },
}
