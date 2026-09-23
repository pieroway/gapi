import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {root} from './gapi.mjs';
export function localTarget(port,project) {
  if(!/^127\.0\.0\.1:[1-9]\d{0,4}$/.test(port) || Number(port.split(':')[1])>65535 || !/^gapi-test-\d+-\d+$/.test(project)) throw Error('Only runner-created loopback stacks are accepted');
  return `http://${port}`;
}
export function summarize(samples,elapsedMs) {
  const times=samples.map(s=>s.ms).sort((a,b)=>a-b), errors=samples.filter(s=>!s.ok).length;
  const pct=p=>times[Math.ceil(times.length*p)-1];
  return {requests:samples.length,errors,errorRate:errors/samples.length,elapsedMs,requestsPerSecond:samples.length/(elapsedMs/1000),p50Ms:pct(.5),p95Ms:pct(.95),p99Ms:pct(.99),maxMs:times.at(-1),meanBytes:samples.reduce((n,s)=>n+s.bytes,0)/samples.length,statuses:samples.reduce((a,s)=>{a[s.status]=(a[s.status]||0)+1;return a;},{})};
}
export async function measure(url,scenario,fetcher=fetch) {
  const start=performance.now();let status='network-error',bytes=0,ok=false;
  try {
    const response=await fetcher(url+scenario.route,{redirect:'error',signal:AbortSignal.timeout(10000)});
    status=response.status;const body=await response.text();bytes=Buffer.byteLength(body);
    ok=status===scenario.status && /application\/json/.test(response.headers.get('content-type')||'') && scenario.validate(JSON.parse(body)) && !body.includes('edit_guid');
  } catch { /* Never retain response bodies or credentials. */ }
  return {ms:performance.now()-start,status,bytes,ok};
}
export async function runLoadBaseline({port,project,compose}) {
  const url=localTarget(port,project);
  const sql=query=>compose(['exec','-T','db','mysql','--batch','--skip-column-names','-ugapi_test','-plocal_test_only','gapi_test'],{input:query});
  const rows=Array.from({length:499},(_,i)=>{
    const suffix=String(i+1).padStart(12,'0');
    return `('33333333-3333-4333-8333-${suffix}','44444444-4444-4444-8444-${suffix}','Synthetic sale ${i+1}','Synthetic baseline description','Test address',45.42,-75.69,'2030-06-01 09:00:00','2030-06-01 15:00:00',1)`;
  });
  sql(`INSERT INTO gapi_events (public_id,edit_guid,title,description,address,latitude,longitude,start_datetime,end_datetime,sale_type_id) VALUES ${rows.join(',')};
INSERT INTO gapi_event_item_categories SELECT id,1 FROM gapi_events WHERE id>2;
INSERT INTO gapi_event_ratings (event_id,rating_value) SELECT id,4 FROM gapi_events WHERE is_deleted=FALSE;
INSERT INTO gapi_event_comments (event_id,comment_text) SELECT id,'Synthetic comment' FROM gapi_events WHERE is_deleted=FALSE;`);
  const scenarios=[
    {name:'list',route:'/api/events',status:200,validate:b=>Array.isArray(b)&&b.length===500&&b.every(e=>e.public_id!=='22222222-2222-4222-8222-222222222222')},
    {name:'detail',route:'/api/events/11111111-1111-4111-8111-111111111111',status:200,validate:b=>b.title==='Fixture sale'&&b.comments.length===1},
    {name:'lookup',route:'/api/sale_types',status:200,validate:b=>Array.isArray(b)&&b.length===2},
    {name:'denied-report',route:'/api/reports',status:401,validate:b=>typeof b.message==='string'},
    {name:'missing',route:'/api/events/99999999-9999-4999-8999-999999999999',status:404,validate:b=>typeof b.message==='string'}
  ];
  const report={createdAt:new Date().toISOString(),environment:{node:process.version,platform:os.platform(),arch:os.arch(),cpu:os.cpus()[0]?.model,dockerCompose:compose(['version','--short'],{stdio:'pipe'}),php:compose(['exec','-T','app','php','-r','echo PHP_VERSION;'],{stdio:'pipe'}),mysql:sql('SELECT VERSION();')},dataset:{activeListings:500,deletedListings:1,ratings:500,comments:500,photos:0},policy:{requestsPerScenario:100,concurrency:[1,4,8],timeoutMs:10000,maxErrors:0,p95LimitMs:2000},results:[],resourceSnapshots:[]};
  for(const scenario of scenarios) {
    for(let n=0;n<5;n++) if(!(await measure(url,scenario)).ok) throw Error(`Warmup failed: ${scenario.name}`);
    for(const concurrency of report.policy.concurrency) {
      const samples=[];let next=0;const start=performance.now();
      await Promise.all(Array.from({length:concurrency},async()=>{while(next++<100) samples.push(await measure(url,scenario));}));
      const result={scenario:scenario.name,concurrency,...summarize(samples,performance.now()-start)};
      report.results.push(result);
      console.log(`${scenario.name} c=${concurrency}: p95=${result.p95Ms.toFixed(1)}ms, ${result.requestsPerSecond.toFixed(1)} req/s, errors=${result.errors}`);
    }
    report.resourceSnapshots.push({after:scenario.name,stats:['app','db'].map(service=>({service,data:compose(['stats','--no-stream','--format','json',service],{stdio:'pipe'})}))});
  }
  for(const result of report.results) result.p95RatioToSerial=result.p95Ms/report.results.find(r=>r.scenario===result.scenario&&r.concurrency===1).p95Ms;
  report.mysqlStatus=sql("SHOW GLOBAL STATUS WHERE Variable_name IN ('Threads_connected','Threads_running','Max_used_connections','Slow_queries','Created_tmp_disk_tables','Innodb_buffer_pool_reads','Questions');");
  report.passed=report.results.every(r=>r.errors===0&&r.p95Ms<=report.policy.p95LimitMs);
  const output=path.join(root,'test-results',project);fs.mkdirSync(output,{recursive:true});
  fs.writeFileSync(path.join(output,'load-baseline.json'),JSON.stringify(report,null,2)+'\n');
  console.log(`Load report: ${path.relative(root,output)}/load-baseline.json`);
  if(!report.passed) throw Error('Load baseline failed: unexpected responses or p95 above 2000ms');
}
