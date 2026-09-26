import {defineConfig} from '@playwright/test';
import base from './playwright.config.mjs';
export default defineConfig({...base,testMatch:'accessibility.spec.mjs',
  projects:base.projects.map(({grep,grepInvert,...project})=>project)
});
