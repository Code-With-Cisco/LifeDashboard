'use strict';
// Portable encrypted logical-archive tool. Excluded from the static artifact.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const Backup=require('../services/BackupService');
const MAX_ARCHIVE=3*1024*1024;
async function seal(archive,passphrase){
 if(!Buffer.isBuffer(archive)||archive.length<4||archive.length>MAX_ARCHIVE||archive.readUInt32LE(0)!==0x04034b50)throw Error('Choose a ZIP archive of at most 3 MB');
 return Backup.encrypt({format:'LifeDashboard private logical recovery',version:1,archive:archive.toString('base64'),sha256:crypto.createHash('sha256').update(archive).digest('hex')},passphrase,crypto.webcrypto);
}
async function open(envelope,passphrase){
 const value=await Backup.decrypt(envelope,passphrase,crypto.webcrypto);
 if(value?.format!=='LifeDashboard private logical recovery'||value.version!==1||typeof value.archive!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(value.archive)||!/^[a-f0-9]{64}$/.test(value.sha256||''))throw Error('Unsupported recovery archive');
 const archive=Buffer.from(value.archive,'base64');
 if(archive.length<4||archive.length>MAX_ARCHIVE||archive.readUInt32LE(0)!==0x04034b50||crypto.createHash('sha256').update(archive).digest('hex')!==value.sha256)throw Error('Recovery archive checksum mismatch');
 return archive;
}
function privatePath(file,{plaintext=false}={}){
 const absolute=path.resolve(file),resolved=fs.existsSync(absolute)?fs.realpathSync(absolute):path.join(fs.realpathSync(path.dirname(absolute)),path.basename(absolute));
 const root=fs.realpathSync(path.resolve(__dirname,'..')),relative=path.relative(root,resolved);
 if(!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative))throw Error('Recovery material must stay outside the repository');
 if(plaintext)for(const folder of [process.env.OneDrive,process.env.OneDriveConsumer,process.env.OneDriveCommercial].filter(Boolean)){
  const cloud=fs.realpathSync(folder),within=path.relative(cloud,resolved);
  if(!within.startsWith('..'+path.sep)&&!path.isAbsolute(within))throw Error('Keep plaintext recovery material outside OneDrive');
 }
 return resolved;
}
async function main(){
 const [mode,input,keyFile,output,...extra]=process.argv.slice(2);
 if(extra.length||!['encrypt','verify','restore'].includes(mode)||!input||!keyFile||(mode!=='verify'&&!output)||(mode==='verify'&&output))throw Error('Usage: recovery-archive.js encrypt|verify|restore <private input> <private passphrase file> [private output]');
 const password=fs.readFileSync(privatePath(keyFile,{plaintext:true}),'utf8').trim();
 if(mode==='encrypt'){
  const envelope=await seal(fs.readFileSync(privatePath(input,{plaintext:true})),password);
  await open(envelope,password);fs.writeFileSync(privatePath(output),envelope,{flag:'wx',mode:0o600});
 }else{
  const archive=await open(fs.readFileSync(privatePath(input),'utf8'),password);
  if(mode==='restore')fs.writeFileSync(privatePath(output,{plaintext:true}),archive,{flag:'wx',mode:0o600});
 }
 console.log('PASS: authenticated recovery archive and checksum verified');
}
module.exports={seal,open};
if(require.main===module)main().catch(()=>{console.error('Recovery operation failed. Check the private paths, passphrase and archive; existing files are not overwritten.');process.exitCode=1;});
