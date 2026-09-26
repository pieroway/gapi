import {test} from 'node:test';
import assert from 'node:assert/strict';
import {qualityGate} from './quality-gate.mjs';
test('a failed mandatory suite prevents packaging and later stages',()=>{
  const ran=[];
  assert.throws(()=>qualityGate(stage=>{
    ran.push(stage);
    if(stage==='test-accessibility') throw Error('accessibility failed');
  },()=>{}),/accessibility failed/);
  assert.equal(ran.at(-1),'test-accessibility');
  assert.ok(!ran.includes('build'));
  assert.ok(!ran.includes('verify-deploy'));
  assert.ok(!ran.includes('test-visual-update'));
});
test('a failed artifact verification prevents artifact smoke and success reporting',()=>{
  const logs=[];
  assert.throws(()=>qualityGate(stage=>{
    if(stage==='verify-deploy') throw Error('invalid artifact');
    assert.notEqual(stage,'test-docker');
  },line=>logs.push(line)),/invalid artifact/);
  assert.ok(!logs.some(line=>line.includes('passed')));
});
