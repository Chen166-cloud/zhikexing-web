async (page) => {
  const check = (condition, message) => { if (!condition) throw new Error(message) }
  const origin = 'http://127.0.0.1:5179'
  const token = '0123456789abcdef0123456789abcdef'
  let logins = 0
  let registrations = 0
  await page.route('**/user/me', (route) => route.fulfill({
    json: { ok: 1, data: { id: '77', userName: 'demo', nickName: 'Demo' } },
  }))
  await page.route('**/user/login', (route) => {
    logins++
    return route.fulfill(logins === 1 ? {
      status: 429, headers: { 'Retry-After': '3' },
      json: { ok: 0, msg: '登录尝试过于频繁，请稍后重试' },
    } : logins === 2 ? {
      json: { ok: 0, msg: '用户名或密码错误' },
    } : { json: { ok: 1, data: token } })
  })

  await page.getByRole('textbox', { name: '用户名', exact: true }).fill('demo')
  await page.getByRole('textbox', { name: '密码', exact: true }).fill('demo-password')
  await page.getByRole('button', { name: '进入学习空间', exact: true }).click()
  const loginButton = page.locator('button[type=submit]')
  await page.getByRole('button', { name: '请在 3 秒后重试', exact: true }).waitFor()
  check(await loginButton.isDisabled(), '429 must disable submission')
  await page.locator('form').evaluate((form) => form.requestSubmit())
  await page.waitForTimeout(200)
  check(logins === 1, 'Cooldown must suppress repeated submit events')
  await page.waitForFunction(() => !document.querySelector('button[type=submit]').disabled)
  await loginButton.click()
  await page.getByRole('alert').filter({ hasText: '用户名或密码错误' }).waitFor()
  check(await loginButton.isEnabled(), 'Ordinary password failures should allow correction')
  await loginButton.click()
  await page.waitForURL(origin + '/')
  check(await page.evaluate(() => localStorage.getItem('zhikexing_token')) === token,
    'Successful login must store the token')
  console.log('PASS: login 429, duplicate suppression, automatic recovery, ordinary failure, success')

  await page.evaluate(() => localStorage.removeItem('zhikexing_token'))
  await page.route('**/user/register', (route) => {
    registrations++
    return route.fulfill(registrations === 1 ? {
      status: 503, headers: { 'Retry-After': '2' },
      json: { ok: 0, msg: '登录服务繁忙，请稍后重试' },
    } : { json: { ok: 1, data: token } })
  })
  await page.goto(origin + '/register')
  await page.getByRole('textbox', { name: '用户名', exact: true }).fill('demo')
  await page.getByRole('textbox', { name: '密码', exact: true }).fill('demo-password')
  await page.getByRole('textbox', { name: '确认密码', exact: true }).fill('demo-password')
  await page.getByRole('button', { name: '创建账户', exact: true }).click()
  await page.getByRole('button', { name: '请在 2 秒后重试', exact: true }).waitFor()
  check(await page.locator('button[type=submit]').isDisabled(), '503 must respect Retry-After')
  await page.waitForFunction(() => !document.querySelector('button[type=submit]').disabled)
  await page.getByRole('button', { name: '创建账户', exact: true }).click()
  await page.waitForURL(origin + '/')
  console.log('PASS: registration 503, automatic recovery, success')

  await page.unroute('**/user/me')
  await page.route('**/user/me', (route) => route.fulfill({
    status: 401, json: { code: 'UNAUTHORIZED', message: '请先登录' },
  }))
  await page.goto(origin + '/')
  await page.waitForURL(origin + '/login')
  check(await page.evaluate(() => localStorage.getItem('zhikexing_token')) === null,
    'Expired or evicted sessions must clear their token')
  console.log('PASS: expired/evicted session clears token and returns to login')
}
