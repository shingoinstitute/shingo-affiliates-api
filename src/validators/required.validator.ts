import {
  BadRequestException,
  Injectable,
  PipeTransform,
  ArgumentMetadata,
  HttpException,
} from '@nestjs/common'

@Injectable()
export class RequiredValidator<T = any>
  implements PipeTransform<T | null | undefined, T> {
  private exception: HttpException

  constructor(exception?: HttpException) {
    this.exception =
      exception || new BadRequestException('Recieved null or undefined value')
  }

  transform(value: T | null | undefined, _metadata: ArgumentMetadata): T {
    if (typeof value === 'undefined' || value === null) {
      throw this.exception
    }
    return value
  }
}
