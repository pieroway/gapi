import {test} from 'node:test';
import assert from 'node:assert/strict';
import {owner,request,json,create,payload,sql,eventWhere} from '../support/client.mjs';
test('HTTP listing lifecycle persists in MySQL and drives public visibility',async()=>{
  const created=await request('/api/events',201,create());
  const where=eventWhere(created.public_id);
  const edit=owner(created.edit_guid);
  assert.equal(sql(`SELECT title FROM gapi_events WHERE ${where}`),payload.title);
  assert.equal(sql(`SELECT COUNT(*) FROM gapi_event_item_categories c JOIN gapi_events e ON c.event_id=e.id WHERE e.${where}`),'2');
  await edit(200,json('PUT',{...payload,title:'Persisted update',item_categories:[3],existingPhotos:[]}));
  assert.equal(sql(`SELECT title FROM gapi_events WHERE ${where}`),'Persisted update');
  assert.equal(sql(`SELECT category_id FROM gapi_event_item_categories c JOIN gapi_events e ON c.event_id=e.id WHERE e.${where}`),'3');
  assert.equal((await request(`/api/events/${created.public_id}`,200)).title,'Persisted update');
  await edit(204,{method:'DELETE'});
  assert.equal(sql(`SELECT is_deleted FROM gapi_events WHERE ${where}`),'1');
  await request(`/api/events/${created.public_id}`,404);
  await edit(200,{method:'POST'},'/undelete');
  assert.equal(sql(`SELECT is_deleted FROM gapi_events WHERE ${where}`),'0');
  assert.ok((await request('/api/events',200)).some(e=>e.public_id===created.public_id));
});
test('duplicate categories roll back creation without partial database rows',async()=>{
  const before=sql('SELECT COUNT(*) FROM gapi_events; SELECT COUNT(*) FROM gapi_event_item_categories;');
  // Duplicate categories are rejected before mutation.
  await request('/api/events',400,create({...payload,item_categories:[1,1]}));
  assert.equal(sql('SELECT COUNT(*) FROM gapi_events; SELECT COUNT(*) FROM gapi_event_item_categories;'),before);
});
test('failed update rolls back fields and category replacement',async()=>{
  const created=await request('/api/events',201,create());
  await owner(created.edit_guid)(400,json('PUT',{...payload,title:'Must roll back',item_categories:[2,2],existingPhotos:[]}));
  const detail=await request(`/api/events/${created.public_id}`,200);
  assert.equal(detail.title,payload.title);
  assert.deepEqual(detail.item_category_details.map(c=>Number(c.id)).sort(),[1,2]);
});
