/* Session-bound writes with confirmed results and in-memory retry state. */
(function(root){
  'use strict';
  function create({session, notify, uuid}) {
    let generation=0;
    const drafts=new Map();
    function reset(){generation++;drafts.clear();}
    async function run(key, input, work, success) {
      const owner=session();
      if(!owner?.userId)return false;
      const version=generation;
      const current=()=>version===generation && session()?.userId===owner.userId && session()?.epoch===owner.epoch;
      const signature=JSON.stringify(input);
      let draft=drafts.get(key);
      if(draft?.busy)return false;
      if(!draft || draft.signature!==signature){draft={signature,ids:new Map(),steps:new Map()};drafts.set(key,draft);}
      draft.busy=true;
      const context={
        userId:owner.userId,
        check(){if(!current())throw new Error('Session changed');},
        id(label='record'){if(!draft.ids.has(label))draft.ids.set(label,uuid());return draft.ids.get(label);},
        async step(label, action){
          context.check();
          if(!draft.steps.has(label))draft.steps.set(label,await action());
          context.check();
          return draft.steps.get(label);
        }
      };
      let value;
      try {
        value=await work(context);
        context.check();
      } catch(_) {
        if(current())notify('Save could not be confirmed. Your changes are kept; please retry.');
        return false;
      } finally {draft.busy=false;}
      // A rendering failure must not turn a confirmed write into a retry.
      drafts.delete(key);
      if(success){try{await success(value);}catch(_){if(current())notify('Saved. Refresh this section to load the latest data.');}}
      return true;
    }
    return {run,reset};
  }
  root.DataOperations={create};
  if(typeof module!=='undefined')module.exports=root.DataOperations;
})(typeof window!=='undefined'?window:globalThis);
