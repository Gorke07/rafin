import * as cheerio from 'cheerio'
import { sanitizeDescription } from '../sanitize-html'
import type { BookLookupResult, BookScraper } from './types'

function getFullSizeCover(url: string | undefined): string | undefined {
  if (!url) return undefined
  // Remove /wi:XXX width parameter to get full-size image
  return url.replace(/\/wi:\d+/, '')
}

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
}

function parseSearchResults(html: string): BookLookupResult[] {
  const $ = cheerio.load(html)
  const results: BookLookupResult[] = []

  $('div.product-cr').each((i, el) => {
    if (i >= 10) return false

    const title = $(el).find('div.name.ellipsis a span').text().trim()
    const author =
      $(el).find('div.author span a.alt span').text().trim() ||
      $(el).find('div.author.compact.ellipsis a.alt').text().trim()
    const publisher = $(el).find('div.publisher span a.alt span').text().trim()
    const coverUrl = getFullSizeCover($(el).find('a.pr-img-link img').attr('src'))

    // Extract product URL
    const rawHref = $(el).find('div.name.ellipsis a').first().attr('href')
    const sourceUrl = rawHref ? rawHref.split('&filter_name')[0].split('&s_token')[0] : undefined

    // Product info contains: ISBN | DİL | SAYFA | CİLT | KAĞIT \n TARİH
    const productInfo = $(el).find('div.product-info').text().trim()
    let isbn = ''
    let pageCount: number | undefined
    let language: string | undefined
    if (productInfo) {
      const parts = productInfo.split('|').map((p) => p.trim())
      // First part is usually ISBN (13 digits)
      if (parts[0] && /^\d{10,13}$/.test(parts[0].replace(/\s/g, ''))) {
        isbn = parts[0].replace(/\s/g, '')
      }
      // Second part is language
      if (parts[1]) language = parts[1]
      // Third part is page count
      if (parts[2]) pageCount = Number.parseInt(parts[2]) || undefined
    }

    if (title) {
      results.push({
        isbn,
        title,
        author,
        publisher: publisher || undefined,
        coverUrl,
        pageCount,
        language,
        sourceUrl,
      })
    }
  })

  return results
}

function parseProductPage(html: string, isbn: string): BookLookupResult | null {
  const $ = cheerio.load(html)

  const title = $('h1.pr_header__heading').text().trim()
  const author = $('div.pr_producers__manufacturer a.pr_producers__link').first().text().trim()
  const publisher = $('div.pr_producers__publisher a.pr_producers__link').first().text().trim()
  const coverUrl = getFullSizeCover(
    $('div.pr_images img').first().attr('src') || $('img.js-jbox-book-cover').attr('src'),
  )

  let pageCount: number | undefined
  let publishedYear: number | undefined
  let language: string | undefined
  let bindingType: 'paperback' | 'hardcover' | 'ebook' | undefined
  let translator: string | undefined

  $('div.pr_attributes div.attributes table tr, .attributes tr').each((_, row) => {
    const label = $(row).find('td').first().text().trim().toLowerCase()
    const value = $(row).find('td').last().text().trim()

    if (label.includes('sayfa')) {
      pageCount = Number.parseInt(value) || undefined
    } else if (
      label.includes('yayın tarihi') ||
      label.includes('yayin tarihi') ||
      label.includes('baskı')
    ) {
      const year = value.match(/\d{4}/)
      if (year) publishedYear = Number.parseInt(year[0])
    } else if (label.includes('dil')) {
      language = value
    } else if (label.includes('cilt') || label.includes('kapak')) {
      if (value.toLowerCase().includes('karton') || value.toLowerCase().includes('ciltsiz')) {
        bindingType = 'paperback'
      } else if (value.toLowerCase().includes('ciltli') || value.toLowerCase().includes('sert')) {
        bindingType = 'hardcover'
      }
    } else if (label.includes('çevirmen') || label.includes('cevirmen')) {
      translator = value
    }
  })

  const descriptionHtml =
    $('#description_text span.info__text').html() || $('span.info__text').html() || undefined
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
    translator: translator || undefined,
    bindingType,
  }
}

export const kitapyurduScraper: BookScraper = {
  name: 'kitapyurdu',

  async lookup(isbn: string): Promise<BookLookupResult | null> {
    try {
      const searchUrl = `https://www.kitapyurdu.com/index.php?route=product/search&filter_name=${isbn}`
      const searchResponse = await fetch(searchUrl, { headers: HEADERS })

      if (!searchResponse.ok) return null

      const searchHtml = await searchResponse.text()
      const $search = cheerio.load(searchHtml)

      // Get first result link
      const productLink =
        $search('div.product-cr div.name.ellipsis a').first().attr('href') ||
        $search('.product-cr .name a').first().attr('href')
      if (!productLink) return null

      // Fetch product page
      const productResponse = await fetch(productLink, { headers: HEADERS })
      if (!productResponse.ok) return null

      return parseProductPage(await productResponse.text(), isbn)
    } catch (error) {
      console.error('Kitapyurdu lookup error:', error)
      return null
    }
  },

  async lookupByUrl(url: string): Promise<BookLookupResult | null> {
    try {
      const response = await fetch(url, { headers: HEADERS })
      if (!response.ok) return null
      return parseProductPage(await response.text(), '')
    } catch (error) {
      console.error('Kitapyurdu lookupByUrl error:', error)
      return null
    }
  },

  async searchByTitle(query: string): Promise<BookLookupResult[]> {
    try {
      const searchUrl = `https://www.kitapyurdu.com/index.php?route=product/search&filter_name=${encodeURIComponent(query)}`
      const response = await fetch(searchUrl, { headers: HEADERS })
      if (!response.ok) return []
      return parseSearchResults(await response.text())
    } catch (error) {
      console.error('Kitapyurdu title search error:', error)
      return []
    }
  },
}
