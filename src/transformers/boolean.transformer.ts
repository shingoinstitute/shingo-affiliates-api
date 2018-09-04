import { PipeTransform, ArgumentMetadata, BadRequestException } from '@nestjs/common'

export class BooleanTransformer implements PipeTransform<string, boolean> {
  transform(value: string, _metadata: ArgumentMetadata): boolean {
    if (typeof value !== 'string' || (value !== 'true' && value !== 'false')) {
      throw new BadRequestException(`${value} is not a boolean string`)
    }

    return value === 'true'
  }
}
