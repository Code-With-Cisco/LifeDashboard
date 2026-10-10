const enc = new TextEncoder(), dec = new TextDecoder();
export const b64 = bytes => {
  let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const bytes = value => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
export const random = () => b64(crypto.getRandomValues(new Uint8Array(32)));
export const digest = async value => b64(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(value))));
export async function vault(secret) {
  const raw = bytes(secret);
  if (raw.length !== 32) throw new Error('Connector encryption key must contain 32 random bytes');
  const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
  return {
    async seal(value, binding) {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const data = await crypto.subtle.encrypt({name:'AES-GCM', iv, additionalData:enc.encode(binding)}, key, enc.encode(JSON.stringify(value)));
      return {v:1, iv:b64(iv), data:b64(new Uint8Array(data))};
    },
    async open(value, binding) {
      if (value?.v !== 1) throw new Error('Unsupported encrypted record');
      return JSON.parse(dec.decode(await crypto.subtle.decrypt({name:'AES-GCM', iv:bytes(value.iv), additionalData:enc.encode(binding)}, key, bytes(value.data))));
    },
  };
}
