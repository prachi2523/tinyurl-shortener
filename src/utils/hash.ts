import crypto from 'crypto';

/**
 * Generates a short hash from a URL using MD5 and returning a slice.
 * If salt/timestamp is provided, it helps ensure uniqueness even for duplicate long URLs.
 */
export function generateShortHash(url: string, salt: string = ''): string {
  const hash = crypto.createHash('md5').update(url + salt).digest('hex');
  // MD5 has 32 hex chars. We can parse a section of it to a number or Base62 encode it.
  // Alternatively, let's take a 8-character prefix of the hash.
  return hash.substring(0, 8);
}
