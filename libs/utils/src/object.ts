import { isUndefined, mapValues } from 'lodash'

export const sumValues = <T extends Record<string, number>>(left: T, right: T): T => {
  return mapValues(left, (value, key) => value + right[key]) as T
}

export const arrToObjectArr = <T, K>(
  arr: T[],
  arrObj: Array<Record<string, T> & Record<string, K>>,
): Array<Record<string, K>> => {
  const objMap = new Map<T, Record<string, K>>()
  arrObj.forEach((obj) => objMap.set(obj.id, obj))
  return arr.map((el) => {
    const element = objMap.get(el)
    if (isUndefined(element)) {
      throw new Error(`No related items exist`)
    }
    return element
  })
}
