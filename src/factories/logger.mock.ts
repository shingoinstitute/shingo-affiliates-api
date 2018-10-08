import { LoggerInstance } from 'winston'
import { Lazy } from '../util'

const noopL = <T = never>(r: T | Lazy<T>) => (..._args: any[]) => {
  // noop
  return typeof r === 'function' ? (r as Lazy<T>)() : r
}

const noop = () => {
  /**/
}

// tslint:disable-next-line:no-object-literal-type-assertion
export const mockLogger: LoggerInstance = ({
  level: 'info',
  rewriters: [],
  filters: [],
  transports: {},
  extend: noopL(() => mockLogger),
  log: noopL(() => mockLogger),

  error: noopL(() => mockLogger),
  warn: noopL(() => mockLogger),
  help: noopL(() => mockLogger),
  data: noopL(() => mockLogger),
  info: noopL(() => mockLogger),
  debug: noopL(() => mockLogger),
  prompt: noopL(() => mockLogger),
  verbose: noopL(() => mockLogger),
  input: noopL(() => mockLogger),
  silly: noopL(() => mockLogger),

  emerg: noopL(() => mockLogger),
  alert: noopL(() => mockLogger),
  crit: noopL(() => mockLogger),
  warning: noopL(() => mockLogger),
  notice: noopL(() => mockLogger),

  query: noopL(noop),
  // stream: noop(() => ({})),
  close: noopL(noop),
  handleExceptions: noopL(noop),
  unhandleExceptions: noopL(noop),
  add: noopL(() => mockLogger),
  clear: noopL(noop),
  remove: noopL(() => mockLogger),
  setLevels: noopL(noop),
  cli: noopL(() => mockLogger),
} as Partial<LoggerInstance>) as LoggerInstance
