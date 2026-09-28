/** @jest-environment node */
const {create}=require('../data-operations');
let owner,notify,uuid,writes;
beforeEach(()=>{
  owner={userId:'a',epoch:1};notify=jest.fn();let n=0;uuid=jest.fn(()=>`id-${++n}`);
  writes=create({session:()=>owner,notify,uuid});
});
test('suppresses duplicate clicks and keeps the retry ID after an uncertain result',async()=>{
  let finish;const ids=[];
  const pending=writes.run('meal',{name:'Lunch'},ctx=>{ids.push(ctx.id());return new Promise((_,reject)=>{finish=reject;});});
  expect(await writes.run('meal',{name:'Lunch'},()=>{throw new Error('must not run');})).toBe(false);
  finish(new Error('private server response'));expect(await pending).toBe(false);
  expect(await writes.run('meal',{name:'Lunch'},ctx=>{ids.push(ctx.id());})).toBe(true);
  expect(ids).toEqual(['id-1','id-1']);expect(notify.mock.calls.flat().join()).not.toContain('private');
  await writes.run('meal',{name:'Lunch'},ctx=>{ids.push(ctx.id());});
  expect(ids[2]).toBe('id-2');
});
test('multi-step retry resumes after a confirmed catalog write',async()=>{
  const catalog=jest.fn(async()=>({id:'book'}));let fail=true;
  const work=async ctx=>{await ctx.step('catalog',catalog);await ctx.step('shelf',async()=>{if(fail)throw new Error();});};
  expect(await writes.run('book',{title:'Book'},work)).toBe(false);
  fail=false;expect(await writes.run('book',{title:'Book'},work)).toBe(true);
  expect(catalog).toHaveBeenCalledTimes(1);
});
test('sign-out stops later stages and ignores the old result',async()=>{
  let finish;const next=jest.fn(),success=jest.fn();
  const pending=writes.run('book',{},async ctx=>{await ctx.step('first',()=>new Promise(resolve=>{finish=resolve;}));await ctx.step('second',next);},success);
  writes.reset();owner={userId:'b',epoch:2};finish({id:'old'});
  expect(await pending).toBe(false);expect(next).not.toHaveBeenCalled();expect(success).not.toHaveBeenCalled();expect(notify).not.toHaveBeenCalled();
});
test('a rendering failure after save cannot be retried as an unconfirmed write',async()=>{
  const ids=[];
  expect(await writes.run('save',{},ctx=>ids.push(ctx.id()),()=>{throw new Error();})).toBe(true);
  await writes.run('save',{},ctx=>ids.push(ctx.id()));
  expect(ids).toEqual(['id-1','id-2']);expect(notify).toHaveBeenCalledWith(expect.stringContaining('Saved.'));
});
