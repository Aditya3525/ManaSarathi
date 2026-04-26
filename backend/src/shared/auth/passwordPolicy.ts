export const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,100}$/;

export const STRONG_PASSWORD_MESSAGE =
  'Password must be 8-100 characters and include uppercase, lowercase, number, and special character';

export const isStrongPassword = (value: string): boolean => STRONG_PASSWORD_REGEX.test(value);
