(function(root){
  'use strict';
  const id=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(value);
  const text=(value,max)=>typeof value==='string'&&value.length<=max?value:null;
  function validate(input) {
    if(!input||!Array.isArray(input.tasks)||!Array.isArray(input.goals)||input.tasks.length+input.goals.length>1000||!text(input.vault,100))throw new Error('Invalid Obsidian selection');
    const seen=new Set();
    const record=(r,type)=>{
      if(!r||!id(r.id)||seen.has(r.id)||!text(r.title,300)||!r.title.trim()||!text(r.path,400)||!r.path.endsWith('.md')||r.path.split(/[\\/]/).some(p=>!p||p==='.'||p==='..'||p.startsWith('.'))||/[:\x00-\x1f]/.test(r.path))throw new Error('Each record needs a unique ID, title and relative Markdown path');
      seen.add(r.id);
      const out={id:r.id,title:r.title,path:r.path.replace(/\\/g,'/')};
      if(type==='goal')return {...out,priority:['Critical','High','Medium','Low'].includes(r.priority)?r.priority:'Medium'};
      if(r.goal&&!id(r.goal))throw new Error('Invalid goal ID');
      if(r.estimate!=null&&(!Number.isInteger(r.estimate)||r.estimate<5||r.estimate>1440))throw new Error('Estimate must be 5–1440 minutes');
      if(r.due&&(!/^\d{4}-\d{2}-\d{2}$/.test(r.due)||!Number.isFinite(Date.parse(r.due))||new Date(r.due).toISOString().slice(0,10)!==r.due))throw new Error('Invalid due date');
      if(r.next!=null&&text(r.next,500)===null)throw new Error('Next action is too long');
      return {...out,completed:r.completed===true,goal:r.goal||null,estimate:r.estimate??null,due:r.due||null,next:r.next||null};
    };
    return {vault:input.vault,tasks:input.tasks.map(r=>record(r,'task')),goals:input.goals.map(r=>record(r,'goal'))};
  }
  function parse(files,vault) {
    if(!Array.isArray(files)||files.length>100||files.reduce((n,f)=>n+String(f.text||'').length,0)>1_000_000)throw new Error('Choose at most 100 Markdown files, totaling 1 MB');
    const result={vault,tasks:[],goals:[]};
    for(const file of files)for(const line of String(file.text||'').split(/\r?\n/)) {
      const match=line.match(/<!--\s*dashboard:\s*(\{.*\})\s*-->/);
      if(!match)continue;
      let meta;try{meta=JSON.parse(match[1]);}catch(_){throw new Error('Invalid dashboard metadata in '+file.path);}
      if(meta.type==='goal')result.goals.push({...meta,path:file.path});
      else {const task=line.match(/^\s*- \[([ xX])\] (.*?)\s*<!--/);if(!task)throw new Error('Task metadata needs a Markdown checkbox');result.tasks.push({...meta,title:task[2],completed:task[1].toLowerCase()==='x',path:file.path});}
    }
    return validate(result);
  }
  function changes(before,after) {
    const old=new Map([...(before?.tasks||[]),...(before?.goals||[])].map(r=>[r.id,r])),next=[...after.tasks,...after.goals];
    return {added:next.filter(r=>!old.has(r.id)).length,changed:next.filter(r=>old.has(r.id)&&JSON.stringify(r)!==JSON.stringify(old.get(r.id))).length,removed:[...old.keys()].filter(id=>!next.some(r=>r.id===id)).length};
  }
  root.ObsidianService=Object.freeze({parse,validate,changes});
  if(typeof module!=='undefined'&&module.exports)module.exports=root.ObsidianService;
})(typeof window!=='undefined'?window:globalThis);
