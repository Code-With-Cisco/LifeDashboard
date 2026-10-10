/* Latest-request and account guards for asynchronous section reads. */
(function(root){
  'use strict';
  function create(session){
    const versions=new Map();
    function begin(section){
      const owner=session(),userId=owner?.userId,epoch=owner?.epoch,version=(versions.get(section)||0)+1;
      versions.set(section,version);
      return ()=>{
        const active=session();
        return !!userId && versions.get(section)===version &&
          active?.userId===userId && active?.epoch===epoch;
      };
    }
    return {begin};
  }
  root.SectionReadService={create};
  if(typeof module!=='undefined')module.exports=root.SectionReadService;
})(typeof window!=='undefined'?window:globalThis);
