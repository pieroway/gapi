import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {owner,request,json,create,payload,sql,fixtureId,deletedId,missingId} from '../support/client.mjs';
const reset=()=>sql('DELETE FROM gapi_rate_limits');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZkAAAAASUVORK5CYII=','base64');
function photo(name='image.png',bytes=png) {const body=new FormData();body.set('photo',new Blob([bytes]),name);return {method:'POST',body};}
test('invalid listing values are rejected without database writes',async()=>{
  reset();const before=sql('SELECT COUNT(*) FROM gapi_events');
  for(const patch of [{title:{}},{latitude:91},{longitude:'10'},{start_datetime:'tomorrow'},{end_datetime:'2000-01-01 00:00:00'},{item_categories:[1,1]},{sale_type_id:999},{description:'x'.repeat(5001)}]) await request('/api/events',400,create({...payload,...patch}));
  await request('/api/events',400,{method:'POST',body:new FormData()});
  assert.equal(sql('SELECT COUNT(*) FROM gapi_events'),before);
});
test('JSON, identifiers, deleted listings and filesystem routes deny invalid requests',async()=>{
  reset();
  await request('/api/events/not-a-uuid',400);
  await request(`/api/events/${fixtureId}/comments`,415,{method:'POST',body:'{}'});
  await request(`/api/events/${fixtureId}/comments`,400,json('POST',[]));
  await request(`/api/events/${fixtureId}/comments`,413,json('POST',{comment_text:'x'.repeat(66000)}));
  await request(`/api/events/${fixtureId}/ratings`,400,json('POST',{rating:2.5}));
  await request(`/api/events/${deletedId}/comments`,404,json('POST',{comment_text:'denied'}));
  for(const route of ['/.env','/.user.ini','/.htaccess','/api/config.php','/uploads/evil.php']) assert.equal((await fetch(process.env.GAPI_TEST_URL+route)).status,403,route);
  const response=await fetch(process.env.GAPI_TEST_URL+'/api/events/edit',{headers:{Authorization:'Bearer '+missingId}});
  assert.equal(response.status,404);assert.match(response.headers.get('cache-control'),/no-store/);
});
test('database failure rolls back creation and update',async()=>{
  reset();const event=await request('/api/events',201,create());
  const before=sql('SELECT COUNT(*) FROM gapi_events');
  sql("CREATE TRIGGER security_failure BEFORE INSERT ON gapi_event_item_categories FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='private diagnostic'");
  try {
    const failure=await request('/api/events',500,create());assert.ok(!JSON.stringify(failure).includes('private diagnostic'));
    await owner(event.edit_guid)(500,json('PUT',{...payload,title:'rollback'}));
    assert.equal(sql('SELECT COUNT(*) FROM gapi_events'),before);
    assert.equal((await request('/api/events/'+event.public_id,200)).title,payload.title);
  } finally {sql('DROP TRIGGER security_failure');}
});
test('uploads validate content and enforce photo ownership',async()=>{
  reset();const first=await request('/api/events',201,create());const second=await request('/api/events',201,create());
  const edit=owner(first.edit_guid);
  await edit(400,photo('evil.php'),'/photos');
  await edit(400,photo('fake.png',Buffer.from('not an image')),'/photos');
  await owner(missingId)(404,photo(),'/photos');
  const uploaded=await edit(201,photo('renamed.jpg'),'/photos');
  const detail=await edit(200);const path=detail.photos[0];assert.match(path,/^uploads\/photos-[a-f0-9]{32}\.png$/);
  await owner(second.edit_guid)(400,json('PUT',{...payload,existingPhotos:[path]}));
  assert.equal((await fetch(process.env.GAPI_TEST_URL+'/'+path)).status,200);
  await edit(200,json('PUT',{...payload,existingPhotos:[]}));
  assert.equal((await fetch(process.env.GAPI_TEST_URL+'/'+path)).status,404);
});
test('concurrent writes cannot exceed the IP limit or spoof forwarded addresses',async()=>{
  reset();const results=await Promise.all(Array.from({length:25},(_,i)=>fetch(process.env.GAPI_TEST_URL+`/api/events/${fixtureId}/comments`,{...json('POST',{comment_text:'rate test'}),headers:{'Content-Type':'application/json','X-Forwarded-For':`192.0.2.${i}`}})));
  // Fully consume concurrent responses before synchronous database checks block the event loop.
  await Promise.all(results.map(response=>response.arrayBuffer()));
  assert.equal(results.filter(r=>r.status===201).length,20);assert.equal(results.filter(r=>r.status===429).length,5);
  assert.equal(sql("SELECT COUNT(*) FROM gapi_rate_limits WHERE action='write'"),'20');reset();
});

test('photo database failure removes the saved file and rolls back the listing',async()=>{
  reset();
  function files() {
    const result=spawnSync('docker',['exec',process.env.GAPI_TEST_PROJECT+'-app-1','ls','-1','/var/www/html/uploads'],{encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);return result.stdout;
  }
  const beforeFiles=files();const beforeRows=sql('SELECT COUNT(*) FROM gapi_events');
  sql("CREATE TRIGGER security_photo_failure BEFORE INSERT ON gapi_event_photos FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='private upload diagnostic'");
  try {
    const body=new FormData();body.set('eventData',JSON.stringify(payload));body.set('photos[]',new Blob([png]),'photo.png');
    await request('/api/events',500,{method:'POST',body});
    assert.equal(files(),beforeFiles);assert.equal(sql('SELECT COUNT(*) FROM gapi_events'),beforeRows);
  } finally {sql('DROP TRIGGER security_photo_failure');}
});
test('short write windows cannot clear the longer report limit',async()=>{
  reset();await request('/api/reports',201,json('POST',{public_id:fixtureId,reason:'spam'}));
  sql("UPDATE gapi_rate_limits SET created_at=DATE_SUB(NOW(),INTERVAL 30 MINUTE) WHERE action='report'");
  for(let i=0;i<4;i++) sql("INSERT INTO gapi_rate_limits (ip_address,action,created_at) SELECT ip_address,action,created_at FROM gapi_rate_limits WHERE action='report' LIMIT 1");
  await request('/api/events/'+fixtureId+'/comments',201,json('POST',{comment_text:'window test'}));
  await request('/api/reports',429,json('POST',{public_id:fixtureId,reason:'spam'}));reset();
});
