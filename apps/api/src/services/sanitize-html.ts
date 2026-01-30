import sanitize from 'sanitize-html'

const ALLOWED_TAGS = [
  'p',
  'br',
  'b',
  'strong',
  'i',
  'em',
  'u',
  'ul',
  'ol',
  'li',
  'h2',
  'h3',
  'a',
  'blockquote',
]

const sanitizeOptions: sanitize.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
  },
  transformTags: {
    a: sanitize.simpleTransform('a', {
      target: '_blank',
      rel: 'noopener noreferrer',
    }),
  },
  disallowedTagsMode: 'discard',
}

export function sanitizeDescription(html: string | undefined | null): string | undefined {
  if (!html) return undefined
  const result = sanitize(html, sanitizeOptions).trim()
  return result || undefined
}
