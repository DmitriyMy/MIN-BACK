import { FindManyOptions, FindOptionsOrder, ObjectLiteral, ValueTransformer } from 'typeorm'
import { SortDirection } from '@app/constants/db'
import { getOffset } from './pagination'

// Reason: need to implement expected specified interface
/* eslint-disable class-methods-use-this */
export class ColumnNumericTransformer implements ValueTransformer {
  to(data: number): number {
    return data
  }

  from(data: string): number {
    return parseFloat(data)
  }
}
/* eslint-enable class-methods-use-this */

export const getMongoPaginationAndSortParams = <T extends ObjectLiteral>({
  page = 1,
  limit = 100,
  sortBy = 'createdAt',
  sortDirection = SortDirection.DESC,
}: {
  page?: number
  limit?: number
  sortBy?: keyof T
  sortDirection?: SortDirection
}): Required<Pick<FindManyOptions<T>, 'order' | 'take' | 'skip'>> => ({
  order: { [sortBy]: sortDirection, _id: SortDirection.ASC } as unknown as FindOptionsOrder<T>,
  take: limit,
  skip: getOffset(page, limit),
})
