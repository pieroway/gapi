import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {root} from './gapi.mjs';
const source=fs.readFileSync(path.join(root,'public/service-worker.js'),'utf8');
test('service worker never serves or stores cached reports, including failed requests',async()=>{
  for(const route of ['/api/reports','/api/reports/123','/api/reports.php']) {
    const handlers={};let options;
    const context={URL,console,self:{addEventListener:(name,fn)=>handlers[name]=fn},caches:{open(){throw Error('Protected response touched cache');},match(){throw Error('Protected response read cache');}},fetch:async(request,opts)=>{options=opts;return {status:401};}};
    vm.runInNewContext(source,context);
    let response;
    handlers.fetch({request:{url:'https://example.test'+route,method:'GET'},respondWith:p=>response=p});
    assert.equal((await response).status,401);assert.equal(options.cache,'no-store');
    context.fetch=async()=>{throw Error('offline');};
    handlers.fetch({request:{url:'https://example.test'+route,method:'GET'},respondWith:p=>response=p});
    await assert.rejects(response,/offline/);
  }
});
test('activation removes caches containing old moderation responses and unsafe rendering assets',async()=>{
  const handlers={};const removed=[];let claimed=false;
  vm.runInNewContext(source,{console,URL,self:{addEventListener:(name,fn)=>handlers[name]=fn,clients:{claim:()=>{claimed=true;}}},caches:{keys:async()=>['events-map-cache-v4','events-map-cache-v5','events-map-cache-v6'],delete:async name=>{removed.push(name);}}});
  let activation;handlers.activate({waitUntil:p=>activation=p});await activation;
  assert.deepEqual(removed,['events-map-cache-v4','events-map-cache-v5']);assert.equal(claimed,true);
});
