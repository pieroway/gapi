import {test} from 'node:test';
import assert from 'node:assert/strict';
import {request,json,create,payload,fixtureId,deletedId,missingId} from '../support/client.mjs';
test('lookup contracts and unsupported methods',async()=>{
  assert.deepEqual(await request('/api/sale_types',200),[{id:1,name:'Garage Sale'},{id:2,name:'Yard Sale'}]);
  assert.deepEqual(await request('/api/item_categories',200),[{id:1,name:'Books'},{id:2,name:'Tools'},{id:3,name:'Furniture'}]);
  for(const route of ['/api/sale_types','/api/item_categories']) await request(route,405,{method:'POST'});
});
test('public list/detail omit deleted listings and editing credentials',async()=>{
  const list=await request('/api/events',200);
  assert.deepEqual(list.map(e=>e.public_id),[fixtureId]);
  const detail=await request(`/api/events/${fixtureId}`,200);
  for(const event of [list[0],detail]) {
    assert.equal(event.title,'Fixture sale');assert.equal(event.latitude,45.42);
    assert.equal(event.longitude,-75.69);assert.equal(event.average_rating,0);
    assert.deepEqual(event.photos,[]);assert.equal(event.sale_type_details.name,'Garage Sale');
    assert.deepEqual(event.item_category_details.map(c=>Number(c.id)).sort(),[1,2]);
    assert.ok(!('edit_guid' in event));assert.ok(!('id' in event));
  }
  assert.deepEqual(detail.comments,[]);
  await request(`/api/events/${deletedId}`,404);await request(`/api/events/${missingId}`,404);
});
test('create, edit, soft delete and restore via HTTP',async()=>{
  const event=await request('/api/events',201,create());
  assert.match(event.public_id,/^[0-9a-f-]{36}$/);assert.match(event.edit_guid,/^[0-9a-f-]{36}$/);
  assert.notEqual(event.public_id,event.edit_guid);
  const edit=`/api/events/edit/${event.edit_guid}`, detail=`/api/events/${event.public_id}`;
  assert.equal((await request(detail,200)).title,payload.title);
  assert.equal((await request(edit,200)).title,payload.title);
  const changed={...payload,title:'Updated sale',sale_type_id:2,item_categories:[3],existingPhotos:[]};
  await request(edit,200,json('PUT',changed));
  const updated=await request(detail,200);assert.equal(updated.title,changed.title);
  assert.equal(Number(updated.sale_type_details.id),2);assert.deepEqual(updated.item_category_details.map(c=>Number(c.id)),[3]);
  await request(edit,204,{method:'DELETE'});
  await request(detail,404);
  assert.ok(!(await request('/api/events',200)).some(e=>e.public_id===event.public_id));
  await request(edit,404,json('PUT',changed));
  await request(edit+'/undelete',200,{method:'POST'});
  assert.equal((await request(detail,200)).title,changed.title);
  assert.ok((await request('/api/events',200)).some(e=>e.public_id===event.public_id));
});
test('malformed/missing input and unknown edit credentials fail',async()=>{
  await request('/api/events',400,{method:'POST'});
  await request('/api/events',400,create('{invalid'));
  const invalid=await request('/api/events',400,create({...payload,title:''}));assert.ok(invalid.fields.includes('title'));
  await request(`/api/events/edit/${missingId}`,404);
  await request(`/api/events/edit/${missingId}`,404,json('PUT',payload));
  await request(`/api/events/edit/${missingId}`,404,{method:'DELETE'});
  await request(`/api/events/edit/${missingId}/undelete`,404,{method:'POST'});
});
