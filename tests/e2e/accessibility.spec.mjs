import AxeBuilder from '@axe-core/playwright';
import {test,expect,start,openList,fixtureId} from './fixtures.mjs';
async function scan(page,testInfo,label){
  await page.evaluate(async()=> {
    await Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));
  });
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  await testInfo.attach(label,{body:JSON.stringify(result,null,2),contentType:'application/json'});
  expect(result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))).toEqual([]);
}
test('accessible list, details, settings and submission',async({page},testInfo)=>{
  if(testInfo.project.name.startsWith('desktop')){
    await page.addInitScript(()=>Object.defineProperty(navigator,'maxTouchPoints',{get:()=>0}));
    await start(page);await scan(page,testInfo,'desktop');return;
  }
  await start(page);await openList(page);await scan(page,testInfo,'list');
  const card=page.locator(`.card[data-event-id="${fixtureId}"]`);
  const favorite=card.getByRole('button',{name:'Toggle favorite'});
  await favorite.focus();await page.keyboard.press('Enter');
  await expect(page.locator('#detail-panel')).not.toHaveClass(/(^| )open( |$)/);
  await favorite.focus();await page.keyboard.press('Enter');
  await card.locator('.card-body').focus();await page.keyboard.press('Enter');
  await expect(page.locator('#detail-title')).toHaveText('Fixture sale');
  await page.locator('#detail-title').click({trial:true});
  await scan(page,testInfo,'detail');
  await expect(page.locator('#list-panel')).toHaveJSProperty('inert',true);
  const close=page.locator('#detail-back-button');
  await close.focus();await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#report-event-btn')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(card.locator('.card-body')).toBeFocused();
  await expect(page.locator('#detail-panel')).toHaveJSProperty('inert',true);
  const settings=page.locator('#settings-btn');
  await settings.click();
  await scan(page,testInfo,'settings');
  await page.locator('#close-settings-btn').click();
  const add=page.locator('#add-event-btn');
  await add.click();
  await expect(page.locator('#submission-modal')).toBeVisible();
  await scan(page,testInfo,'submission');
});
