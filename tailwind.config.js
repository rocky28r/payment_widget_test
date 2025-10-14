/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				primary: {
					DEFAULT: '#3B5998',
					50: '#E8EBF3',
					100: '#D1D7E7',
					200: '#A3AFCF',
					300: '#7587B7',
					400: '#47609F',
					500: '#3B5998',
					600: '#2F477A',
					700: '#23355B',
					800: '#17243D',
					900: '#0C121E'
				},
				success: {
					DEFAULT: '#28a745',
					50: '#E8F5EB',
					500: '#28a745',
					600: '#208537'
				},
				warning: {
					DEFAULT: '#FDBF2D',
					50: '#FFFBEA',
					500: '#FDBF2D',
					border: '#FDBF2D'
				}
			},
			boxShadow: {
				soft: '0 4px 12px rgba(0, 0, 0, 0.08)',
				'soft-lg': '0 6px 16px rgba(0, 0, 0, 0.10)'
			}
		}
	},
	plugins: [require('daisyui')],
	daisyui: {
		themes: [
			{
				light: {
					...require('daisyui/src/theming/themes')['light'],
					primary: '#3B5998',
					'primary-focus': '#2F477A',
					'primary-content': '#ffffff',
					secondary: '#6c757d',
					'secondary-focus': '#5a6268',
					'secondary-content': '#ffffff',
					accent: '#3B5998',
					'base-content': '#212529',
					success: '#28a745',
					warning: '#FDBF2D',
					'--rounded-btn': '0.5rem',
					'--btn-text-case': 'none'
				}
			}
		],
		base: true,
		styled: true,
		utils: true,
		logs: false
	}
};
