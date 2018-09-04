import { ValidationOptions, registerDecorator } from 'class-validator'
import { pipe } from '../util'
import { Injectable, PipeTransform, ArgumentMetadata, BadRequestException } from '@nestjs/common';

const lookupMap = {
  '00000': 'A',
  '00001': 'B',
  '00010': 'C',
  '00011': 'D',
  '00100': 'E',
  '00101': 'F',
  '00110': 'G',
  '00111': 'H',
  '01000': 'I',
  '01001': 'J',
  '01010': 'K',
  '01011': 'L',
  '01100': 'M',
  '01101': 'N',
  '01110': 'O',
  '01111': 'P',
  '10000': 'Q',
  '10001': 'R',
  '10010': 'S',
  '10011': 'T',
  '10100': 'U',
  '10101': 'V',
  '10110': 'W',
  '10111': 'X',
  '11000': 'Y',
  '11001': 'Z',
  '11010': '0',
  '11011': '1',
  '11100': '2',
  '11101': '3',
  '11110': '4',
  '11111': '5',
}

const reverseASCII = (s: string) => s.split('').reverse()
const toUpperBitMap = (s: string[]) => s.map(c => /[A-Z]/.test(c) ? '1' : '0')
const lookup = (s: Array<'1' | '0'>) => lookupMap[s.join('')] as string | undefined

/**
 * Generates an 18 character salesforce ID from a 15 character id
 * @param id The 15 character salesforce id
 */
const getExtendedId = (id: string) => {
  const sum = [0, 5, 10]
    .map(pipe(
      start => id.substr(start, 5),
      reverseASCII,
      toUpperBitMap,
      lookup
    ))

  if (sum.some(v => typeof v === 'undefined')) {
    throw new Error('initial Id was invalid')
  }

  return id + sum.join('')
}

/**
 * Tests whether a value is a salesforce id
 * @param value any value to test
 */
export const isSFID = (value: any): value is string => {
  if (typeof value === 'string' && /[a-zA-Z0-9]{18}|[a-zA-Z0-9]{15}/.test(value)) {
    if (/[a-zA-Z0-9]{18}/.test(value)) {
      return getExtendedId(value.substr(0, 15)).toLowerCase() === value.toLowerCase()
    }
    return true
  }
  return false
}

/**
 * A validation decorator for class-validator
 * @param validationOptions class-validator validation options
 */
export function IsSalesforceId(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isSalesforceId',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate: isSFID,
      },
    })
  }
}

@Injectable()
export class SalesforceIdValidator implements PipeTransform<any, string> {
  transform(value: any, _metadata: ArgumentMetadata): string {
    if (!isSFID(value)) {
      throw new BadRequestException(
        `${value} is not a valid Salesforce ID.`, 'INVALID_SF_ID'
      )
    }
    return value
  }
}
