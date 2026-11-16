/** `5` → `05`: two digits, for dates and clock times */
export const pad2 = (value: number): string => String(value).padStart(2, '0');
