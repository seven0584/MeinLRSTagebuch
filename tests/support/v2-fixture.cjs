const {createHash}=require('node:crypto');
const {chromium}=require('playwright');
const {createDevServer}=require('../../scripts/dev-server.cjs');

const key='schreibheft-v1';
const dayKey=(offset=0)=>{const d=new Date();d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
function makeFamily({provider='ollama',model='test:local',goal=1,moods=false}={}){
  const hash=pin=>createHash('sha256').update('v2-fixture:'+pin).digest('hex');
  const child=id=>({id,name:id==='one'?'Testkind':'Zweites Testkind',kidPinHash:hash('1234'),entries:[],words:{},names:[],readLog:{},draft:'',draftQ:{},reward:{cfg:{entryWords:goal,entrySentences:1,sentenceWords:1,perSentence:10,perWord:2,comma:5,days:7,firstOnly:true},ledger:[],orders:[]}});
  return {v:2,salt:'v2-fixture',children:['one','two'],active:'one',parent:{pinHash:hash('4321'),grammar:false,topic:'',storage:{mode:'browser'},moodSharing:{enabled:moods,ai:false},learningHelp:{provider,model,execution:'cpu'}},data:{one:child('one'),two:child('two')}};
}
async function openChild(page,id='one'){
  await page.locator(`[data-kid="${id}"]`).click();
  await page.locator('#kidPinBox .p1').fill('1234');await page.locator('#kidPinBox .go').click();
  await page.locator('#ta').waitFor();
}
async function savedFamily(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);}
async function createGuiHarness(){
  // No storage/API runtime: these tests cannot touch the live family folder or start a model.
  const server=createDevServer({storage:false,ai:false,openai:false});
  let browser;
  try{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL || 'msedge',headless:true});
  }catch(e){server.close();throw e;}
  const origin='http://127.0.0.1:'+server.address().port;
  return {
    async close(){await browser.close();await new Promise(resolve=>server.close(resolve));},
    async fixture(t,{family=makeFamily(),width=1280,review,explain}={}){
      const context=await browser.newContext({viewport:{width,height:960}});t.after(()=>context.close());
      const page=await context.newPage(),errors=[],external=[],calls=[];
      await context.addInitScript(({key,family})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(family));},{key,family});
      page.on('pageerror',e=>errors.push(e.message));
      await context.route('**/*',async route=>{
        const req=route.request(),url=new URL(req.url());
        if(url.origin!==origin){external.push(req.url());await route.abort();return;}
        if(!url.pathname.startsWith('/api/ai/')){await route.continue();return;}
        const body=req.postData()?req.postDataJSON():undefined;calls.push({path:url.pathname,body});
        let result;
        if(url.pathname.endsWith('/session'))result={token:'isolated-test-token',supported:true};
        else if(url.pathname.endsWith('/status'))result={phase:'idle',busy:false,installed:true};
        else if(url.pathname.endsWith('/api/tags'))result={models:[{name:'test:local'}]};
        else if(url.pathname.endsWith('/api/show'))result={details:{},model_info:{},capabilities:['completion']};
        else if(url.pathname.endsWith('/api/chat')){
          const input=JSON.parse(body.messages[1].content);
          const reply=body.format.properties.decisions?
            (review?await review(input):{decisions:input.candidates.map(c=>({id:c.id,verdict:'unclear',correction:''})),additional:[]}):
            (explain?await explain(input):{assessment:'needsChange',explanation:'Vergleiche die markierte Stelle mit deinem Wort.',question:'',suggestion:''});
          result={message:{content:JSON.stringify(reply)}};
        }else throw new Error('Unexpected isolated test endpoint: '+url.pathname);
        await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)});
      });
      await page.goto(origin);await page.waitForFunction(()=>window.__test?.ready());
      return {page,context,errors,external,calls};
    }
  };
}
module.exports={createGuiHarness,makeFamily,openChild,savedFamily,dayKey};
