import {test,expect,start,openList,fixtureId} from './fixtures.mjs';
test('stable application surfaces',async({page},testInfo)=>{
  await page.clock.setFixedTime(new Date('2030-06-01T12:00:00Z'));
  await page.emulateMedia({reducedMotion:'reduce'});
  if(testInfo.project.name.startsWith('desktop'))
    await page.addInitScript(()=>Object.defineProperty(navigator,'maxTouchPoints',{get:()=>0}));
  await start(page);
  if(testInfo.project.name.startsWith('desktop')){
    await expect(page.locator('#desktop-only-view')).toBeVisible();
    await expect(page).toHaveScreenshot('desktop-handoff.png');
    return;
  }
  await openList(page);
  await expect(page.locator('.card')).toHaveCount(2);
  await expect(page).toHaveScreenshot('list.png');
  await page.locator(`.card[data-event-id="${fixtureId}"]`).click();
  await expect(page.locator('#detail-title')).toHaveText('Fixture sale');
  await page.locator('#detail-title').click({trial:true});
  await expect(page).toHaveScreenshot('detail.png');
  await page.keyboard.press('Escape');
  const settings=page.locator('#settings-btn');
  await settings.click();
  await expect(page.locator('#settings-modal')).toBeVisible();
  await expect(page).toHaveScreenshot('settings.png');
});
