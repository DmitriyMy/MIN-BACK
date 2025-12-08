import { SortDirection } from '@app/constants/db'

export interface PaginationRequest {
  limit: number
  page: number
}

export type PartialPaginationRequest = Partial<PaginationRequest>

export interface PaginationWithSortDirectionRequest extends PaginationRequest {
  sortDirection: SortDirection
}

export type PartialPaginationWithSortDirectionRequest = Partial<PaginationWithSortDirectionRequest>
