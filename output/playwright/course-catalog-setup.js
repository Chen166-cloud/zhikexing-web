async (page) => {
  await page.unrouteAll({ behavior: 'wait' })
  const courses = Array.from({ length: 25 }, (_, index) => ({
    id: (220331822288990209n + BigInt(index)).toString(),
    name: index === 0 ? 'Java 后端开发演示课程' : `课程演示 ${index + 1}`,
    type: '编程', edu: 2, price: 3999 + index, duration: 90,
  }))
  let retryFailed = false
  await page.route('**/user/me', (route) => route.fulfill({
    json: { ok: 1, data: { id: '77', userName: 'demo', nickName: '课程测试' } },
  }))
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname
    if (path === '/api/v1/courses') {
      const pageNo = Number(url.searchParams.get('page') || 1)
      const pageSize = Number(url.searchParams.get('pageSize') || 12)
      const keyword = url.searchParams.get('keyword') || ''
      if (keyword === 'retry' && !retryFailed) {
        retryFailed = true
        return route.fulfill({ status: 503, json: { code: 'HTTP_503', message: '课程数据正在加载，请稍后重试' } })
      }
      const values = keyword === 'empty' ? [] : keyword === 'retry' ? courses.slice(0, 3) : courses
      return route.fulfill({ json: { items: values.slice((pageNo - 1) * pageSize, pageNo * pageSize),
        total: values.length, page: pageNo, pageSize } })
    }
    if (path.startsWith('/api/v1/courses/')) {
      const item = courses.find((course) => course.id === path.split('/').pop())
      return item ? route.fulfill({ json: item }) : route.fulfill({ status: 404, json: { code: 'HTTP_404', message: '课程不存在' } })
    }
    if (path === '/api/v1/workspaces')
      return route.fulfill({ json: [{ id: 'catalog-workspace', name: '课程测试空间', role: 'OWNER' }] })
    if (route.request().method() !== 'GET')
      throw new Error('课程咨询预填不应提交业务请求: ' + path)
    return route.fulfill({ json: [] })
  })
  await page.evaluate(() => localStorage.setItem('zhikexing_token', '0123456789abcdef0123456789abcdef'))
  await page.goto('http://127.0.0.1:5179/courses')
  await page.getByRole('heading', { name: '探索课程', exact: true }).waitFor()
}
