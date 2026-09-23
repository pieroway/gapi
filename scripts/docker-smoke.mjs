// Run after setup and package. No database, host uploads or development volumes.
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {root,verify} from './gapi.mjs';
function docker(args) {
  const r=spawnSync('docker',args,{encoding:'utf8'});
  if(r.error) throw r.error;
  if(r.status!==0) throw Error(r.stderr || r.stdout);
  return r.stdout.trim();
}
verify();
const name=`gapi-tooling-smoke-${process.pid}`;
const before=fs.readFileSync(path.join(root,'php/api/config.php'));
let started=false;
try {
  docker(['create','--name',name,'--publish','127.0.0.1::80',
    '--env','GOOGLE_MAPS_API_KEY=tooling-smoke-key',
    '--tmpfs','/var/www/html/uploads:rw,uid=33,gid=33,mode=0755','gapi-dev-app']);
  started=true;
  docker(['cp',path.join(root,'deploy') + '/.',`${name}:/var/www/html`]);
  docker(['start',name]);
  const binding=docker(['port',name,'80/tcp']);
  const url=`http://${binding}`;
  let response;
  for(let i=0;i<30;i++) {
    try {response=await fetch(`${url}/api/config`); if(response.ok) break;} catch {}
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  assert.equal(response?.status,200,'PHP config route should be ready');
  assert.deepEqual(await response.json(),{googleMapsApiKey:'tooling-smoke-key'});
  const home=await fetch(url);
  assert.equal(home.status,200);
  assert.match(await home.text(),/<html/i);
  assert.equal((await fetch(`${url}/api/config.php`)).status,403);
  docker(['exec','--user','www-data',name,'php','-r',"exit(is_writable('/var/www/html/uploads') ? 0 : 1);"]);
  for(const file of fs.readdirSync(path.join(root,'php/api')).filter(f=>f.endsWith('.php'))) {
    docker(['exec',name,'php','-l',`/var/www/html/api/${file}`]);
  }
  assert.ok(before.equals(fs.readFileSync(path.join(root,'php/api/config.php'))));
  console.log('Docker smoke passed: packaged HTML, PHP routing/environment, protected config, upload permissions and PHP syntax.');
} finally {
  if(started) docker(['rm','--force',name]);
}
