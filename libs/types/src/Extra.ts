export type Entries<T> = Array<
  {
    [K in keyof T]: [K, T[K]]
  }[keyof T]
>

export type PartialFields<T extends Record<K, unknown>, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>
    }
  : T

export type ReplaceReturnType<T extends (...a: never) => unknown, TNewReturn> = (a: Parameters<T>) => TNewReturn

export type NonNullableFields<T> = {
  [P in keyof T]: NonNullable<T[P]>
}
