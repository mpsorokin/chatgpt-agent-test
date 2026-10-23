// Values injected into each production build by next.config.ts from package.json and GITHUB_SHA.
// Exposing the commit hash and package version is safe; neither is a credential.
export const APP_VERSION = process.env.NEXT_PUBLIC_SHIPIT_VERSION || 'development';
export const APP_BUILD_SHA = process.env.NEXT_PUBLIC_SHIPIT_SHA || 'local';
export const RELEASE_LABEL = `v${APP_VERSION} · ${APP_BUILD_SHA}`;
