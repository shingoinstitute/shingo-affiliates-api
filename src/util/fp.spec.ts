import { multimap, tuple, cartesian, flatten } from './fp'

describe('fp', () => {
  describe('multimap', () => {
    it('applies the given array of functions to every value in the passed array', () => {
      const arr = tuple(1, 2, 3, 4)
      const increment = (x: number) => x + 1
      const toString = (x: any) => `${x}`
      const res: [
        [number, number, number, number],
        [string, string, string, string]
      ] = multimap(arr, increment, toString)

      expect(res).toEqual([[2, 3, 4, 5], ['1', '2', '3', '4']])
    })
  })

  describe('cartesian', () => {
    it('generates the cartesian product (all combinations) of the given arrays', () => {
      const arr1 = [1, 2, 3]
      const arr2 = ['a', 'b', 'c']
      const product2: Array<[number, string]> = [...cartesian(arr1, arr2)]
      const simpleProduct2 = flatten(arr1.map(x => arr2.map(y => [x, y])))
      expect(product2).toEqual(simpleProduct2)

      const arr3 = [tuple(0.1), tuple(0.2), tuple(0.3), tuple(0.4)]
      const product3: Array<[number, string, [number]]> = [
        ...cartesian(arr1, arr2, arr3),
      ]
      const simpleProduct3 = flatten(
        flatten(arr1.map(x => arr2.map(y => arr3.map(z => [x, y, z])))),
      )
      expect(product3).toEqual(simpleProduct3)
    })
  })
})
