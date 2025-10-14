import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Get repository name from environment or use empty string for user/org pages
const dev = process.argv.includes('dev');
const base = dev ? '' : process.env.GITHUB_PAGES_BASE || '';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: '404.html', // Enable SPA fallback for client-side routing
			precompress: false,
			strict: true
		}),
		paths: {
			base: base
		}
	}
};

export default config;
