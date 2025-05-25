import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'IsValidDateRange', async: false })
export class IsValidDateRangeConstraint
  implements ValidatorConstraintInterface
{
  validate(_: any, args: ValidationArguments) {
    const [fromKey, toKey] = args.constraints;
    const obj = args.object as any;

    const from = obj[fromKey];
    const to = obj[toKey];

    if (!from || !to) return true;

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return true;

    return fromDate <= toDate;
  }

  defaultMessage(args: ValidationArguments) {
    const [fromKey, toKey] = args.constraints;
    return `${fromKey} must be before or equal to ${toKey}`;
  }
}

export function IsValidDateRange(
  fromKey: string,
  toKey: string,
  validationOptions?: ValidationOptions,
) {
  return function (constructor: Function) {
    registerDecorator({
      name: 'IsValidDateRange',
      target: constructor,
      propertyName: undefined!, // Required for class-level decorator
      options: validationOptions,
      constraints: [fromKey, toKey],
      validator: IsValidDateRangeConstraint,
    });
  };
}
