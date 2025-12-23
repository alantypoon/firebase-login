// vite.config.js
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    return {
        plugins: [react()],
        define: {
            'process.env.LISTEN_PORT': JSON.stringify(env.LISTEN_PORT),
        },
        server: {
            port: parseInt(env.VITE_PORT),
            open: false,
            allowedHosts: ['dev.mysuperta.com'],
            proxy: {
                '/api': {
                    target: `http://localhost:${env.LISTEN_PORT || 6001}`,
                    changeOrigin: true,
                },
            },
        },
    };
});
