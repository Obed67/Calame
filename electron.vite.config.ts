import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    plugins: [
      {
        name: 'strip-crossorigin',
        transformIndexHtml: {
          order: 'post',
          handler(html: string) {
            return html.replace(/\s+crossorigin(?:="[^"]*")?/g, '')
          }
        }
      }
    ],
    build: {
      rollupOptions: {
        input: {
          overlay: resolve(__dirname, 'src/renderer/overlay/index.html'),
          toolbar: resolve(__dirname, 'src/renderer/toolbar/index.html'),
          settings: resolve(__dirname, 'src/renderer/settings/index.html')
        }
      }
    }
  }
})
