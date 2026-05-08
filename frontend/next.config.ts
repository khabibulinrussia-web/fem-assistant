/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow API rewrites to backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
};

export default nextConfig;
