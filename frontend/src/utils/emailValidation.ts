const BASIC_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const COMMON_DOMAIN_TYPOS: Record<string, string> = {
  'gamil.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gnail.com': 'gmail.com',
  'hotnail.com': 'hotmail.com',
  'hotmial.com': 'hotmail.com',
  'outllok.com': 'outlook.com',
  'outlok.com': 'outlook.com',
  'yaho.com': 'yahoo.com',
  'yhoo.com': 'yahoo.com',
};

export interface SignupEmailValidationResult {
  isValid: boolean;
  message?: string;
}

const isValidTopLevelDomain = (tld: string): boolean => {
  return /^[a-z]{2,24}$/i.test(tld) || /^xn--[a-z0-9-]{2,59}$/i.test(tld);
};

export const validateSignupEmail = (rawEmail: string): SignupEmailValidationResult => {
  const email = String(rawEmail || '').trim().toLowerCase();

  if (!email) {
    return { isValid: false, message: 'Email is required.' };
  }

  if (!BASIC_EMAIL_REGEX.test(email) || email.includes('..')) {
    return { isValid: false, message: 'Please enter a valid email address.' };
  }

  const parts = email.split('@');
  if (parts.length !== 2) {
    return { isValid: false, message: 'Please enter a valid email address.' };
  }

  const [localPart, domainPart] = parts;
  if (!localPart || !domainPart) {
    return { isValid: false, message: 'Please enter a valid email address.' };
  }

  if (
    domainPart.startsWith('.') ||
    domainPart.endsWith('.') ||
    domainPart.startsWith('-') ||
    domainPart.endsWith('-') ||
    !domainPart.includes('.')
  ) {
    return { isValid: false, message: 'Please enter a valid email domain.' };
  }

  const labels = domainPart.split('.');
  if (labels.some((label) => !label || label.startsWith('-') || label.endsWith('-'))) {
    return { isValid: false, message: 'Please enter a valid email domain.' };
  }

  const tld = labels[labels.length - 1];
  if (!isValidTopLevelDomain(tld)) {
    return { isValid: false, message: 'Please enter a valid email domain.' };
  }

  const suggestedDomain = COMMON_DOMAIN_TYPOS[domainPart];
  if (suggestedDomain) {
    return {
      isValid: false,
      message: `Email domain looks incorrect. Did you mean ${localPart}@${suggestedDomain}?`,
    };
  }

  return { isValid: true };
};
