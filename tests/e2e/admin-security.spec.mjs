import {test,expect} from './fixtures.mjs';
test('admin renders hostile stored report values as text',async({page})=>{
  const hostile='<img src=x onerror="window.adminXss=true">';
  await page.route('**/api/reports',route=>route.fulfill({json:[{id:'report',reason:hostile,details:hostile,created_at:'2030-01-01',event:{id:'test',title:hostile,address:hostile,description:hostile}}]}));
  await page.goto('/admin.html');
  await page.locator('#login-password').fill('isolated-ui-test');
  await page.locator('#login-submit').click();
  await expect(page.locator('.report-card').first()).toContainText(hostile);
  await expect(page.locator('.chart-label').first()).toHaveText(hostile.replace(/_/g,' '));
  await expect(page.locator('.report-card img,.chart-label img')).toHaveCount(0);
  expect(await page.evaluate(()=>window.adminXss)).toBeUndefined();
});
