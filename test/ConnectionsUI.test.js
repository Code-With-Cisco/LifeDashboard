/** @jest-environment node */
const fs=require('fs'),path=require('path'),{JSDOM}=require('jsdom');
let dom,win,ui,resolve,profile;
beforeEach(()=>{
 dom=new JSDOM('<div id="brief-answer"></div><div id="brief-context"></div><input id="brief-question" value="What next?"><textarea id="brief-memory"></textarea>',{url:'https://dashboard.test',runScripts:'outside-only'});win=dom.window;profile={id:'owner'};
 for(const file of ['services/SecurityService.js','services/ConnectorService.js','connections.js'])win.eval(fs.readFileSync(path.join(__dirname,'..',file),'utf8'));
 ui=win.ConnectionsUI.create({functions:{invoke:()=>new Promise(r=>{resolve=r;})}},{enabled:()=>true,profile:()=>profile});
});
afterEach(()=>dom.window.close());
const brief=title=>({focus:[{kind:'task',title,reason:'Due today'}]});
const result={data:{text:'Old answer',facts:[{id:'focus_0',text:'Old fact'}],mode:'assisted'}};
test('a response for an older brief cannot replace the refreshed context',async()=>{
 ui.setBrief(brief('Old task'));const pending=ui.ask();ui.setBrief(brief('Current task'));resolve(result);await pending;
 expect(win.document.getElementById('brief-context').textContent).toContain('Current task');
 expect(win.document.getElementById('brief-answer').textContent).not.toContain('Old');
});
test('an in-flight private answer is ignored after account reset',async()=>{
 ui.setBrief(brief('Old task'));const pending=ui.ask();ui.reset();profile={id:'different-owner'};resolve(result);await pending;
 expect(win.document.getElementById('brief-answer').textContent).not.toContain('Old');
});
