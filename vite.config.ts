import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    // 👇 GitHub Pages 배포를 위한 base 경로 설정
    // URL이 https://deimos117.github.io/my-project/ 라면 '/my-project/'로 입력하세요.
    // (앞뒤의 슬래시 '/'가 반드시 포함되어야 합니다)
    base: '/https://deimos117.github.io/Music-Creative-Rule-the-audience---Audience-Ver.261012/',
    
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});