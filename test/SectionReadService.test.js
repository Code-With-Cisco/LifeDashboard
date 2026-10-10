/** @jest-environment node */
const {create}=require('../services/SectionReadService');

test('new reads supersede only their own section',()=>{
  const reads=create(()=>({userId:'a',epoch:1}));
  const oldNutrition=reads.begin('nutrition'),library=reads.begin('library');
  const newNutrition=reads.begin('nutrition');
  expect(oldNutrition()).toBe(false);
  expect(newNutrition()).toBe(true);
  expect(library()).toBe(true);
});

test('sign-out and a later session of the same user invalidate outstanding reads',()=>{
  let owner={userId:'a',epoch:1};const reads=create(()=>owner);
  const pending=reads.begin('habits');owner=null;expect(pending()).toBe(false);
  owner={userId:'a',epoch:2};expect(pending()).toBe(false);
  expect(reads.begin('habits')()).toBe(true);
});

test('changing accounts and unauthenticated reads cannot be current',()=>{
  let owner={userId:'a',epoch:1};const reads=create(()=>owner);
  const pending=reads.begin('library');owner={userId:'b',epoch:1};expect(pending()).toBe(false);
  owner=null;const signedOut=reads.begin('library');owner={userId:'b',epoch:1};expect(signedOut()).toBe(false);
});

test('a session object changed in place cannot revive its old read',()=>{
  const owner={userId:'a',epoch:1},reads=create(()=>owner),pending=reads.begin('habits');
  owner.epoch=2;expect(pending()).toBe(false);
});
