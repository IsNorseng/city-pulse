import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {alias: {'@': fileURLToPath(new URL('.', import.meta.url))}},
  server: {host: '127.0.0.1', watch: {ignored: ['**/local-output/**', '**/etl/__pycache__/**']}},
  preview: {host: '127.0.0.1'},
});
