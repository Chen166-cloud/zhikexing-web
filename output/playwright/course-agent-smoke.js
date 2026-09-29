async (page) => {
  const check = (value, message) => { if (!value) throw new Error(message) }
  const origin = 'http://127.0.0.1:5179'
  const writes = []
  const record = (request) => { if (request.url().includes('/api/v1/') && request.method() !== 'GET') writes.push(request.url()) }
  page.on('request', record)
  await page.goto(origin + '/courses/220331822288990209')
  await page.getByRole('heading', { name: 'Java 后端开发演示课程', exact: true }).waitFor()
  await page.setViewportSize({ width: 320, height: 900 })
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile detail must not overflow')
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.getByRole('link', { name: '咨询这门课程', exact: true }).click()
  await page.waitForURL(origin + '/agent')
  const input = page.getByRole('textbox', { name: '输入消息', exact: true })
  await input.waitFor()
  check((await input.inputValue()).includes('Java 后端开发演示课程'), 'Consultation must prefill course name')
  check((await input.inputValue()).includes('220331822288990209'), 'Consultation must retain string ID')
  check(writes.length === 0, 'Prefill must not create a run or conversation')
  await page.screenshot({ path: 'output/playwright/course-agent-prefill.png' })
  console.log('PASS: course-to-agent prefill without submission, mobile detail')

  await page.goto(origin + '/courses/1')
  await page.getByRole('heading', { name: '没有找到这门课程', exact: true }).waitFor()
  await page.getByRole('link', { name: '浏览其他课程', exact: true }).click()
  await page.getByRole('heading', { name: '探索课程', exact: true }).waitFor()
  await page.route('**/api/v1/courses?*', (route) => route.fulfill({ status: 401, json: { code: 'UNAUTHORIZED', message: '请先登录' } }))
  await page.reload()
  await page.waitForURL((url) => url.pathname === '/login')
  check(await page.evaluate(() => localStorage.getItem('zhikexing_token')) === null, '401 must clear the token')
  console.log('PASS: missing course, return to list, expired session redirect')
  page.off('request', record)
}
