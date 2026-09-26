import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {owner,request,json,create,payload,sql,fixtureId,missingId} from '../support/client.mjs';
const base=process.env.GAPI_TEST_URL;
const fixtureSecret='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const operations=[['GET',''],['PUT',''],['DELETE',''],['POST','/photos'],['POST','/undelete']];
test('every owner operation denies missing, malformed and wrong credentials before mutation',async()=>{
  sql('DELETE FROM gapi_rate_limits');
  const before=sql('SELECT title,is_deleted FROM gapi_events WHERE id=1; SELECT COUNT(*) FROM gapi_event_photos;');
  for(const [method,suffix] of operations) {
    for(const token of ['', 'Basic ignored', 'Bearer invalid', 'Bearer local_test_admin_only']) {
      const response=await fetch(base+'/api/events/edit'+suffix,{method,headers:token?{Authorization:token}:{}});
      assert.equal(response.status,401);assert.match(response.headers.get('cache-control'),/no-store/);
      assert.match(response.headers.get('vary'),/Authorization/);assert.match(response.headers.get('www-authenticate'),/Bearer/);
      assert.ok(!(await response.text()).includes(fixtureSecret));
    }
    await owner(missingId)(404,method==='PUT'?json(method,payload):{method},suffix);
    await owner(fixtureId)(404,method==='PUT'?json(method,payload):{method},suffix);
  }
  // Query/body tokens cannot substitute for Authorization. Never use a live token here.
  await request('/api/events/edit?edit_guid=retired-test-value',401);
  await request('/api/events/edit',401,json('PUT',{...payload,edit_guid:fixtureSecret}));
  assert.equal(sql('SELECT title,is_deleted FROM gapi_events WHERE id=1; SELECT COUNT(*) FROM gapi_event_photos;'),before);
  sql('DELETE FROM gapi_rate_limits');
});
test('retired URL routes fail closed even with a valid authorization header',async()=>{
  for(const [method,suffix] of operations) await request('/api/events/edit/'+fixtureSecret+suffix,410,{method,headers:{Authorization:'Bearer '+fixtureSecret}});
  assert.equal(sql('SELECT is_deleted FROM gapi_events WHERE id=1'),'0');
});
test('owner lifecycle uses fixed URLs and leaves its capability out of access logs and read responses',async()=>{
  sql('DELETE FROM gapi_rate_limits');
  const event=await request('/api/events',201,create());
  const edit=owner(event.edit_guid);
  const result=await edit(200);assert.equal(result.public_id,event.public_id);assert.ok(!('edit_guid' in result));
  await edit(200,json('PUT',{...payload,title:'Header owner update'}));
  await edit(204,{method:'DELETE'});await edit(200,{method:'POST'},'/undelete');
  assert.equal((await request('/api/events/'+event.public_id,200)).title,'Header owner update');
  // Finish a request before capturing synchronous Apache access-log writes.
  await request('/api/events',200);
  const logs=spawnSync('docker',['logs',process.env.GAPI_TEST_PROJECT+'-app-1'],{encoding:'utf8'});
  assert.equal(logs.status,0);
  const output=logs.stdout+logs.stderr;
  assert.match(output,/PUT \/api\/events\/edit HTTP/);
  assert.match(output,/POST \/api\/events\/edit\/undelete HTTP/);
  assert.ok(!output.includes(event.edit_guid),'Owner capability leaked into server logs');
  sql('DELETE FROM gapi_rate_limits');
});
