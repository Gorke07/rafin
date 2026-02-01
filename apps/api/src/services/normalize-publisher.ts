const PUBLISHER_ALIASES: Record<string, string> = {
  yky: 'Yapı Kredi Yayınları',
  'yapı kredi': 'Yapı Kredi Yayınları',
  'iş bankası': 'İş Bankası Kültür Yayınları',
  timas: 'Timaş Yayınları',
  timaş: 'Timaş Yayınları',
  'doğan kitap': 'Doğan Kitap',
  alfa: 'Alfa Yayınları',
  can: 'Can Yayınları',
  iletisim: 'İletişim Yayınları',
  iletişim: 'İletişim Yayınları',
  pegasus: 'Pegasus Yayınları',
  epsilon: 'Epsilon Yayınevi',
  ithaki: 'İthaki Yayınları',
  'ithaki yayınları': 'İthaki Yayınları',
  İthaki: 'İthaki Yayınları',
}

function turkishTitleCase(str: string): string {
  return str
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase('tr') + word.slice(1).toLocaleLowerCase('tr'))
    .join(' ')
}

export function normalizePublisher(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ')
  if (!trimmed) return trimmed

  const lower = trimmed.toLocaleLowerCase('tr')
  if (PUBLISHER_ALIASES[lower]) return PUBLISHER_ALIASES[lower]

  return turkishTitleCase(trimmed)
}
