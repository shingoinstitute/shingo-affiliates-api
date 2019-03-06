/** both multivariate-parameterized */
export type FlipC_MpMp = <R>(
  fn: <As extends any[]>(...as: As) => <Bs extends any[]>(...bs: Bs) => R,
) => <Bs extends any[]>(...bs: Bs) => <As extends any[]>(...as: As) => R

/** first multivariate-parameterized, second same */
export type FlipC_MpS = <R>(
  fn: <As extends any[]>(...as: As) => (...bs: As) => R,
) => <As extends any[]>(...bs: As) => (...as: As) => R

/** first multivariate-parameterized, second concrete */
export type FlipC_MpC = <Fixed extends any[], R>(
  fn: <As extends any[]>(...as: As) => (...bs: Fixed) => R,
) => (...bs: Fixed) => <As extends any[]>(...as: As) => R

/** first concrete, second multivariate-parameterized */
export type FlipC_CMp = <Fixed extends any[], R>(
  fn: (...as: Fixed) => <Bs extends any[]>(...bs: Bs) => R,
) => <Bs extends any[]>(...bs: Bs) => (...as: Fixed) => R

/** both concrete */
export type FlipC_CC = <Fixed1 extends any[], Fixed2 extends any[], R>(
  fn: (...as: Fixed1) => (...bs: Fixed2) => R,
) => (...bs: Fixed2) => (...as: Fixed1) => R

/** both parameterized */
export type FlipC_PP = <R>(
  fn: <A>(a: A) => <B>(b: B) => R,
) => <B>(b: B) => <A>(a: A) => R

/** first parameterized, second same */
export type FlipC_PS = <R>(
  fn: <A>(a: A) => (b: A) => R,
) => <A>(b: A) => (a: A) => R

/** first parameterized, second concrete */
export type FlipC_PC = <Fixed, R>(
  fn: <A>(a: A) => (b: Fixed) => R,
) => (b: Fixed) => <A>(a: A) => R

/** first concrete, second parameterized */
export type FlipC_CP = <Fixed, R>(
  fn: (a: Fixed) => <B>(b: B) => R,
) => <B>(b: B) => (a: Fixed) => R

export type FlipCMultivariate = FlipC_MpMp &
  FlipC_MpS &
  FlipC_MpC &
  FlipC_CMp &
  FlipC_CC
export type FlipCUnary = FlipC_PP & FlipC_PS & FlipC_PC & FlipC_CP & FlipC_CC
/**
 * Type of a function that flips functions in the form `A -> B -> R` to `B -> A -> R`
 *
 * Handles most parameterized unary functions,
 * and parameterized multivariate functions,
 * however some information is lost for multivariate functions (returned function takes ...any[]),
 * and higher kinded types do not work at all
 *
 * E.g this function will not handle these cases:
 * 1. A function taking an array of A (higher kinded type):
 *  ```ts
 *    type Fn = <A>(x: A[]) => (y: number) => boolean
 *  ```
 * 2. A function taking a parameterized function (higher kinded type)
 *  ```ts
 *    type Fn = (x: string[]) => <B>(fn: (x: string) => B) => B
 *  ```
 * 3. A multivariate type that does not extend any[] (we need variadic kinds for this to work)
 * ```ts
 *    type Fn = <As extends [string, ...string[]]>(...as: As) => (b: number) => boolean
 * ```
 */
export type FlipC = (FlipC_MpMp & FlipC_PP) &
  (FlipC_MpS & FlipC_PS) &
  (FlipC_MpC & FlipC_PC) &
  (FlipC_CMp & FlipC_CP) &
  FlipC_CC

/**
 * A function that converts functions from the form `A -> B -> R` to `B -> A -> R`
 *
 * Handles most parameterized unary functions,
 * and parameterized multivariate functions,
 * however some information is lost for multivariate functions (returned function takes ...any[]),
 * and higher kinded types do not work at all
 *
 * E.g this function will not handle these cases:
 * 1. A function taking an array of A (higher kinded type):
 *  ```ts
 *    type Fn = <A>(x: A[]) => (y: number) => boolean
 *  ```
 * 2. A function taking a parameterized function (higher kinded type)
 *  ```ts
 *    type Fn = (x: string[]) => <B>(fn: (x: string) => B) => B
 *  ```
 * 3. A multivariate type that does not extend any[] (we need variadic kinds for this to work)
 * ```ts
 *    type Fn = <As extends [string, ...string[]]>(...as: As) => (b: number) => boolean
 * ```
 */
export const flipC: FlipC = <F1 extends any[], F2 extends any[], R>(
  fn: (...as: F1) => (...bs: F2) => R,
) => (...bs: F2) => (...as: F1) => fn(...as)(...bs)

// // Tests for the flipC function. Verify
// // that the inferred return type matches the comment
// /** both concrete */
// declare function fn1(a: number): (b: string) => boolean
// /** first parameterized, second concrete */
// declare function fn2<A>(a: A): (b: string) => boolean
// /** first concrete, second parameterized */
// declare function fn3(a: number): <B>(b: B) => boolean
// /** first parameterized, second same */
// declare function fn4<A>(a: A): (b: A) => boolean
// /** both parameterized */
// declare function fn5<A>(a: A): <B>(b: B) => boolean
// flipC(fn1) // Returns: string -> number -> boolean
// flipC(fn2) // Returns: string -> A -> boolean
// flipC(fn3) // Returns: B -> number -> boolean
// flipC(fn4) // Returns: A -> A -> boolean
// flipC(fn5) // Returns: B -> A -> boolean

// /** both concrete */
// declare function fn6(...a: number[]): (...b: string[]) => boolean
// /** first multivariate-parameterized, second concrete */
// declare function fn7<As extends any[]>(...a: As): (...b: string[]) => boolean
// /** first concrete, second multivariate-parameterized */
// declare function fn8(...a: string[]): <Bs extends any[]>(...b: Bs) => boolean
// /** first concrete, second same */
// declare function fn9<As extends any[]>(...a: As): (...b: As) => boolean
// /** both multivariate-parameterized */
// declare function fn10<As extends any[]>(
//   ...as: As
// ): <Bs extends any[]>(...bs: Bs) => boolean
// flipC(fn6) // Returns: ...string[] -> ...number[] -> boolean
// flipC(fn7) // Returns: ...string[] -> ...As -> boolean
// flipC(fn8) // Returns: ...Bs -> ...string[] -> boolean
// flipC(fn9) // Returns: ...As -> ...As -> boolean
// flipC(fn10) // Returns: ...Bs -> ...As -> boolean
