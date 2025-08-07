# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 landing page for "TubeBend" - a custom tube bending manufacturing platform. The project is built as a static marketing site showcasing the company's services, featuring transparent pricing, 3D CAD file visualization, and streamlined ordering workflow.

## Common Commands

- **Development**: `npm run dev` - Start the Next.js development server
- **Build**: `npm run build` - Create production build
- **Start**: `npm start` - Start production server  
- **Lint**: `npm run lint` - Run Next.js ESLint

## Architecture & Tech Stack

### Frontend Framework
- **Next.js 15** with App Router (app directory structure)
- **React 19** with TypeScript
- **Tailwind CSS** for styling with custom design tokens
- **shadcn/ui** component library with Radix UI primitives

### UI Component System
- Components located in `components/ui/` directory
- Uses **Class Variance Authority** for component variants
- **Lucide React** for icons
- **Geist Sans & Mono** fonts from Vercel
- Configured via `components.json` with aliases:
  - `@/components` → `components/`
  - `@/lib` → `lib/`
  - `@/hooks` → `hooks/`

### Styling Architecture
- **Tailwind CSS** with custom configuration in `tailwind.config.ts`
- CSS variables for theming (supports dark mode via class strategy)
- Custom color palette with HSL values
- Animation utilities with custom keyframes
- Global styles in `app/globals.css`

### Project Structure
```
app/                    # Next.js App Router
├── layout.tsx         # Root layout with font configuration
├── page.tsx           # Homepage component
└── globals.css        # Global styles and CSS variables

components/
├── ui/                # shadcn/ui components (30+ components)
├── theme-provider.tsx # Theme context provider
└── ...

lib/
└── utils.ts           # Utility functions (clsx, tailwind-merge)

hooks/                 # Custom React hooks
public/                # Static assets and placeholder images
```

### Key Dependencies
- **Form handling**: `react-hook-form` with `@hookform/resolvers` and `zod`
- **UI primitives**: Extensive Radix UI collection (@radix-ui/react-*)
- **Utilities**: `clsx`, `tailwind-merge`, `class-variance-authority`
- **Date handling**: `date-fns`, `react-day-picker`
- **Additional**: `cmdk`, `sonner` (notifications), `vaul` (drawer), `next-themes`

## Business Context

The project implements a landing page for a tube bending manufacturing platform positioned as:
- Specialized alternative to general platforms like Xometry
- Focused on transparent pricing (vs "black box" competitors)
- CAD file upload with instant quoting
- 3D visualization capabilities
- No minimum order requirements

Key features showcased:
- File upload interface supporting STEP, IGES, DXF formats
- Pricing breakdown visualization
- 3D part preview mockups
- Customer testimonials and trust signals
- Material specifications (Steel, Aluminum, Stainless, Copper)

## Development Notes

- Project uses pnpm as package manager (evident from `pnpm-lock.yaml`)
- TypeScript configuration enables strict mode
- Tailwind configured for component-based development
- No test framework currently configured
- Static site suitable for deployment to Vercel, Netlify, or similar platforms

## Content Management

The homepage (`app/page.tsx`) is currently a single-file component with hardcoded content. For content updates, modify the React component directly. Key sections include:
- Hero with file upload CTA
- 3D visualization and pricing previews  
- Process explanation (3 steps)
- Feature differentiators
- Materials showcase
- Customer testimonials
- Contact/footer information