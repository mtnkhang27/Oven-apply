import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsValidDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidDate',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (!value || typeof value !== 'string') return false;
          const parsed = new Date(value);
          return !isNaN(parsed.getTime());
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid calendar date`;
        },
      },
    });
  };
}
