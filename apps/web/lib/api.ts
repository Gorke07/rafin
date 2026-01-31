import { treaty } from '@elysiajs/eden'

// biome-ignore lint/suspicious/noExplicitAny: API type resolved at runtime via Eden treaty
export const api = treaty<any>(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001')
