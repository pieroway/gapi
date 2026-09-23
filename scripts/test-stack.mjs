import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {root} from './gapi.mjs';
import {runLoadBaseline} from './load-baseline.mjs';
const suite=process.argv[2];
if(!['api','integration','load','e2e','iphone','devices'].includes(suite) || process.argv.length!==3) throw Error('Use api, integration, load, e2e, iphone or devices; external test targets are not supported.');
const browserSuite=['e2e','iphone','devices'].includes(suite);
const project=`gapi-test-${process.pid}-${Date.now()}`;
const env={...process.env};
for(const key of Object.keys(env)) if(key.startsWith('COMPOSE_') || key.startsWith('GAPI_TEST_')) delete env[key];
const args=['compose','--env-file',path.join(root,'tests/compose.env'),'-p',project,'-f',path.join(root,'tests/compose.yml')];
function compose(command,options={}) {
  const r=spawnSync('docker',[...args,...command],{cwd:root,env,encoding:'utf8',stdio:options.input===undefined?'inherit':'pipe',...options});
  if(r.error) throw r.error;
  if(r.status!==0) throw Error(r.stderr || `Docker failed (${r.status})`);
  return r.stdout?.trim();
}
console.log(`Starting disposable ${suite} stack: ${project}`);
try {
  compose(['up','--detach','--build','--wait','--wait-timeout','180']);
  // Reuse the active schema only, excluding destructive DB creation and old demo rows.
  const source=fs.readFileSync(path.join(root,'php/initializedb.sql'),'utf8');
  const start=source.indexOf('SET default_storage_engine');
  const end=source.indexOf('-- INITIAL DATA POPULATION');
  if(start<0 || end<start) throw Error('Schema boundaries changed; review test initialization.');
  const schema=source.slice(start,end).replace(/--[^\n]*$/,'');
  if(/\b(?:DROP|CREATE)\s+DATABASE\b/i.test(schema)) throw Error('Database-level DDL is not allowed in test seed.');
  compose(['exec','-T','db','mysql','-ugapi_test','-plocal_test_only','gapi_test'],{input:schema+'\n'+fs.readFileSync(path.join(root,'tests/fixtures.sql'),'utf8')});
  const port=compose(['port','app','80'],{stdio:'pipe'});
  if(!/^127\.0\.0\.1:\d+$/.test(port)) throw Error(`Unexpected test binding: ${port}`);
  const noAdminPort=compose(['port','app_no_admin','80'],{stdio:'pipe'});
  if(!/^127\.0\.0\.1:\d+$/.test(noAdminPort)) throw Error('Unexpected unconfigured-admin test binding');
  if(browserSuite) {
    compose(['exec','-T','db','mysql','-ugapi_test','-plocal_test_only','gapi_test'],{input:fs.readFileSync(path.join(root,'tests/e2e/fixtures.sql'),'utf8')});
    const selection=suite==='iphone'?['--project=iphone']:suite==='devices'?['--project=android','--project=tablet','--project=desktop-chromium','--project=desktop-firefox']:[];
    const result=spawnSync(process.execPath,['node_modules/@playwright/test/cli.js','test','--config=tests/e2e/playwright.config.mjs',...selection],{cwd:root,stdio:'inherit',env:{...env,GAPI_TEST_URL:'http://'+port,GAPI_TEST_PROJECT:project}});
    if(result.error) throw result.error;
    if(result.status!==0) throw Error('Browser tests failed ('+result.status+')');
  }
  if(suite==='load') await runLoadBaseline({port,project,compose});
  const testFiles=(suite==='load'||browserSuite) ? [] : fs.readdirSync(path.join(root,'tests',suite)).filter(f=>f.endsWith('.test.mjs')).sort().map(f=>`tests/${suite}/${f}`);
  // Run files sequentially for compatibility with early Node 20 and shared fixtures.
  for (const file of testFiles) {
    const result=spawnSync(process.execPath,['--test',file],{cwd:root,stdio:'inherit',env:{...env,GAPI_TEST_URL:`http://${port}`,GAPI_TEST_NO_ADMIN_URL:`http://${noAdminPort}`,GAPI_TEST_PROJECT:project}});
    if(result.error) throw result.error;
    if(result.status!==0) throw Error(`${suite} tests failed (${result.status})`);
  }
} catch(error) {
  console.error(error.message);
  try {compose(['logs','--no-color','--tail','60']);} catch(logError) {console.error(logError.message);}
  process.exitCode=1;
} finally {
  try {compose(['down','--volumes','--remove-orphans','--timeout','5']);}
  catch(error) {console.error(`Cleanup failed for ${project}: ${error.message}`);process.exitCode=1;}
}
