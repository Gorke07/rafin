export type ReadingStatus = 'tbr' | 'reading' | 'completed' | 'dnf'

export type LocationType = 'room' | 'furniture' | 'shelf'

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
