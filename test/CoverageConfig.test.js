/** @jest-environment node */
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {loadNycConfig}=require('@istanbuljs/load-nyc-config');

test('coverage configuration still loads YAML inheritance with the reviewed parser override',async()=>{
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'lifedashboard-coverage-config-'));
  try{
    await fs.writeFile(path.join(directory,'package.json'),JSON.stringify({name:'coverage-fixture'}));
    await fs.writeFile(path.join(directory,'base.yml'),'include:\n  - services/**/*.js\ncheck-coverage: true\n');
    await fs.writeFile(path.join(directory,'.nycrc.yml'),'extends: ./base.yml\nall: true\nexclude:\n  - test/**\n');
    const config=await loadNycConfig({cwd:directory});
    expect(config).toMatchObject({include:['services/**/*.js'],exclude:['test/**'],checkCoverage:true,all:true});
  }finally{
    await fs.rm(directory,{recursive:true,force:true});
  }
});
