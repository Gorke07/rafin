/**
 * Converts plain text to basic HTML.
 * If the input already contains HTML tags, returns it as-is.
 * Plain text gets paragraphs split by double newlines, single newlines become <br>.
 */
export function plainTextToHtml(text: string | undefined | null): string {
  if (!text) return ''
  // If it already contains HTML tags, return as-is
  if (/<[a-z][\s\S]*>/i.test(text)) return text
  // Convert plain text: split by double newline for paragraphs
  return text
    .split(/\n\n+/)
    .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('')
}
