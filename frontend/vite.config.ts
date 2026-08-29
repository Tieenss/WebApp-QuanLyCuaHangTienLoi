import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Gom các thư viện lớn thành chunk vendor riêng.
 *
 * Rolldown (bundler của Vite 8) chỉ nhận `manualChunks` ở dạng hàm, không nhận
 * object map như Rollup, nên phải phân loại theo đường dẫn module.
 */
const manualChunks = (moduleId: string): string | undefined => {
  if (!moduleId.includes('node_modules')) return undefined

  if (/node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/.test(moduleId)) {
    return 'vendor-react'
  }
  if (/node_modules[\\/](antd|@ant-design|rc-[^\\/]+)[\\/]/.test(moduleId)) {
    return 'vendor-antd'
  }
  if (/node_modules[\\/](recharts|d3-[^\\/]+|victory-[^\\/]+)[\\/]/.test(moduleId)) {
    return 'vendor-charts'
  }
  return 'vendor'
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // `import.meta.dirname` (Node >= 20.11) thay cho `__dirname` để tương
      // thích với configLoader 'native' của Vite.
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: { manualChunks },
    },
  },
})
