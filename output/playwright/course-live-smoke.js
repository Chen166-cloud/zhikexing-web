async (page) => {
  const check = (value, message) => { if (!value) throw new Error(message) }
  const origin = 'http://127.0.0.1:5179'
  await page.unrouteAll({ behavior: 'wait' })
  await page.goto(origin + '/login')
  await page.getByRole('textbox', { name: '用户名', exact: true }).fill('catdemo')
  await page.getByRole('textbox', { name: '密码', exact: true }).fill('CatalogDemo123')
  await page.getByRole('button', { name: '进入学习空间', exact: true }).click()
  await page.waitForURL(origin + '/')
  await page.getByRole('link', { name: '课程广场', exact: true }).click()
  await page.getByRole('heading', { name: '探索课程', exact: true }).waitFor()
  check(await page.locator('.course-card').count() === 3, 'Live MySQL seed should return three courses')
  await page.screenshot({ path: 'output/playwright/course-catalog-live.png' })
  await page.getByRole('searchbox', { name: '课程名称' }).fill('Python与AI应用演示课程')
  await page.getByRole('button', { name: '搜索课程', exact: true }).click()
  await page.getByText('共 1 门', { exact: true }).waitFor()
  await page.locator('.course-card').first().click()
  await page.waitForURL(origin + '/courses/220331822288990210')
  await page.getByRole('heading', { name: 'Python 与 AI 应用演示课程', exact: true }).waitFor()
  check((await page.locator('.course-detail-price').innerText()) === '¥4,999', 'Live price must preserve yuan')
  console.log('PASS: real login, course list, MySQL whitespace search, string ID detail and price')
}
