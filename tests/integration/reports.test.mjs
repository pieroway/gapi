import {test} from 'node:test';
import assert from 'node:assert/strict';
import {request,json,fixtureId,sql} from '../support/client.mjs';
test('unauthorized report dismissal leaves database rows intact',async()=>{
  const report=await request('/api/reports',201,json('POST',{public_id:fixtureId,reason:'spam'}));
  assert.match(report.id,/^[0-9a-f-]{36}$/);
  const query=`SELECT COUNT(*) FROM gapi_reports WHERE id='${report.id}'`;
  assert.equal(sql(query),'1');
  await request(`/api/reports/${report.id}`,401,{method:'DELETE'});
  await request(`/api/reports/${report.id}`,401,{method:'DELETE',headers:{Authorization:'Bearer wrong'}});
  assert.equal(sql(query),'1');
  await request(`/api/reports/${report.id}`,204,{method:'DELETE',headers:{Authorization:'Bearer local_test_admin_only'}});
  assert.equal(sql(query),'0');
});
