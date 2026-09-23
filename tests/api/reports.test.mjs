import {test} from 'node:test';
import assert from 'node:assert/strict';
import {request,json,fixtureId} from '../support/client.mjs';
const token='local_test_admin_only';
const auth={Authorization:`Bearer ${token}`};
const noAdmin=process.env.GAPI_TEST_NO_ADMIN_URL;
assert.match(noAdmin || '',/^http:\/\/127\.0\.0\.1:\d+$/);
async function unconfigured(route,status,options={}) {
  const response=await fetch(noAdmin+route,{...options,redirect:'error',signal:AbortSignal.timeout(10000)});
  assert.equal(response.status,status);
  assert.match(response.headers.get('cache-control'),/no-store/);
  const body=await response.json();
  assert.ok(!JSON.stringify(body).includes(token));
  return body;
}
test('public reports remain available; moderation requires the correct bearer token',async()=>{
  const report=await request('/api/reports',201,json('POST',{public_id:fixtureId,reason:'spam',details:'Private moderation detail'}));
  for(const headers of [{},{Authorization:'Bearer incorrect'},{Authorization:'Basic '+token},{Authorization:'Bearer'},{Authorization:`Bearer ${token}, other`}]) {
    const denied=await request('/api/reports',401,{headers});
    assert.ok(!JSON.stringify(denied).includes('Private moderation detail'));
    await request(`/api/reports/${report.id}`,401,{method:'DELETE',headers});
  }
  await request(`/api/reports?access_token=${token}`,401);
  const response=await fetch(process.env.GAPI_TEST_URL+'/api/reports',{headers:auth,signal:AbortSignal.timeout(10000)});
  assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
  assert.match(response.headers.get('vary'),/Authorization/i);
  const reports=await response.json();assert.ok(reports.some(r=>r.id===report.id && r.details==='Private moderation detail'));
  await request(`/api/reports/${report.id}`,204,{method:'DELETE',headers:auth});
  assert.ok(!(await request('/api/reports',200,{headers:auth})).some(r=>r.id===report.id));
});
test('unconfigured administration denies reads/deletes but permits public submissions',async()=>{
  const report=await unconfigured('/api/reports',201,json('POST',{public_id:fixtureId,reason:'other',details:'Public submission without configured admin'}));
  for(const headers of [{},auth]) {
    await unconfigured('/api/reports',503,{headers});
    await unconfigured(`/api/reports/${report.id}`,503,{method:'DELETE',headers});
  }
  // Both isolated PHP services share the test DB: denied deletion must not mutate it.
  assert.ok((await request('/api/reports',200,{headers:auth})).some(r=>r.id===report.id));
  await request(`/api/reports/${report.id}`,204,{method:'DELETE',headers:auth});
});
