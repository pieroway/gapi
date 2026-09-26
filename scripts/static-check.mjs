import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {root} from './gapi.mjs';
function walk(dir){
  return fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(entry=>{
    const file=path.join(dir,entry.name);
    if(entry.isSymbolicLink()) throw Error('Refusing symlink: '+file);
    if(file===path.join('public','uploads')) return [];
    return entry.isDirectory()?walk(file):[file];
  });
}
let checked=0;
for(const file of [...walk('public'),...walk('scripts'),...walk('tests')]){
  if(/\.(js|mjs)$/.test(file)){
    const result=spawnSync(process.execPath,['--check',file],{cwd:root,stdio:'inherit'});
    if(result.error) throw result.error;
    if(result.status!==0) throw Error('Syntax check failed: '+file);
    checked++;
  }
  if(file.endsWith('.html')){
    const html=fs.readFileSync(path.join(root,file),'utf8');
    for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
      if(/\bsrc\s*=/.test(match[1])||!match[2].trim()) continue;
      new vm.Script(match[2],{filename:file});checked++;
    }
  }
}
console.log('JavaScript syntax checks passed: '+checked+' scripts. PHP syntax is checked by test-docker.');
