export const encodeToBase64Url = (str: string): string => {
  return Buffer.from(str.toLowerCase()).toString('base64url');
};

export const decodeFromBase64Url = (str: string): string => {
  return Buffer.from(str, 'base64url').toString();
};
