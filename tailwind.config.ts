
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				// Custom colors for our app
				stuwy: {
					50: '#f0f7ff',
					100: '#e0efff',
					200: '#c7e1ff',
					300: '#a5cfff',
					400: '#7eb2ff',
					500: '#5b8fff',
					600: '#3a6ff5',
					700: '#2658e4',
					800: '#2147b9',
					900: '#213e93',
					950: '#172554',
				},
				exercise: {
					correct: '#34d399',
					incorrect: '#f87171',
					progress: '#6366f1',
				},
				// Design tokens brand colors
				brand: {
					primary: '#2F6BFF',
					navy: '#1E3A8A',
					tint: '#EEF4FF'
				},
				game: {
					xp: '#7C3AED',
					coin: '#FFB020',
					streak: '#FF7A45'
				},
				state: {
					success: '#22C55E',
					danger: '#EF4444'
				},
				neutral: {
					bg: '#F5F7FB',
					surface: '#FFFFFF',
					text: '#0F172A',
					muted: '#475569',
					border: '#E2E8F0'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				// Design token radii
				card: '28px',
				button: '24px',
				chip: '999px'
			},
			fontSize: {
				'display': ['44px', { lineHeight: '1.1' }],
				'h1': ['36px', { lineHeight: '1.2' }],
				'h2': ['30px', { lineHeight: '1.3' }],
				'body': ['16px', { lineHeight: '1.5' }],
				'caption': ['13px', { lineHeight: '1.4' }],
			},
			spacing: {
				'base': '24px'
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				fadeIn: {
					from: { opacity: '0' },
					to: { opacity: '1' }
				},
				slideIn: {
					from: { transform: 'translateY(20px)', opacity: '0' },
					to: { transform: 'translateY(0)', opacity: '1' }
				},
				pulse: {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.5' }
				},
				float: {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-5px)' }
				},
				shimmer: {
					'100%': { transform: 'translateX(100%)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fadeIn 0.5s ease-out',
				'slide-in': 'slideIn 0.5s ease-out',
				'pulse-slow': 'pulse 3s ease-in-out infinite',
				'float-slow': 'float 6s ease-in-out infinite',
				shimmer: 'shimmer 2s infinite'
			},
			backdropFilter: {
				'none': 'none',
				'blur': 'blur(8px)'
			},
			backgroundImage: {
				'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
				'gradient-subtle': 'linear-gradient(to right, var(--tw-gradient-stops))',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
