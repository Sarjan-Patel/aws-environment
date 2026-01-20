# Deployment Fixes & Optimization Guide

## Issues Fixed

### ✅ Critical Security Fix
- **Next.js upgraded** from `14.2.22` (vulnerable) to `^14.2.34` (secure)
- This fixes security vulnerabilities including SSRF and untrusted deserialization issues

### ✅ Build Optimization
- Added explicit `NODE_ENV=production` to build script
- Optimized Next.js config with `swcMinify: true` and `compress: true`
- Added type-check script for better build-time validation

### ⚠️ Deprecated Dependencies (Warnings Only)
- **ESLint 8.57.1**: Kept on v8 for compatibility with Next.js 14.2.x
  - ESLint 9 is available but requires significant config changes
  - Can upgrade to ESLint 9 when migrating to Next.js 15+
- **Transitive dependencies** (rimraf, glob, inflight): These are dependencies of dependencies
  - Will be resolved when parent packages are updated
  - Not blocking deployment - they're warnings only

### ✅ NODE_ENV Warning
- Fixed by explicitly setting `NODE_ENV=production` in build script
- Ensure deployment platforms don't override this with non-standard values

## Steps to Deploy Successfully

### 1. Clean Installation (Recommended First Time)

```bash
cd agentic-ai-platform
rm -rf node_modules package-lock.json .next
npm install
```

Or use the root script:
```bash
npm run clean
```

### 2. Verify Local Build

```bash
cd agentic-ai-platform
npm run build
```

This should complete without errors. Warnings about deprecated packages are acceptable.

### 3. Deploy

Ensure your deployment platform:
- Uses Node.js 18+ or 20+
- Sets `NODE_ENV=production` automatically (most platforms do)
- Has sufficient memory for the build process (recommend 4GB+)

### 4. Deployment Platform Specific Notes

#### Vercel
- Automatically detects Next.js projects
- Uses `NODE_ENV=production` by default
- Build command: `npm run build` (already set)

#### Netlify
- Ensure `NODE_ENV=production` in environment variables
- Build command: `cd agentic-ai-platform && npm run build`

#### Docker/Other Platforms
- Ensure `NODE_ENV=production` is set in your Dockerfile or build environment
- Run `npm install` then `npm run build`

## Monitoring Deprecation Warnings

The following warnings are expected and non-blocking:
- `rimraf@3.0.2`: Dependency of other packages (will be resolved when they update)
- `inflight@1.0.6`: Dependency of other packages (will be resolved when they update)
- `glob@7.2.3`: Dependency of other packages (will be resolved when they update)
- `eslint@8.57.1`: Kept intentionally for Next.js 14 compatibility

These will be resolved in future updates when:
1. Next.js updates its dependencies
2. You migrate to Next.js 15+ with ESLint 9

## Future Upgrades

When ready to upgrade to Next.js 15+:
1. Update Next.js: `npm install next@latest`
2. Upgrade ESLint to v9: `npm install eslint@^9 --save-dev`
3. Update ESLint config to flat config format
4. Update eslint-config-next to match

## Troubleshooting

### Build fails with "NODE_ENV" warning
- Ensure build script explicitly sets `NODE_ENV=production`
- Check deployment platform environment variables

### Build fails with dependency errors
- Run `npm run clean` from root
- Then `npm install` in agentic-ai-platform

### Build succeeds but deployment fails
- Check deployment platform logs for specific errors
- Verify Node.js version matches locally (18+ or 20+)
- Ensure sufficient memory allocation

## Verification Checklist

Before deploying, verify:
- [ ] `npm run build` completes successfully locally
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] Next.js version is `^14.2.34` or higher
- [ ] Build output includes `.next` directory

