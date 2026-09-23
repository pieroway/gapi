import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {root} from './gapi.mjs';
export const stagingOrigin='https://staging.garagesailing.today';
const routes=['/','/api/config','/api/events','/api/sale_types','/api/item_categories','/api/reports','/api/config.php'];

export function getStaging(route) {
  if(!routes.includes(route)) throw Error('Unsupported staging check');
  return new Promise((resolve,reject)=>{
    // Explicit TLS validation even if the caller has disabled Node's global default.
    // https.get does not follow redirects and never sends authentication or cookies.
    const request=https.get(stagingOrigin+route,{rejectUnauthorized:true,timeout:15000,headers:{Accept:route==='/'?'text/html':'application/json'}},response=>{
      let bytes=0;const chunks=[];
      response.on('data',chunk=>{
        bytes+=chunk.length;
        if(bytes>5*1024*1024) request.destroy(Object.assign(Error('Response limit'),{code:'RESPONSE_TOO_LARGE'}));
        else chunks.push(chunk);
      });
      response.on('error',reject);
      response.on('end',()=>resolve({status:response.statusCode,headers:response.headers,body:Buffer.concat(chunks).toString('utf8')}));
    });
    request.on('timeout',()=>request.destroy(Object.assign(Error('Timeout'),{code:'TIMEOUT'})));
    request.on('error',reject);
  });
}

export async function checkStaging(get=getStaging) {
  const report={createdAt:new Date().toISOString(),origin:stagingOrigin,scope:'Read-only HTTPS/API preflight; not the full browser/write baseline',checks:[],passed:false};
  for(const route of routes) {
    let response;
    try {response=await get(route);} catch(error) {
      const allowed=['DEPTH_ZERO_SELF_SIGNED_CERT','CERT_HAS_EXPIRED','UNABLE_TO_VERIFY_LEAF_SIGNATURE','ERR_TLS_CERT_ALTNAME_INVALID','SELF_SIGNED_CERT_IN_CHAIN','ENOTFOUND','ECONNREFUSED','TIMEOUT','RESPONSE_TOO_LARGE'];
      report.checks.push({route,passed:false,error:allowed.includes(error.code)?error.code:'CONNECTION_FAILED'});
      return report; // Fail closed before attempting further protected checks.
    }
    const {status,headers,body}=response;
    let passed=false,reason='Unexpected status or response contract';
    try {
      if(route==='/') passed=status===200 && /text\/html/i.test(headers['content-type']||'') && /<html/i.test(body);
      else if(route==='/api/config.php') passed=status===403;
      else if(route==='/api/reports') {
        // Do not parse or retain moderation data if the deployed server exposes it.
        passed=status===401 && /no-store/i.test(headers['cache-control']||'');
        if(status===503) reason='Administration configuration missing';
        if(status===200) reason='Unauthenticated moderation access allowed';
      } else if(status===200 && /application\/json/i.test(headers['content-type']||'')) {
        const data=JSON.parse(body);
        if(route==='/api/config') passed=typeof data.googleMapsApiKey==='string' && data.googleMapsApiKey.trim().length>0;
        else if(route==='/api/events') passed=Array.isArray(data) && data.every(event=>typeof event.public_id==='string' && typeof event.title==='string' && !('edit_guid' in event) && !event.is_deleted);
        else passed=Array.isArray(data) && data.length>0 && data.every(item=>typeof item.name==='string' && Number.isInteger(Number(item.id)));
      }
    } catch { /* Never include server content, credentials or personal data in reports. */ }
    report.checks.push({route,status,passed,...(passed?{}:{reason})});
  }
  report.passed=report.checks.every(check=>check.passed);
  return report;
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    if(process.argv.length!==2) throw Error('No arguments accepted; this command only checks the fixed staging origin.');
    const report=await checkStaging();
    const directory=path.join(root,'test-results','staging');fs.mkdirSync(directory,{recursive:true});
    const filename=`preflight-${Date.now()}.json`;
    fs.writeFileSync(path.join(directory,filename),JSON.stringify(report,null,2)+'\n');
    for(const check of report.checks) console.log(`${check.passed?'PASS':'FAIL'} ${check.route}: ${check.error||check.reason||check.status}`);
    console.log(`Report: test-results/staging/${filename}`);
    if(!report.passed) process.exitCode=1;
  } catch(error) {console.error(error.message);process.exitCode=1;}
}
