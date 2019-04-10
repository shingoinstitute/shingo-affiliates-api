import { Fn } from '../../types'

/** identity */
export const I = <A>(a: A) => a
/** constant, always returns first parameter */
export const K = <A>(a: A) => <B>(_?: B) => a
/** apply, calls the given function with the given parameter */
export const A: <A, B>(f: Fn<[A], B>) => Fn<[A], B> = I
/** thrush, takes a parameter and a function and calls the function with the parameter */
export const T = <A>(x: A) => <B>(f: Fn<[A], B>) => f(x)
/** duplication */
export const W = <A, B>(f: Fn<[A], Fn<[A], B>>) => (x: A) => f(x)(x)
/** flip */
export const C = <A, B, C>(f: Fn<[A], Fn<[B], C>>) => (y: B) => (x: A) => f(x)(y)
/** compose */
export const B = <C, B>(f: Fn<[B], C>) => <A>(g: Fn<[A], B>) => (x: A) => f(g(x))
/** substitution */
export const S = <A, B, C>(f: Fn<[A], Fn<[B], C>>) => (g: Fn<[A], B>) => (x: A) => f(x)(g(x))
/** psi */
export const P = <A, B>(f: Fn<[A], Fn<[A], B>>) => <C>(g: Fn<[C], A>) => (x: C) => (y: C) => f(g(x))(g(y))

import * as variadic from './variadic'
export { variadic }
