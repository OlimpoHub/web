## [0.1.0] - 2/12/2025

### Added
- Password reset UI pages: `pages/request-reset.tsx`, `pages/reset-password.tsx`. 
- React hook for reset flow: `reset-web/hooks/useResetPassword.ts`. 
- Server-side proxy for local testing: `reset-web/pages/api/proxy/user/[...slug].ts`.
- Local mock API routes for testing: `reset-web/pages/api/user/update-password.ts`, `reset-web/pages/api/user/verify-token.ts`. 
- Styles and assets: `reset-web/styles/reset.module.css`, `reset-web/public/logo.png`. 
- Project configuration and TypeScript support: `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.js`, `next-env.d.ts`, `reset-web/types/password.ts`. 

### Changed
- Update styles to match mobile (visual/style adjustments).


