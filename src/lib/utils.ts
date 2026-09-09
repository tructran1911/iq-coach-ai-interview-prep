/**
 * Masks Personally Identifiable Information (PII) such as emails and phone numbers.
 */
export function maskPII(text: string): string {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const phoneRegex = /(?:\+84|0)(?:\d{9,10})/g;
  
  return text
    .replace(emailRegex, '[REDACTED]')
    .replace(phoneRegex, '[REDACTED]');
}
