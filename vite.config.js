import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for React + Tailwind app
// Set base to repo name for correct asset paths on GitHub Pages
export default defineConfig({
	base: '/GitHub-Lang-Detector/',
	plugins: [react()],
});
