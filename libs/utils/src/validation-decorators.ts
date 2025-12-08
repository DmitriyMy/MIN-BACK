import { applyDecorators } from '@nestjs/common'
import { Transform, plainToClass } from 'class-transformer'
import type { ValidationArguments, ValidationOptions } from 'class-validator'
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsNumberString,
  IsString,
  IsUUID,
  Length,
  MinLength,
  registerDecorator,
  validateSync,
} from 'class-validator'
import { ArrayOfStringsTransformer } from './dto'

const getValidateNested =
  (schema: new () => object) =>
  (value: unknown): boolean => {
    if (!value) {
      return false
    }

    const isValidatedValue = (element: unknown): boolean => validateSync(plainToClass(schema, element)).length === 0

    return Array.isArray(value) ? value.every(isValidatedValue) : isValidatedValue(value)
  }

const getDefaultMessageForNested =
  (schema: new () => object) =>
  (args: ValidationArguments): string => {
    if (!args) {
      throw new Error('"ValidateNested.defaultMessage": args is not defined')
    }
    if (!args.value) {
      return `${args.property} has invalid data type`
    }

    const getErrorString = (argValueItem: unknown): string =>
      validateSync(plainToClass(schema, argValueItem))
        .flatMap((e) => Object.values(e.constraints ?? {}))
        .join(', ')

    return Array.isArray(args.value)
      ? args.value
          .map((argValueItem, index) => `${args.property}[${index}] -> ${getErrorString(argValueItem)}`)
          .join(', ')
      : getErrorString(args.value)
  }

/**
 * @decorator
 * @description A custom decorator to validate a validation-schema within a validation schema upload N levels
 * @param schema The validation Class
 */
export const CustomValidateNested =
  (schema: new () => object, validationOptions?: ValidationOptions) =>
  (object: object, propertyName: string): void =>
    registerDecorator({
      name: 'CustomValidateNested',
      target: object.constructor,
      propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate: getValidateNested(schema),
        defaultMessage: getDefaultMessageForNested(schema),
      },
    })

export const IsPositiveNumberString =
  (validationOptions?: ValidationOptions) =>
  (object: object, propertyName: string): void =>
    registerDecorator({
      name: 'IsPositiveNumberString',
      target: object.constructor,
      propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate: (value: unknown) => typeof value === 'string' && Number(value) > 0,
        defaultMessage: () => '$property must be a positive number string',
      },
    })

export const ArrayUUIDs = (
  { transform }: { transform?: boolean } = { transform: true },
): ReturnType<typeof applyDecorators> => {
  return applyDecorators(
    ...([
      IsUUID(4, { each: true }),
      ArrayNotEmpty(),
      ArrayUnique(),
      transform ? Transform(ArrayOfStringsTransformer) : undefined,
    ].filter((decorator) => decorator) as Parameters<typeof applyDecorators>),
  )
}

export const IsUserConfirmCode = (): ReturnType<typeof applyDecorators> => {
  return applyDecorators(
    IsNumberString(),
    Length(5, 5, {
      message: '$property length must equal to 5 characters',
    }),
  )
}

export const IsUserPassword = (): ReturnType<typeof applyDecorators> => {
  return applyDecorators(IsString(), MinLength(8))
}

export const IsSearchString = (): ReturnType<typeof applyDecorators> => {
  return applyDecorators(IsString(), MinLength(3))
}
