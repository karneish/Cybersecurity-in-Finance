import axios from 'axios'

export function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase()
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

function convertKeys(obj: unknown, converter: (key: string) => string): unknown {
  if (Array.isArray(obj)) return obj.map((item) => convertKeys(item, converter))
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([key, value]) => [
        converter(key),
        convertKeys(value, converter),
      ]),
    )
  }
  return obj
}

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (config.data && typeof config.data === 'object') {
    config.data = convertKeys(config.data, toCamelCase)
  }
  if (config.params && typeof config.params === 'object') {
    config.params = convertKeys(config.params, toCamelCase)
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object') {
      response.data = convertKeys(response.data, toSnakeCase)
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default apiClient
