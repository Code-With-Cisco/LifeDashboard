/* Encrypted, bounded files for portable personal-record backups. */
(function(root) {
  'use strict';
  const ITERATIONS = 600000;
  const MAX_BYTES = 5 * 1024 * 1024;
  const encoder = () => new TextEncoder();
  const b64 = bytes => {
    let value = '';
    for (let i=0;i<bytes.length;i+=8192) value += String.fromCharCode(...bytes.subarray(i,i+8192));
    return btoa(value);
  };
  const unb64 = value => {
    if (typeof value !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw new Error('Invalid backup encoding.');
    return Uint8Array.from(atob(value), c=>c.charCodeAt(0));
  };
  async function key(password,salt,crypto) {
    if (typeof password !== 'string' || password.length < 12 || password.length > 1024) {
      throw new Error('Use a backup passphrase of 12–1024 characters.');
    }
    const material = await crypto.subtle.importKey('raw',encoder().encode(password),'PBKDF2',false,['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:ITERATIONS,hash:'SHA-256'},
      material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  }
  async function encrypt(value,password,crypto=root.crypto) {
    const plain = encoder().encode(JSON.stringify(value));
    if (plain.length > MAX_BYTES) throw new Error('Backup is too large.');
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(password,salt,crypto),plain);
    return JSON.stringify({format:'LifeDashboard encrypted backup',version:1,algorithm:'AES-256-GCM',
      kdf:'PBKDF2-SHA256',iterations:ITERATIONS,salt:b64(salt),iv:b64(iv),data:b64(new Uint8Array(ciphertext))});
  }
  async function decrypt(file,password,crypto=root.crypto) {
    if (typeof file !== 'string' || encoder().encode(file).length > MAX_BYTES * 1.4 + 4096) throw new Error('Backup is too large.');
    let envelope;
    try { envelope = JSON.parse(file); } catch (_) { throw new Error('Invalid backup file.'); }
    if (envelope?.format !== 'LifeDashboard encrypted backup' || envelope.version !== 1 ||
      envelope.algorithm !== 'AES-256-GCM' || envelope.kdf !== 'PBKDF2-SHA256' || envelope.iterations !== ITERATIONS) {
      throw new Error('Unsupported backup format.');
    }
    const salt=unb64(envelope.salt),iv=unb64(envelope.iv),ciphertext=unb64(envelope.data);
    if (salt.length!==16 || iv.length!==12 || ciphertext.length<16 || ciphertext.length>MAX_BYTES+16) throw new Error('Invalid backup file.');
    try {
      const plain = await crypto.subtle.decrypt({name:'AES-GCM',iv},await key(password,salt,crypto),ciphertext);
      return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(plain));
    } catch (_) { throw new Error('The passphrase is incorrect or the backup is damaged.'); }
  }
  const api=Object.freeze({encrypt,decrypt});root.BackupService=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
