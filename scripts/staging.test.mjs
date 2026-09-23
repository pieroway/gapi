import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {checkStaging,getStaging,stagingOrigin} from './staging-preflight.mjs';
const fixture=route=>({status:route==='/api/config.php'?403:route==='/api/reports'?401:200,
  headers:{'content-type':route==='/'?'text/html':'application/json','cache-control':'private, no-store'},
  body:route==='/'?'<html>test</html>':route==='/api/config'?'{"googleMapsApiKey":"private-key"}':route==='/api/events'?'[{"public_id":"fixture","title":"Private title"}]':route==='/api/reports'?'private moderation body':'[{"id":1,"name":"Fixture"}]'});
test('staging preflight uses a fixed host, rejects extra targets, and stores no response content',async()=>{
  const paths=[];const report=await checkStaging(async route=>{paths.push(route);return fixture(route);});
  assert.equal(report.origin,stagingOrigin);assert.equal(report.passed,true);assert.equal(paths.length,7);
  assert.doesNotMatch(JSON.stringify(report),/private-key|Private title|moderation body/);
  assert.throws(()=>getStaging('https://garagesailing.today'),/Unsupported/);
  for(const args of [['scripts/staging-preflight.mjs'],['scripts/gapi.mjs','test-staging']]) {
    const result=spawnSync(process.execPath,[...args,'https://garagesailing.today'],{encoding:'utf8'});
    assert.equal(result.status,1);assert.doesNotMatch(result.stdout,/Report:/);
  }
});
test('TLS failure stops immediately and does not log the underlying error message',async()=>{
  let calls=0;const report=await checkStaging(async()=>{calls++;throw Object.assign(Error('sensitive diagnostic'),{code:'DEPTH_ZERO_SELF_SIGNED_CERT'});});
  assert.equal(calls,1);assert.equal(report.passed,false);assert.equal(report.checks[0].error,'DEPTH_ZERO_SELF_SIGNED_CERT');
  assert.doesNotMatch(JSON.stringify(report),/sensitive/);
});
test('redirects, exposed reports, missing admin configuration and leaked credentials fail',async()=>{
  for(const [route,override] of [['/',{status:302}],['/api/reports',{status:200}],['/api/reports',{status:503}],['/api/reports',{headers:{}}],['/api/events',{body:'[{"public_id":"fixture","title":"x","edit_guid":"secret"}]'}],['/api/config',{body:'{}'}]]) {
    const report=await checkStaging(async p=>({...fixture(p),...(p===route?override:{})}));
    assert.equal(report.passed,false,route);assert.doesNotMatch(JSON.stringify(report),/secret/);
  }
});
