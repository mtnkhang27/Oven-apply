import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ async: false })
class AutoDateRangeConstraint implements ValidatorConstraintInterface {
  validate(_: any, args: ValidationArguments) {
    const obj = args.object as Record<string, any>;

    const keys = Object.keys(obj);
    const fromToPairs = keys
      .filter((key) => key.endsWith('From'))
      .map((fromKey) => {
        const base = fromKey.slice(0, -4); // Remove 'From'
        const toKey = `${base}To`;
        return [fromKey, toKey];
      })
      .filter(([fromKey, toKey]) => obj[fromKey] && obj[toKey]);

    for (const [fromKey, toKey] of fromToPairs) {
      const from = new Date(obj[fromKey]);
      const to = new Date(obj[toKey]);
      if (from > to) return false;
    }

    return true;
  }

  defaultMessage(_: ValidationArguments) {
    return `Each "xxxFrom" must be before or equal to its corresponding "xxxTo"`;
  }
}

export function AutoDateRangeValidation(validationOptions?: ValidationOptions) {
  return function (object: object) {
    registerDecorator({
      name: 'autoDateRangeValidation',
      target: object.constructor,
      propertyName: '', // class-level
      options: validationOptions,
      validator: AutoDateRangeConstraint,
    });
  };
}
