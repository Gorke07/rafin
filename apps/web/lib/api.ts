import { treaty } from '@elysiajs/eden'

// Type will be properly resolved after API build
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const api = treaty<any>(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001')
