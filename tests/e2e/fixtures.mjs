import {test as base,expect} from '@playwright/test';
import {fileURLToPath} from 'node:url';
const mapsFile=fileURLToPath(new URL('./maps-double.js',import.meta.url));
export const fixtureId='11111111-1111-4111-8111-111111111111';
export const test=base.extend({
  page:async({page,context,baseURL},use)=>{
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await context.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(url.origin===baseURL) return route.continue();
      if(url.origin==='https://maps.googleapis.com' && url.pathname==='/maps/api/js') return route.fulfill({path:mapsFile,contentType:'application/javascript'});
      return route.abort('blockedbyclient');
    });
    await use(page);
    expect(errors,'Unexpected browser exceptions').toEqual([]);
  }
});
export {expect};
export async function start(page){
  await page.goto('/');
  await expect(page.locator('#loading-overlay')).toHaveClass(/hidden/);
}
export async function openList(page){
  if(await page.locator('#nav-events-btn').isVisible()) {
    if(!(await page.locator('#list-panel').getAttribute('class')).split(' ').includes('open')) await page.locator('#nav-events-btn').click();
  }
  await expect(page.locator('#events-container')).toBeVisible();
}
export async function markerIds(page){return page.evaluate(()=>window.__mapsTest.markers.filter(m=>m.map&&m.eventId).map(m=>m.eventId).sort());}
