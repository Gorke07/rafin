import { treaty } from '@elysiajs/eden'
import type { App } from '@rafin/api'

export const api = treaty<App>(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001')
