/// <reference types="node" />

export const encodeToBase64Url = (str: string): string => {
  return Buffer.from(str.toLowerCase()).toString('base64url');
};
