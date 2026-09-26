/* Planning forms and confirmed, account-scoped task writes. */
(function(root) {
  'use strict';
  function create(client, context) {
    let generation=0, formVersion=0, busy=false, draft=null;
    const field=id=>document.getElementById(id);
    const current=stamp=>stamp===generation && !!context.profile();
    function reset(){generation++;formVersion++;busy=false;draft=null;}
    function error(message){field('todo-error').textContent=message;}
    function goals(){return context.goals().flatMap(s=>s.goals || []);}
    function fillGoals(selected) {
      const select=field('todo-goal');select.replaceChildren(new Option('No linked goal',''));
      for(const g of goals()) if(g.id) select.add(new Option(g.g,g.id));
      if(selected && ![...select.options].some(o=>o.value===selected)) select.add(new Option('Linked goal unavailable',selected));
      select.value=selected || '';
      field('todo-goal-note').textContent=goals().some(g=>!g.id)?'Edit and save older goals once to make them available here.':'';
    }
    function showTask(data={},isNew=true) {
      formVersion++;
      draft={id:data.id || crypto.randomUUID(),isNew};
      field('todo-edit-id').value=draft.id;
      field('todo-modal-title').textContent=isNew?'ADD TASK':'EDIT TASK';
      for(const [id,key] of [['todo-title','title'],['todo-desc','description'],['todo-due','due_date'],
        ['todo-estimate','estimate_minutes'],['todo-next-action','next_action']]) field(id).value=data[key] ?? '';
      field('todo-status').value=data.status || 'Not Started';fillGoals(data.goal_id);error('');
      field('todo-save').disabled=false;context.open('todo-modal');
    }
    function open(){if(!busy)showTask();}
    async function edit(id) {
      if(busy || !context.profile())return;
      const stamp=generation,version=++formVersion,userId=context.profile().id;
      try {
        const {data,error:failure}=await client.from('todo_items').select('*').eq('id',id).eq('user_id',userId).single();
        if(!current(stamp) || version!==formVersion)return;
        if(failure || !data)throw new Error();
        showTask(data,false);
      } catch(_){if(current(stamp))context.toast('Could not load this task. Please retry.');}
    }
    async function save() {
      if(busy || !draft || !context.profile())return;
      const stamp=generation,version=formVersion,userId=context.profile().id,record={...draft};
      let payload;
      try {
        payload=PlanningService.task({title:field('todo-title').value,description:field('todo-desc').value,
          status:field('todo-status').value,due_date:field('todo-due').value,goal_id:field('todo-goal').value,
          estimate_minutes:field('todo-estimate').value,next_action:field('todo-next-action').value});
      } catch(e){error(e.message);return;}
      busy=true;field('todo-save').disabled=true;error('');
      try {
        let query=record.isNew?client.from('todo_items').insert({...payload,id:record.id,user_id:userId})
          :client.from('todo_items').update(payload).eq('id',record.id).eq('user_id',userId);
        let response=await query.select().single();
        if(!current(stamp))return;
        // A retry after an uncertain insert must not create a second task.
        if(record.isNew && response.error?.code==='23505') {
          response=await client.from('todo_items').select('*').eq('id',record.id).eq('user_id',userId).single();
          if(!current(stamp))return;
          if(Object.entries(payload).some(([key,value])=>response.data?.[key]!==value))throw new Error();
        }
        if(response.error || response.data?.id!==record.id)throw new Error();
        if(version===formVersion){draft=null;context.close('todo-modal');}
        context.toast('Task saved.');context.refresh();
      } catch(_){if(current(stamp) && version===formVersion)error('Task could not be saved. Your changes are kept; retry when connected.');}
      finally{if(current(stamp)){busy=false;field('todo-save').disabled=false;}}
    }
    async function change(id,payload,remove=false) {
      if(busy || !context.profile())return false;
      const stamp=generation,userId=context.profile().id;busy=true;
      try {
        const query=remove?client.from('todo_items').delete():client.from('todo_items').update(payload);
        const {data,error:failure}=await query.eq('id',id).eq('user_id',userId).select('id').single();
        if(!current(stamp))return false;
        if(failure || data?.id!==id)throw new Error();
        context.toast(remove?'Task deleted.':'Task updated.');context.refresh();return true;
      } catch(_){if(current(stamp))context.toast('Task change could not be confirmed. Please retry.');return false;}
      finally{if(current(stamp))busy=false;}
    }
    async function remove(id) {
      const stamp=generation;
      if(await context.confirm('Delete this task?') && current(stamp))await change(id,null,true);
    }
    function addWindow(row={day:1,start:'09:00',end:'10:00'}) {
      const host=field('focus-window-rows');if(host.children.length>=28)return;
      const wrapper=document.createElement('div');wrapper.className='focus-window-row';
      const day=document.createElement('select');day.className='inp';day.setAttribute('aria-label','Weekday');
      ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].forEach((label,i)=>day.add(new Option(label,i)));
      day.value=row.day;wrapper.append(day);
      for(const key of ['start','end']){
        const input=document.createElement('input');input.type='time';input.className='inp';input.value=row[key];
        input.setAttribute('aria-label',key==='start'?'Focus window start':'Focus window end');wrapper.append(input);
      }
      const remove=document.createElement('button');remove.className='btn btn-o';remove.textContent='Remove';
      remove.onclick=()=>wrapper.remove();wrapper.append(remove);host.append(wrapper);
    }
    function openWindows() {
      field('focus-window-rows').replaceChildren();
      root.PersonalData.read('focus_windows',[]).forEach(addWindow);
      field('focus-window-error').textContent='';field('focus-timezone').textContent=context.profile()?.timezone || 'UTC';
      context.open('focus-windows-modal');
    }
    async function saveWindows() {
      const button=field('focus-window-save');if(button.disabled)return;
      const stamp=generation;button.disabled=true;
      let validated=false;
      try {
        const rows=[...field('focus-window-rows').children].map(row=>({day:Number(row.children[0].value),start:row.children[1].value,end:row.children[2].value}));
        const payload=PlanningService.windows(rows);validated=true;
        await root.PersonalData.save('focus_windows',payload);
        if(!current(stamp))return;
        context.close('focus-windows-modal');context.refresh();context.toast('Focus windows saved.');
      } catch(e){if(current(stamp))field('focus-window-error').textContent=!validated?e.message:
        ['PT409','40001'].includes(e.code)?'Focus windows changed in another session. Reload records in Data & backups, then review this draft before saving.':
        'Could not save focus windows. Your draft is kept. Reload records in Data & backups and retry when connected.';}
      finally{if(current(stamp))button.disabled=false;}
    }
    return Object.freeze({reset,open,edit,save,change,remove,openWindows,addWindow,saveWindows});
  }
  root.PlanningUI=Object.freeze({create});
})(window);
