import {test,expect} from '@playwright/test';
import {createGoogleCalendarClient,CALENDAR_SCOPE,CalendarError,type GoogleIdentity,type GoogleTokenResponse,type CalendarEventDraft,type GoogleCalendarOptions} from '../src/googleCalendar';
const eventId='0123456789abcdefghijklmnopqrstuv';
const draft=():CalendarEventDraft=>({summary:'CALM — PRIVATE-APPROVED-TEXT',description:'https://vagueslim.github.io/OOCATest/',start:{dateTime:'2026-11-15T06:00:00.000Z',timeZone:'Asia/Bangkok'},end:{dateTime:'2026-11-15T06:15:00.000Z',timeZone:'Asia/Bangkok'}});
function harness(extra:Partial<GoogleCalendarOptions>={}){
 let config:Parameters<GoogleIdentity['initTokenClient']>[0];let loads=0,authorizations=0;const prompts:string[]=[];const requests:{url:string;init:RequestInit}[]=[];
 const identity:GoogleIdentity={initTokenClient(c){config=c;return {requestAccessToken({prompt}){authorizations++;prompts.push(prompt);}};}};
 const client=createGoogleCalendarClient({clientId:'test-client-id',loadIdentity:async()=>{loads++;return identity;},createEventId:()=>eventId,fetch:async(url,init)=>{requests.push({url:String(url),init:init!});return new Response(JSON.stringify({id:eventId,htmlLink:'https://calendar.google.com/calendar/event?eid=confirmed'}),{status:200});},...extra});
 return {client,requests,prompts,get loads(){return loads;},get authorizations(){return authorizations;},get config(){return config;},token(response:Partial<GoogleTokenResponse>={}){config.callback({access_token:'TEST-SECRET-NOT-REAL',expires_in:3600,scope:CALENDAR_SCOPE,...response});},cancel(type='popup_closed'){config.error_callback({type});}};
}
async function rejects(p:Promise<unknown>,code:string){await expect(p).rejects.toMatchObject({name:'CalendarError',code,message:`Calendar operation: ${code}`});}

test('Google service: absent client ID performs no load, OAuth or POST',async()=>{
 const h=harness({clientId:'   '});expect(h.client.configured).toBe(false);await rejects(h.client.prepare(),'setup_required');await rejects(h.client.createEvent(draft()),'setup_required');expect(h.loads).toBe(0);expect(h.authorizations).toBe(0);expect(h.requests).toHaveLength(0);
});
test('Google service: preparation does not authorize and is coalesced; creation needs preparation',async()=>{
 const h=harness();await rejects(h.client.createEvent(draft()),'not_ready');await Promise.all([h.client.prepare(),h.client.prepare(),h.client.prepare()]);expect(h.loads).toBe(1);expect(h.authorizations).toBe(0);expect(h.requests).toHaveLength(0);
});
test('Google service: exact consented JSON, no sensitive URL/logging, immutable snapshot and duplicate guard',async()=>{
 const h=harness();await h.client.prepare();const original=draft(),approved=structuredClone(original);const logs:unknown[][]=[];const old={log:console.log,warn:console.warn,error:console.error};console.log=(...a)=>{logs.push(a);};console.warn=(...a)=>{logs.push(a);};console.error=(...a)=>{logs.push(a);};
 try{
  const pending=h.client.createEvent(original);expect(h.authorizations).toBe(1);await rejects(h.client.createEvent(draft()),'in_flight');expect(h.requests).toHaveLength(0);
  expect(h.config.client_id).toBe('test-client-id');expect(h.config.scope).toBe(CALENDAR_SCOPE);expect(h.config.include_granted_scopes).toBe(false);expect(h.prompts).toEqual(['select_account']);
  original.summary='MUTATED';original.start.dateTime='2099-01-01T00:00:00Z';h.token();const result=await pending;
  expect(result).toEqual({id:eventId,htmlLink:'https://calendar.google.com/calendar/event?eid=confirmed'});expect(h.requests).toHaveLength(1);
  const {url,init}=h.requests[0];expect(url).toBe('https://www.googleapis.com/calendar/v3/calendars/primary/events');expect(url).not.toContain(approved.summary);expect(url).not.toContain('TEST-SECRET');expect(init.method).toBe('POST');expect(init.credentials).toBe('omit');expect(init.referrerPolicy).toBe('no-referrer');expect(init.redirect).toBe('error');
  expect(init.headers).toEqual({Authorization:'Bearer TEST-SECRET-NOT-REAL','Content-Type':'application/json'});expect(JSON.parse(init.body as string)).toEqual({...approved,id:eventId,visibility:'private',transparency:'transparent',reminders:{useDefault:false,overrides:[{method:'popup',minutes:0}]}});expect(logs).toEqual([]);
 }finally{Object.assign(console,old);}
});
for(const [response,code] of [[{error:'access_denied PRIVATE'},'access_denied'],[{scope:'https://www.googleapis.com/auth/calendar.readonly'},'scope_denied'],[{scope:CALENDAR_SCOPE+'-lookalike'},'scope_denied'],[{expires_in:0},'token_expired'],[{expires_in:-1},'token_expired'],[{expires_in:'not a number'},'token_expired'],[{access_token:''},'token_expired']] as [Partial<GoogleTokenResponse>,string][]){
 test(`Google service: invalid token ${JSON.stringify(response)} never POSTs`,async()=>{const h=harness();await h.client.prepare();const p=h.client.createEvent(draft());const assertion=rejects(p,code);h.token(response);await assertion;expect(h.requests).toHaveLength(0);});
}
for(const [type,code] of [['popup_closed','popup_closed'],['popup_failed_to_open','popup_blocked'],['unexpected','network_error']])test(`Google service: ${type} cancels before write and allows explicit fresh authorization`,async()=>{
 const h=harness();await h.client.prepare();const p=h.client.createEvent(draft());const assertion=rejects(p,code);h.cancel(type);await assertion;expect(h.requests).toHaveLength(0);
 const retry=h.client.createEvent(draft());expect(h.authorizations).toBe(2);h.token();await retry;expect(h.requests).toHaveLength(1);
});
test('Google service: expiry between callback and POST blocks write; next click reauthorizes',async()=>{
 let time=1000;const h=harness({now:()=>time});await h.client.prepare();const p=h.client.createEvent(draft());const assertion=rejects(p,'token_expired');h.token({expires_in:1});time=2000;await assertion;expect(h.requests).toHaveLength(0);
 const fresh=h.client.createEvent(draft());h.token();await fresh;expect(h.authorizations).toBe(2);expect(h.requests).toHaveLength(1);
});
for(const failure of ['network','timeout','500','408','409','malformed','missing-id','different-id','null-result'])test(`Google service: uncertain ${failure} never silently retries`,async()=>{
 let posts=0;const h=harness({requestTimeoutMs:10,fetch:async(_url,init)=>{posts++;if(failure==='network')throw new Error('PRIVATE network failure');if(failure==='timeout')return new Promise((_resolve,reject)=>init!.signal!.addEventListener('abort',()=>reject(new Error('abort'))));if(['500','408','409'].includes(failure))return new Response('PRIVATE response',{status:Number(failure)});if(failure==='malformed')return new Response('not JSON');return new Response(JSON.stringify(failure==='missing-id'?{}:failure==='null-result'?null:{id:'wrong'}));}});
 await h.client.prepare();const p=h.client.createEvent(draft());const assertion=rejects(p,'uncertain');h.token();await assertion;await rejects(h.client.createEvent(draft()),'uncertain');expect(posts).toBe(1);expect(h.authorizations).toBe(1);
});
for(const [status,reason,code] of [[401,'','unauthorized'],[429,'','rate_limited'],[403,'quotaExceeded','rate_limited'],[403,'forbidden','access_denied'],[400,'','api_error']] as [number,string,string][])test(`Google service: API ${status} ${reason} is sanitized and not retried`,async()=>{
 let posts=0;const h=harness({fetch:async()=>{posts++;return new Response(JSON.stringify({error:{message:'PRIVATE PROVIDER CONTENT',errors:[{reason}]}}),{status});}});await h.client.prepare();const p=h.client.createEvent(draft());const assertion=rejects(p,code);h.token();await assertion;expect(posts).toBe(1);expect(h.authorizations).toBe(1);
});
for(const htmlLink of ['https://evil.example/event','http://calendar.google.com/event','https://calendar.google.com.evil.example/event','https://user:pass@calendar.google.com/event','javascript:alert(1)','https://www.google.com/url?q=https://evil.example','https://calendar.google.com/calendar/event/redirect','https://calendar.google.com:444/calendar/event'])test(`Google service: rejects unverified success link ${htmlLink}`,async()=>{
 const h=harness({fetch:async()=>new Response(JSON.stringify({id:eventId,htmlLink}))});await h.client.prepare();const p=h.client.createEvent(draft());h.token();expect(await p).toEqual({id:eventId});
});
test('Google service: invalid event does not request OAuth',async()=>{const h=harness();await h.client.prepare();const bad=draft();bad.end.dateTime=bad.start.dateTime;await rejects(h.client.createEvent(bad),'invalid_draft');bad.end.dateTime='invalid';await rejects(h.client.createEvent(bad),'invalid_draft');expect(h.authorizations).toBe(0);expect(h.requests).toHaveLength(0);});
test('Google service: authorization timeout ignores late callback and makes no POST',async()=>{
 const h=harness({authorizationTimeoutMs:10});await h.client.prepare();await rejects(h.client.createEvent(draft()),'network_error');h.token();await new Promise(resolve=>setTimeout(resolve,5));expect(h.requests).toHaveLength(0);
});

for(const htmlLink of ['https://calendar.google.com/calendar/event?eid=confirmed','https://www.google.com/calendar/event?eid=confirmed','https://www.google.com/calendar/event/?eid=confirmed'])test(`Google service: accepts verified event link ${htmlLink}`,async()=>{
 const h=harness({fetch:async()=>new Response(JSON.stringify({id:eventId,htmlLink}))});await h.client.prepare();const p=h.client.createEvent(draft());h.token();expect(await p).toEqual({id:eventId,htmlLink});
});
