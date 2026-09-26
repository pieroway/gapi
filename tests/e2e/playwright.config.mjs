import {defineConfig,devices} from '@playwright/test';
import path from 'node:path';
import {localTarget} from '../../scripts/load-baseline.mjs';
const project=process.env.GAPI_TEST_PROJECT;
const baseURL=localTarget((process.env.GAPI_TEST_URL||'').replace(/^http:\/\//,''),project);
export default defineConfig({
  testDir:'.',testMatch:['baseline.spec.mjs','admin-security.spec.mjs'],fullyParallel:false,workers:1,retries:0,
  timeout:30000,expect:{timeout:7000},forbidOnly:true,
  outputDir:path.resolve('test-results',project,'browser-artifacts'),
  reporter:[['list'],['html',{outputFolder:path.resolve('test-results',project,'browser-report'),open:'never'}]],
  use:{baseURL,serviceWorkers:'block',locale:'en-CA',timezoneId:'America/Toronto',
    trace:'retain-on-failure',screenshot:'only-on-failure',video:'retain-on-failure'},
  projects:[
    {name:'iphone',grepInvert:/@desktop-gate/,use:{...devices['iPhone 12 Pro'],viewport:{width:390,height:844},browserName:'webkit'}},
    {name:'android',grep:/@smoke/,use:{...devices['Pixel 5'],browserName:'chromium'}},
    {name:'tablet',grep:/@smoke/,use:{...devices['iPad (gen 7) landscape'],browserName:'chromium'}},
    {name:'desktop-chromium',grep:/@desktop-gate/,use:{...devices['Desktop Chrome'],hasTouch:false,viewport:{width:1280,height:800}}},
    {name:'desktop-firefox',grep:/@desktop-gate/,use:{...devices['Desktop Firefox'],viewport:{width:1280,height:800}}}
  ]
});
