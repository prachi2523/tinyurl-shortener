const BASE62_CHARSET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Encodes a numeric ID into a Base62 string.
 */
export function encodeToBase62(num: number): string {
  if (num === 0) return BASE62_CHARSET[0];
  
  let result = '';
  let temp = num;
  
  while (temp > 0) {
    result = BASE62_CHARSET[temp % 62] + result;
    temp = Math.floor(temp / 62);
  }
  
  return result;
}

/**
 * Decodes a Base62 string back into a numeric ID.
 */
export function decodeFromBase62(str: string): number {
  let num = 0;
  for (let i = 0; i < str.length; i++) {
    const index = BASE62_CHARSET.indexOf(str[i]);
    if (index === -1) {
      throw new Error(`Invalid character in Base62 string: ${str[i]}`);
    }
    num = num * 62 + index;
  }
  return num;
}
