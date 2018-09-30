export function* map<A, B>(g: IterableIterator<A>, f: (a: A) => B) {
  for (const v of g) {
    yield f(v)
  }
}
