import {test,expect,start,openList,markerIds,fixtureId} from './fixtures.mjs';
const card=page=>page.locator(`.card[data-event-id="${fixtureId}"]`);
test('startup, card details, keyboard dismissal and map marker selection @smoke',async({page})=>{
  await start(page);await openList(page);
  await expect(page.locator('.card')).toHaveCount(2);
  await expect(page.locator('#events-container')).not.toContainText('Deleted fixture');
  expect(await markerIds(page)).toHaveLength(2);
  await card(page).click();
  await expect(page.locator('#detail-title')).toHaveText('Fixture sale');
  await expect(page.locator('#detail-content')).toContainText('1 Test Street');
  await expect(page.locator('#detail-content')).toContainText('Deterministic listing');
  await page.keyboard.press('Escape');
  await expect(page.locator('#detail-panel')).not.toHaveClass(/(^| )open( |$)/);
  await page.evaluate(id=>window.__mapsTest.markers.find(m=>m.map&&m.eventId===id).emit('gmp-click'),fixtureId);
  await expect(page.locator('#detail-title')).toHaveText('Fixture sale');
  await expect(page.locator('#detail-panel')).toHaveClass(/(^| )open( |$)/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('combined filters, map consistency, persistence and clear @smoke',async({page})=>{
  await start(page);await openList(page);
  await page.locator('.sale-type-pill[data-sale-type="2"]').click();
  await page.locator('.category-pill[data-category="3"]').click();
  await page.locator('#search-input').fill('sofa');
  await expect(page.locator('.card')).toHaveCount(1);
  await expect(page.locator('.card-title')).toHaveText('Yard fixture');
  expect(await markerIds(page)).toEqual(['33333333-3333-4333-8333-333333333333']);
  await page.reload();await expect(page.locator('#loading-overlay')).toHaveClass(/hidden/);await openList(page);
  await expect(page.locator('#search-input')).toHaveValue('sofa');
  await expect(page.locator('.card')).toHaveCount(1);
  await page.locator('#search-input').fill('no matching sale');
  await expect(page.locator('.no-results-container')).toContainText('No events match');
  expect(await markerIds(page)).toEqual([]);
  await page.locator('.no-results-container button').click();
  await expect(page.locator('.card')).toHaveCount(2);
  expect(await markerIds(page)).toHaveLength(2);
});
test('favorites persist through reload and can be removed from details',async({page})=>{
  await start(page);await openList(page);
  await card(page).getByRole('button',{name:'Toggle favorite'}).click();
  await page.locator('.sale-type-pill[data-sale-type="favorites"]').click();
  await expect(page.locator('.card')).toHaveCount(1);
  await page.reload();await expect(page.locator('#loading-overlay')).toHaveClass(/hidden/);await openList(page);
  await expect(card(page)).toBeVisible();await card(page).click();
  await page.locator('#detail-favorite-btn').click();await page.keyboard.press('Escape');
  await expect(page.locator('.no-results-container')).toBeVisible();
});
test('startup and detail failures produce visible errors',async({page})=>{
  await page.route('**/api/events',route=>route.fulfill({status:503,json:{message:'Unavailable'}}));
  await start(page);await openList(page);
  await expect(page.locator('#events-container')).toContainText('Could not load events.');
  await page.unroute('**/api/events');await page.reload();
  await expect(page.locator('#loading-overlay')).toHaveClass(/hidden/);await openList(page);
  await page.route(`**/api/events/${fixtureId}`,route=>route.fulfill({status:404,json:{message:'Not found'}}));
  await card(page).click();await expect(page.locator('#detail-title')).toHaveText('Error');
  await expect(page.locator('#detail-content')).toContainText('Event not found');
});
test('empty collection has a usable no-results state',async({page})=>{
  await page.route('**/api/events',route=>route.fulfill({json:[]}));
  await start(page);await openList(page);await expect(page.locator('.no-results-container')).toBeVisible();
  expect(await markerIds(page)).toEqual([]);
});
test('create validates required fields, persists to PHP, and renders hostile text safely',async({page,request})=>{
  const hostile='<img src=x onerror="window.__injected=1">';
  const requestUrls=[];page.on('request',request=>requestUrls.push(request.url()));
  let created;
  try {
    await start(page);
    await page.locator('#nav-add-btn').click();
    await page.locator('#submit-event-btn').click();
    await expect(page.locator('#submission-form')).toContainText('Title is required');
    await page.locator('#event-title').fill(hostile);
    await page.locator('#event-description').fill('Books '+hostile);
    await page.locator('#event-address-automcomplete').fill('4 Test Street '+hostile);
    await page.evaluate(address=>window.__mapsTest.selectAddress(address),'4 Test Street '+hostile);
    await page.locator('#event-start').fill('2030-07-01T09:00');
    await page.locator('#event-end').fill('2030-07-01T15:00');
    await page.locator('#event-sale-type-pills .filter-pill').first().click();
    await page.locator('label[for="category-checkbox-1"]').click();
    page.once('dialog',dialog=>dialog.accept());
    const responsePromise=page.waitForResponse(response=>response.url().endsWith('/api/events')&&response.request().method()==='POST');
    await page.locator('#submit-event-btn').click();
    const response=await responsePromise;expect(response.status()).toBe(201);created=await response.json();
    const ownerRead=await page.evaluate(async token=>{
      const response=await fetch('/api/events/edit',{headers:{Authorization:'Bearer '+token},cache:'no-store'});
      return {status:response.status,cache:response.headers.get('cache-control'),data:await response.json()};
    },created.edit_guid);
    expect(ownerRead.status).toBe(200);expect(ownerRead.cache).toContain('no-store');
    expect(ownerRead.data.public_id).toBe(created.public_id);expect(ownerRead.data.edit_guid).toBeUndefined();
    expect(requestUrls.every(url=>!url.includes(created.edit_guid))).toBe(true);
    await expect(page.locator('#submission-modal')).not.toHaveClass(/visible/);
    await openList(page);
    const createdCard=page.locator(`.card[data-event-id="${created.public_id}"]`);
    await expect(createdCard.locator('.card-title')).toHaveText(hostile);
    await expect(createdCard.locator('img')).toHaveCount(0);
    await createdCard.click();
    await expect(page.locator('#detail-title')).toHaveText(hostile);
    await expect(page.locator('#detail-content')).toContainText('4 Test Street '+hostile);
    await expect(page.locator('#detail-content img')).toHaveCount(0);
    expect(await page.evaluate(()=>window.__injected)).toBeUndefined();
    await page.reload();await expect(page.locator('#loading-overlay')).toHaveClass(/hidden/);await openList(page);
    await expect(createdCard.locator('.card-title')).toHaveText(hostile);
    const persisted=await request.get(`/api/events/${created.public_id}`);
    expect((await persisted.json()).title).toBe(hostile);
  } finally {
    if(created) expect((await request.delete('/api/events/edit',{headers:{Authorization:'Bearer '+created.edit_guid}})).status()).toBe(204);
  }
});
test('settings persist and denied geolocation does not prevent browsing',async({page})=>{
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(_ok,fail){fail({code:1,message:'Denied'});},watchPosition(_ok,fail){fail({code:1,message:'Denied'});return 1;}}});
  });
  await start(page);await page.locator('#center-location-button').click();
  await page.locator('#nav-settings-btn').click();
  await page.locator('label[for="theme-standard"]').click();
  await page.locator('label[for="map-type-satellite"]').click();
  await page.locator('#close-settings-btn').click();
  await page.reload();await expect(page.locator('#loading-overlay')).toHaveClass(/hidden/);
  await expect(page.locator('body')).toHaveClass(/standard-theme/);
  expect(await page.evaluate(()=>window.__mapsTest.map.mapTypeId)).toBe('satellite');
  await openList(page);await expect(page.locator('.card')).toHaveCount(2);
});
test('hostile photo URLs and lookup labels cannot inject markup @smoke',async({page})=>{
  const hostile='<img src=x onerror="window.__injected=1">';
  await page.route(/\/api\/events(?:\/[0-9a-f-]+)?$/,async route=>{
    const response=await route.fetch({maxRedirects:0});const data=await response.json();
    const mutate=event=>({...event,photos:[`x');\"><img src=x onerror="window.__injected=1">`,'javascript:window.__injected=1'],sale_type_details:{id:1,name:hostile},item_category_details:[{id:1,name:hostile}]});
    await route.fulfill({response,json:Array.isArray(data)?data.map(mutate):mutate(data)});
  });
  await start(page);await openList(page);
  await expect(card(page).locator('.mini-pill').first()).toHaveText(hostile);
  await expect(card(page).locator('img')).toHaveCount(0);
  await card(page).click();
  await expect(page.locator('#detail-content .mini-pill').first()).toHaveText(hostile);
  await expect(page.locator('#detail-content img')).toHaveCount(0);
  expect(await page.evaluate(()=>window.__injected)).toBeUndefined();
  expect(await page.locator('#detail-content .slider-slide').nth(1).evaluate(el=>el.style.backgroundImage)).toBe('');
});
test('non-touch desktop shows the existing mobile handoff @desktop-gate',async({page})=>{
  // Windows Chromium exposes the host touchscreen even with hasTouch:false.
  await page.addInitScript(()=>Object.defineProperty(navigator,'maxTouchPoints',{get:()=>0}));
  await start(page);
  await expect(page.locator('#desktop-only-view')).toBeVisible();
  await expect(page.locator('#desktop-only-view')).toContainText('This experience is designed for mobile.');
  await expect(page.locator('#app-wrapper')).toBeHidden();
});
