async (page) => {
  const check = (value, message) => { if (!value) throw new Error(message) }
  const origin = 'http://127.0.0.1:8088'
  const errors = []
  const writes = []
  const onError = (error) => errors.push(String(error))
  const onRequest = (request) => {
    if (request.url().includes('/api/v1/') && request.method() !== 'GET') writes.push(request.url())
  }
  page.on('pageerror', onError)
  page.on('request', onRequest)
  try {
    await page.getByRole('heading', { name: '探索课程', exact: true }).waitFor()
    check(await page.locator('.course-card').count() === 3, 'Expected three real demo courses')
    await page.screenshot({ path: 'output/playwright/compose-course-catalog.png' })
    await page.getByRole('searchbox', { name: '课程名称' }).fill('Python与AI应用演示课程')
    await page.getByRole('button', { name: '搜索课程', exact: true }).click()
    await page.getByText('共 1 门', { exact: true }).waitFor()
    await page.locator('.course-card').first().click()
    await page.waitForURL(origin + '/courses/220331822288990210')
    await page.getByRole('heading', { name: 'Python 与 AI 应用演示课程', exact: true }).waitFor()
    check(await page.locator('.course-detail-price').innerText() === '¥4,999', 'Price must be in yuan')
    await page.getByRole('link', { name: '咨询这门课程', exact: true }).click()
    await page.waitForURL(origin + '/agent')
    const composer = page.getByRole('textbox', { name: '输入消息', exact: true })
    await composer.waitFor()
    const draft = await composer.inputValue()
    check(draft.includes('Python 与 AI 应用演示课程') && draft.includes('220331822288990210'), 'Missing consultation draft')
    check(writes.length === 0, 'Consultation prefill must not submit any business request')
    check(errors.length === 0, 'Browser page errors: ' + errors.join('; '))
    await page.screenshot({ path: 'output/playwright/compose-course-agent.png' })
    console.log('PASS: real Compose course list, search, detail price, consultation prefill; zero writes and page errors')
  } finally {
    page.off('pageerror', onError)
    page.off('request', onRequest)
  }
}
