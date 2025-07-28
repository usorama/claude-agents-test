/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    ppr: 'incremental',
  },
  webpack: (config, { isServer }) => {
    // Handle pdf.js worker
    if (!isServer) {
      config.resolve.alias.canvas = false;
    }
    
    // Copy pdf.js worker
    config.module.rules.push({
      test: /pdf\.worker\.(min\.)?mjs$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/worker/[hash][ext][query]',
      },
    });

    return config;
  },
};

export default nextConfig;