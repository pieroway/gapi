// Keep all mandatory local checks here; CI should call the same command.
export const stages=Object.freeze([
  'test-static','test-audit','test-tooling','test-unit','test-api','test-integration',
  'test-iphone','test-devices','test-accessibility','test-visual','test-load',
  'build','verify-deploy','test-docker'
]);
export function qualityGate(run,log=console.log){
  for(const stage of stages){
    log('Quality gate: '+stage);
    run(stage); // Throwing prevents packaging and all later stages.
  }
  log('Local quality gate passed. Staging and manual release checks remain separate.');
}
