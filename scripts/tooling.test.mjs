import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {build,verify,root} from './gapi.mjs';
function fixture(t) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gapi-tooling-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  fs.cpSync(path.join(root,'public'),path.join(dir,'public'),{recursive:true});
  fs.cpSync(path.join(root,'php/api'),path.join(dir,'php/api'),{recursive:true});
  return dir;
}
test('package excludes server data and replaces stale output reproducibly',t=>{
  const dir=fixture(t);
  fs.mkdirSync(path.join(dir,'public/uploads'),{recursive:true});
  fs.writeFileSync(path.join(dir,'public/uploads/photo.jpg'),'server data');
  fs.writeFileSync(path.join(dir,'public/.user.ini'),'private setting');
  build(dir);
  const manifest=fs.readFileSync(path.join(dir,'deploy-manifest.json'),'utf8');
  assert.ok(!fs.existsSync(path.join(dir,'deploy/uploads')));
  assert.ok(!fs.existsSync(path.join(dir,'deploy/.user.ini')));
  fs.mkdirSync(path.join(dir,'deploy/uploads'));
  assert.throws(()=>verify(dir),/Forbidden artifact path/);
  fs.rmdirSync(path.join(dir,'deploy/uploads'));
  fs.writeFileSync(path.join(dir,'deploy/stale.txt'),'old');
  assert.throws(()=>verify(dir),/file list/);
  build(dir);
  assert.equal(fs.readFileSync(path.join(dir,'deploy-manifest.json'),'utf8'),manifest);
  assert.equal(fs.readFileSync(path.join(dir,'public/uploads/photo.jpg'),'utf8'),'server data');
});
test('verification rejects altered assets and unexpected API files',t=>{
  const dir=fixture(t); build(dir);
  fs.appendFileSync(path.join(dir,'deploy/client.js'),'changed');
  assert.throws(()=>verify(dir),/differs/);
  fs.writeFileSync(path.join(dir,'php/api/secret.ini'),'private');
  assert.throws(()=>build(dir),/Unexpected API/);
});
