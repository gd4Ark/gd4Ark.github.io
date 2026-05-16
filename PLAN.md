# Blog Theme Optimization Plan

Date: 2026-05-16
Project: `gd4Ark.github.io` (AstroPaper based)

## Objectives

- Reduce SEO duplication and indexing ambiguity.
- Improve security, accessibility, and interaction stability.
- Improve build reliability and long-term maintainability.

## Priority Roadmap

### P0 - SEO Canonical Consolidation (Highest)

- Problem:
  - Duplicate content is generated under both `/posts/*` and `/post/*`.
  - Canonical URLs currently follow the current route, which splits ranking signals.
- Scope:
  - `src/pages/posts/[slug]/index.astro`
  - `src/pages/post/[slug]/index.astro`
  - `src/layouts/PostDetails.astro`
  - `src/layouts/Layout.astro`
- Actions:
  - Define one canonical route family (`/posts/*` recommended).
  - Keep legacy permalink routes for compatibility, but always canonicalize to primary URLs.
  - Prefer adding redirects for legacy routes when deployment supports it.
- Acceptance criteria:
  - Every article variant points to one primary canonical URL.
  - Search engines only index one preferred URL per article over time.

### P1 - Event Listener Duplication Cleanup

- Problem:
  - `astro:after-swap` callbacks re-bind click/keydown listeners repeatedly.
  - This can trigger repeated toggles/actions after several client-side navigations.
- Scope:
  - `src/components/Header.astro`
  - `public/toggle-theme.js`
  - `src/pages/search.astro`
  - `src/layouts/PostDetails.astro` (DOM enhancement routines should be idempotent)
- Actions:
  - Refactor listeners to one-time binding or bind-after-cleanup pattern.
  - Ensure navigation-time re-init logic is idempotent.
- Acceptance criteria:
  - Repeated navigation does not increase handler count.
  - Menu/theme/search/back-to-top behaviors execute exactly once per user action.

### P2 - External Link Security Hardening

- Problem:
  - External links using `target="_blank"` currently output empty `rel`.
- Scope:
  - `astro.config.ts` (`rehype-external-links`)
  - `src/components/LinkButton.astro`
  - `src/components/Socials.astro`
- Actions:
  - Ensure `rel="noopener noreferrer"` for all `_blank` links.
  - Add optional `nofollow` where appropriate.
- Acceptance criteria:
  - No `_blank` external link is missing safe `rel` attributes.

### P3 - Layout Markup Hygiene

- Problem:
  - `<html class="false">` appears when `scrollSmooth` is false.
- Scope:
  - `src/layouts/Layout.astro`
- Actions:
  - Replace string interpolation with conditional class API (`class:list` or equivalent).
- Acceptance criteria:
  - No invalid boolean-string class output.

### P4 - OG Build Reliability

- Problem:
  - OG image generation fetches remote font files at build time.
  - Network/DNS failures can break build.
- Scope:
  - `src/utils/generateOgImages.tsx`
- Actions:
  - Vendor font files into repository and load from local files.
  - Remove hard runtime dependency on external font host.
- Acceptance criteria:
  - Build succeeds without internet access for font fetching.

### P5 - Performance Follow-ups

- Problem:
  - Disqus embed is eagerly loaded on article pages.
- Scope:
  - `src/layouts/PostDetails.astro`
  - `src/components/Disqus.astro`
- Actions:
  - Lazy-load comments on explicit user action or viewport intersection.
- Acceptance criteria:
  - Initial article render excludes heavy third-party comment boot by default.

### P6 - Content/UX and Codebase Cleanup

- Scope and actions:
  - Share URL encoding in `src/components/ShareLinks.astro` (`encodeURIComponent`).
  - Remove or reintegrate unused search implementation (`src/components/Search.tsx`, `fuse.js`).
  - Fix article markdown images missing `alt` attributes (content-level a11y).
- Acceptance criteria:
  - Share links are robust across URL characters.
  - No dead search code/dependency remains.
  - Accessibility checks report no missing image alt in generated pages.

### P7 - Performance Optimizations

- Problem:
  - Google Fonts loaded via blocking `<link>` in `src/layouts/Layout.astro`
  - Card component uses React unnecessarily for static rendering
  - Inline scripts in `PostDetails.astro` could be modularized
- Scope:
  - `src/layouts/Layout.astro` (font loading)
  - `src/components/Card.tsx` (convert to Astro)
  - `src/layouts/PostDetails.astro` (script organization)
- Actions:
  - Use `@fontsource` or preload critical font subsets
  - Convert Card.tsx to Astro component (keep Search.tsx as React)
  - Extract scroll progress, back-to-top, heading links, copy buttons into modules
- Acceptance criteria:
  - Fonts don't block initial render
  - Reduced JS bundle size
  - Cleaner script organization

### P8 - SEO Enhancements

- Problem:
  - Missing structured data (JSON-LD) for articles and website
  - No estimated reading time display
  - No related posts recommendation
- Scope:
  - `src/layouts/PostDetails.astro`
  - `src/pages/index.astro`
- Actions:
  - Add `Article` schema to post pages
  - Add `WebSite` and `SearchAction` schema to homepage
  - Implement reading time calculation
  - Add related posts section by tags
- Acceptance criteria:
  - Valid JSON-LD in generated HTML
  - Reading time displayed on article pages
  - Related posts shown at article bottom

### P9 - Code Quality & Maintainability

- Problem:
  - Hardcoded Disqus domain and Google Analytics ID
  - CSS `.prose` chain too long in `base.css`
  - Hardcoded post limit in `index.astro`
- Scope:
  - `src/components/Disqus.astro`
  - `src/components/Header.astro`
  - `src/styles/base.css`
  - `src/pages/index.astro`
  - `src/config.ts`
- Actions:
  - Move Disqus/GA IDs to config or environment variables
  - Split `.prose` styles into smaller utilities
  - Use `SITE.postPerPage` instead of hardcoded `6`
- Acceptance criteria:
  - No hardcoded service IDs in components
  - Cleaner CSS organization
  - Configurable post limits

## Suggested Execution Order

1. P0 canonical consolidation
2. P1 listener duplication cleanup
3. P2 external link hardening
4. P3 class output fix
5. P4 OG build reliability
6. P5/P6 cleanup and polish
7. P7 performance optimizations
8. P8 SEO enhancements
9. P9 code quality improvements

## Verification Checklist

- Run `pnpm run build` successfully.
- Inspect generated HTML for:
  - canonical consistency,
  - secure external link rel attributes,
  - no `class="false"`.
- Confirm no duplicated interaction handlers after repeated in-app navigations.
- Re-run a11y and link checks on built output.
