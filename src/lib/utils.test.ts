import { describe, it, expect } from 'vitest';
import { maskPII } from './utils';

describe('maskPII', () => {
  it('should mask email addresses', () => {
    const input = 'My email is test@example.com and another@service.vn';
    const expected = 'My email is [REDACTED] and [REDACTED]';
    expect(maskPII(input)).toBe(expected);
  });

  it('should mask phone numbers', () => {
    const input = 'Call me at 0987654321 or +84123456789';
    const expected = 'Call me at [REDACTED] or [REDACTED]';
    expect(maskPII(input)).toBe(expected);
  });

  it('should return the same text if no PII is present', () => {
    const input = 'Hello, how are you?';
    expect(maskPII(input)).toBe(input);
  });
});
