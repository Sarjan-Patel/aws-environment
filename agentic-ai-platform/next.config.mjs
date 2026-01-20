/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable static optimization for dynamic data fetching
  experimental: {
    // Enable server actions
  },
  // Optimize for production builds
  swcMinify: true,
  // Compress output
  compress: true,
  // Reduce build warnings
  eslint: {
    // Only run ESLint on production builds if needed
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Only run TypeScript checks on production builds
    ignoreBuildErrors: false,
  },
}

export default nextConfig
