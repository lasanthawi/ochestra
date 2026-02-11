import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@mastra/*"],
  reactCompiler: true,
  // Allow build to complete when Stack Auth env vars are missing (e.g. local `next build`)
  // Stack requires project ID to be a UUID; use a dummy UUID so build passes without .env
  env: {
    NEXT_PUBLIC_STACK_PROJECT_ID:
      process.env.NEXT_PUBLIC_STACK_PROJECT_ID ||
      "00000000-0000-0000-0000-000000000000",
    NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY:
      process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY ||
      "build-placeholder",
    STACK_SECRET_SERVER_KEY:
      process.env.STACK_SECRET_SERVER_KEY || "build-placeholder",
    // Allow build when DATABASE_URL not set (e.g. CI); use real value in .env for dev/prod
    DATABASE_URL:
      process.env.DATABASE_URL ||
      "postgresql://postgres:postgres@localhost:5432/postgres",
  },
};

// Temporarily run without the Workflow DevKit Next.js plugin
export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "andre-landgraf",

  project: "aileen",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors.
  automaticVercelMonitors: true,
});
