import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/adonis-waste-tracker-v2/',
  plugins: [react()],
})
