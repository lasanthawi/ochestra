import { createRequire } from "node:module";
import { withSentryConfig } from "@sentry/nextjs";

const require = createRequire(import.meta.url);
const { withWorkflow } = require("workflow/next");

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

export default withSentryConfig(withWorkflow(nextConfig, {}), {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "andre-landgraf",

  project: "orchestral-brain",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Webpack-only options (Turbopack may still show deprecation until Sentry supports it)
  webpack: {
    // Tree-shake Sentry logger statements to reduce bundle size
    treeshake: { removeDebugLogging: true },
    // Automatic instrumentation of Vercel Cron Monitors
    automaticVercelMonitors: true,
  },
});
