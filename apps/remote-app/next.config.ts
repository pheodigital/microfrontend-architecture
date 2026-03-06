import type { NextConfig } from "next";

/**
 * host-app — Next.js configuration
 *
 * PR-01: Plain config, no federation yet.
 * PR-06: We will add the NextFederationPlugin here to declare
 *        remoteApp as a runtime dependency.
 */
const nextConfig: NextConfig = {
  // We will set output: 'standalone' in PR-10 for Docker.
  // Standalone mode bundles only what's needed to run the server —
  // perfect for minimal Docker images.
};

export default nextConfig;
