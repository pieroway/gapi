import assert from 'node:assert/strict';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {root} from '../../scripts/gapi.mjs';
const url=process.env.GAPI_TEST_URL;
const project=process.env.GAPI_TEST_PROJECT;
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(url || '') || !/^gapi-test-\d+-\d+$/.test(project || '')) throw Error('Run via test-api/test-integration; only runner-created local stacks are accepted.');
export const fixtureId='11111111-1111-4111-8111-111111111111';
export const deletedId='22222222-2222-4222-8222-222222222222';
export const missingId='99999999-9999-4999-8999-999999999999';
export const payload={title:'CRUD test sale',description:'Books and tools',address:'3 Test Street',latitude:45.44,longitude:-75.71,start_datetime:'2030-07-01 09:00:00',end_datetime:'2030-07-01 15:00:00',sale_type_id:1,item_categories:[1,2]};
export async function request(route,status,options={}) {
  const response=await fetch(url+route,{...options,signal:AbortSignal.timeout(10000),redirect:'error'});
  const text=await response.text();
  assert.equal(response.status,status,`${options.method || 'GET'} ${route}: ${text}`);
  if(status===204) {assert.equal(text,'');return null;}
  assert.match(response.headers.get('content-type'),/application\/json/);
  return JSON.parse(text);
}
export function json(method,body) {return {method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)};}
export function create(body=payload) {
  const form=new FormData();form.set('eventData',typeof body==='string'?body:JSON.stringify(body));
  return {method:'POST',body:form};
}
export function sql(query) {
  const r=spawnSync('docker',['compose','--env-file',path.join(root,'tests/compose.env'),'-p',project,'-f',path.join(root,'tests/compose.yml'),'exec','-T','db','mysql','--batch','--skip-column-names','-ugapi_test','-plocal_test_only','gapi_test'],{cwd:root,input:query,encoding:'utf8'});
  if(r.error) throw r.error;
  assert.equal(r.status,0,r.stderr);
  return r.stdout.trim();
}
export function eventWhere(id) {
  assert.match(id,/^[0-9a-f-]{36}$/i);
  return `public_id = '${id}'`;
}
