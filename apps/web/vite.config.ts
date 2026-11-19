import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({root:fileURLToPath(new URL('.',import.meta.url)),build:{outDir:'build',emptyOutDir:true},server:{host:'127.0.0.1',port:4318,proxy:{'/api':'http://127.0.0.1:4317'}}});
