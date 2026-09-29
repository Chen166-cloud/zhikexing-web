import { apiUrl, authorizedFetch } from '../agent/api'

export interface Course {
  id: string
  name: string
  type: string | null
  edu: number | null
  price: number | null
  duration: number | null
}

export interface CoursePage {
  items: Course[]
  total: number
  page: number
  pageSize: number
}

export const educationLabels = ['不限学历', '初中', '高中', '大专', '本科及以上']
export const educationLabel = (edu: number | null) =>
  edu === null ? '待补充' : educationLabels[edu] || '待补充'
export const coursePrice = (price: number | null) =>
  price === null ? '价格待补充' : `¥${price.toLocaleString('zh-CN')}`

export const courseApi = {
  async list(query: Record<string, string | number>): Promise<CoursePage> {
    const response = await authorizedFetch(apiUrl('/courses', query))
    return response.json()
  },
  async detail(id: string): Promise<Course> {
    const response = await authorizedFetch(apiUrl(`/courses/${encodeURIComponent(id)}`))
    return response.json()
  },
}
