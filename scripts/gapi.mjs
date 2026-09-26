import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {qualityGate} from './quality-gate.mjs';
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entries = ['index.html', 'admin.html', 'client.js', 'listing-filters.js', 'service-worker.js', 'markercluster.js', 'manifest.json', 'css', 'images', '.htaccess'];
function files(dir, prefix = '') {
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => {
    const name = prefix + e.name;
    if (e.isSymbolicLink()) throw Error(`Symlinks are not allowed: ${name}`);
    if (e.isDirectory()) return files(path.join(dir,e.name), name + '/');
    if (!e.isFile()) throw Error(`Unsupported file: ${name}`);
    return [name];
  });
}
export function sources(base = root) {
  const result = new Map();
  for (const entry of entries) {
    const source = path.join(base,'public',entry);
    const stat = fs.lstatSync(source);
    if (stat.isSymbolicLink()) throw Error(`Symlink: ${source}`);
    if (stat.isDirectory()) {
      for (const file of files(source)) result.set(`${entry}/${file}`,path.join(source,file));
    } else result.set(entry,source);
  }
  for (const file of files(path.join(base,'php/api'))) {
    if (!/^[a-z_]+\.php$/.test(file)) throw Error(`Unexpected API source: ${file}`);
    result.set(`api/${file}`,path.join(base,'php/api',file));
  }
  for (const file of result.keys()) {
    if (file.split('/').some(p => p.startsWith('.') && p !== '.htaccess') || /\.(sql|map|ini|bat|sh)$/i.test(file)) throw Error(`Forbidden artifact file: ${file}`);
  }
  return result;
}
export function verify(base = root) {
  const expected = sources(base);
  const output = path.join(base,'deploy');
  if (fs.lstatSync(output).isSymbolicLink()) throw Error('Refusing symlink output directory');
  for (const excluded of ['uploads', '.user.ini', '.env', 'node_modules']) {
    if (fs.existsSync(path.join(output,excluded))) throw Error(`Forbidden artifact path: ${excluded}`);
  }
  const actual = files(output).sort();
  if (JSON.stringify(actual) !== JSON.stringify([...expected.keys()].sort())) throw Error('Artifact file list differs from the allowed source files');
  for (const [name,source] of expected) {
    if (!fs.readFileSync(source).equals(fs.readFileSync(path.join(output,name)))) throw Error(`Artifact differs from source: ${name}`);
  }
  return actual;
}
export function build(base = root) {
  const expected = sources(base);
  const output = path.join(base,'deploy');
  // Only this fixed, repository-local generated directory may be replaced.
  if (fs.existsSync(output) && fs.lstatSync(output).isSymbolicLink()) throw Error('Refusing symlink output directory');
  fs.rmSync(output,{recursive:true,force:true});
  fs.mkdirSync(output,{recursive:true});
  for (const [name,source] of expected) {
    const dest = path.join(output,name);
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    fs.copyFileSync(source,dest);
  }
  const manifest = verify(base).map(file => ({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(output,file))).digest('hex')}));
  fs.writeFileSync(path.join(base,'deploy-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log(`Verified ${manifest.length} files in deploy/. Uploads and host configuration excluded.`);
}
function run(program,args) {
  const result = spawnSync(program,args,{cwd:root,stdio:'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) throw Error(`${program} failed (${result.status})`);
}
function compose(args) { run('docker',['compose','--project-name','gapi-dev','--file','php/docker-compose.yml',...args]); }
export function main(command) {
  switch(command) {
    case 'quality-gate': qualityGate(main); break;
    case 'test-audit':
      if(process.platform==='win32') run('cmd.exe',['/d','/s','/c','npm audit --audit-level=high']);
      else run('npm',['audit','--audit-level=high']);
      break;
    case 'test-static': run(process.execPath,['scripts/static-check.mjs']); break;
    case 'build': case 'package': build(); break;
    case 'verify-deploy': console.log(`Verified ${verify().length} deployment files.`); break;
    case 'setup': run('docker',['info','--format','{{.ServerVersion}}']); compose(['config','--quiet']); compose(['build']); break;
    case 'dev': compose(['up','--detach','--build','--wait']); break;
    case 'stop': compose(['stop']); break;
    case 'test-visual': case 'test-visual-update': case 'test-accessibility': case 'test-e2e': case 'test-iphone': case 'test-devices': case 'test-api': case 'test-integration': case 'test-load': run(process.execPath,['scripts/test-stack.mjs',command.slice(5)]); break;
    case 'setup-browsers': run(process.execPath,['node_modules/@playwright/test/cli.js','install','webkit','chromium','firefox']); break;
    case 'test-staging': run(process.execPath,['scripts/staging-preflight.mjs']); break;
    case 'test-docker': run(process.execPath,['scripts/docker-smoke.mjs']); break;
    case 'test':
      console.log('Fast development checks: tooling, unit, then isolated PHP/API tests (Docker required).');
      main('test-tooling');
      main('test-unit');
      main('test-api');
      break;
    case 'test-unit': run(process.execPath,['--test','tests/unit/listing-filters.test.mjs']); break;
    case 'test-tooling': run(process.execPath,['--test','scripts/tooling.test.mjs','scripts/security.test.mjs','scripts/load.test.mjs','scripts/staging.test.mjs','scripts/quality-gate.test.mjs']); break;
    case 'help': console.log('Commands: quality-gate, test-audit, test-static, setup, dev, stop, build, package, verify-deploy, test, test-unit, test-visual, test-visual-update, test-accessibility, test-tooling, test-docker, test-api, test-integration, test-load, setup-browsers, test-e2e, test-iphone, test-devices, test-staging\nRun: node scripts/gapi.mjs <command> or scripts\\<command>.bat\nDefault test runs tooling, unit and isolated PHP/API checks (Docker required). test-tooling needs only Node. Integration, browser and load suites run separately; quality-gate runs all mandatory local suites and verifies the deployment artifact. React component tests will be added with React.'); break;
    default: throw Error(`Unknown command: ${command}. Use help.`);
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { if (process.argv.length > 3) throw Error('Unexpected arguments. Use help.'); main(process.argv[2] || 'help'); } catch(error) { console.error(error.message); process.exitCode=1; }
}
