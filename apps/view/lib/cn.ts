type ClassValue = string | number | null | undefined | boolean | ClassDictionary | ClassValue[];

interface ClassDictionary {
  [key: string]: boolean | null | undefined;
}

function toVal(value: ClassValue, target: string[]): void {
  if (!value) {
    return;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    target.push(String(value));
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => toVal(item, target));
    return;
  }

  if (typeof value === 'object') {
    Object.entries(value).forEach(([key, condition]) => {
      if (condition) {
        target.push(key);
      }
    });
  }
}

export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];
  inputs.forEach((input) => toVal(input, classes));
  return classes.join(' ');
}
