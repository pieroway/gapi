import {defineConfig} from '@playwright/test';
import base from './playwright.config.mjs';
export default defineConfig({
  ...base, testMatch:'visual.spec.mjs', updateSnapshots:'none',
  snapshotPathTemplate:'{testDir}/snapshots/{platform}/{projectName}/{arg}{ext}',
  expect:{...base.expect,toHaveScreenshot:{animations:'disabled',caret:'hide',scale:'css',maxDiffPixels:0}},
  projects:base.projects.map(({grep,grepInvert,...project})=>project)
});
