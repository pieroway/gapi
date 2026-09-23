import {test} from 'node:test';
import assert from 'node:assert/strict';
import {localTarget,measure,summarize} from './load-baseline.mjs';
import {spawnSync} from 'node:child_process';
test('load targets deny external bindings, invalid projects and target arguments',()=>{
  for(const port of ['example.com:80','0.0.0.0:80','localhost:80','127.0.0.1:80/path','127.0.0.1:99999','127.0.0.1:0']) assert.throws(()=>localTarget(port,'gapi-test-1-2'));
  assert.throws(()=>localTarget('127.0.0.1:1234','gapi-dev'));
  assert.equal(localTarget('127.0.0.1:1234','gapi-test-1-2'),'http://127.0.0.1:1234');
  for(const script of [['scripts/gapi.mjs','test-load'],['scripts/test-stack.mjs','load'],['scripts/gapi.mjs','test-e2e'],['scripts/test-stack.mjs','iphone']]) {
    const result=spawnSync(process.execPath,[...script,'https://example.com'],{encoding:'utf8'});
    assert.notEqual(result.status,0);assert.doesNotMatch(result.stdout,/Starting disposable/);
  }
});
test('measurement rejects bad status, invalid JSON, credentials and network failure',async()=>{
  const scenario={route:'/api/events',status:200,validate:Array.isArray};
  for(const [status,body] of [[500,'[]'],[200,'not json'],[200,'[{"edit_guid":"private"}]']]) {
    const result=await measure('http://127.0.0.1:1234',scenario,async(_url,options)=>{
      assert.equal(options.redirect,'error');assert.ok(options.signal);
      return new Response(body,{status,headers:{'content-type':'application/json'}});
    });
    assert.equal(result.ok,false);assert.ok(!JSON.stringify(result).includes('private'));
  }
  assert.equal((await measure('',scenario,async()=>{throw Error('private');})).ok,false);
});
test('summary measures tails, throughput, payload and failures',()=>{
  const result=summarize(Array.from({length:100},(_,i)=>({ms:i+1,bytes:10,status:200,ok:i!==0})),2000);
  assert.equal(result.p95Ms,95);assert.equal(result.p99Ms,99);assert.equal(result.requestsPerSecond,50);assert.equal(result.errorRate,.01);assert.equal(result.meanBytes,10);
});
import {createServer} from 'node:http';
test('real redirects cannot escape the selected target',async()=>{
  let destinationHits=0;
  const destination=createServer((_req,res)=>{destinationHits++;res.end('[]');});
  const redirect=createServer((_req,res)=>{res.writeHead(302,{Location:`http://127.0.0.1:${destination.address().port}/`});res.end();});
  await new Promise(resolve=>destination.listen(0,'127.0.0.1',resolve));
  await new Promise(resolve=>redirect.listen(0,'127.0.0.1',resolve));
  try {
    const result=await measure(`http://127.0.0.1:${redirect.address().port}`,{route:'/',status:200,validate:Array.isArray});
    assert.equal(result.ok,false);assert.equal(destinationHits,0);
  } finally {
    await Promise.all([redirect,destination].map(server=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();})));
  }
});
