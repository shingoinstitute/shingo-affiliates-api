import { Fn } from '../../types'

/** identity */
export const I = <As extends any[]>(...a: As) => a
/** constant, always returns first parameter */
export const K = <As extends any[]>(...a: As) => <Bs extends any[]>(..._: Bs) =>
  a
/** apply, calls the given function with the given parameters */
export const A = <As extends any[], B>(f: Fn<As, B>) => (...as: As) => f(...as)
/** thrush, takes a parameter and a function and calls the function with the parameter */
export const T = <Xs extends any[]>(...xs: Xs) => <B>(f: Fn<Xs, B>) => f(...xs)
/** duplication */
export const W = <As extends any[], B>(f: Fn<As, Fn<As, B>>) => (...as: As) =>
  f(...as)(...as)
/** flip */
export const C = <As extends any[], Bs extends any[], C>(
  f: Fn<As, Fn<Bs, C>>
) => (...y: Bs) => (...x: As) => f(...x)(...y)
/** compose */
export const B = <B, C>(f: Fn<[B], C>) => <As extends any[]>(g: Fn<As, B>) => (
  ...as: As
) => f(g(...as))
/** substitution */
export const S = <As extends any[], B, C>(f: Fn<As, Fn<[B], C>>) => (
  g: Fn<As, B>
) => (...as: As) => f(...as)(g(...as))
/** psi */
export const P = <A, B>(f: Fn<[A], Fn<[A], B>>) => <Cs extends any[]>(
  g: Fn<Cs, A>
) => (...x: Cs) => (...y: Cs) => f(g(...x))(g(...y))
