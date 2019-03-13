import { BadRequestException } from "@nestjs/common";

export const missingParam = (name: string) =>
  new BadRequestException(`Missing parameters: ${name}`, 'MISSING_PARAMETERS')