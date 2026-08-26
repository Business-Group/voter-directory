import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Replace 'voter-directory' with your exact GitHub repository name
export default defineConfig({
  plugins: [react()],
  base: '/', 
})
