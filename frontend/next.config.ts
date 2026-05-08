/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://38d4d8db389da2df-193-84-3-248.serveousercontent.com/api/:path*',
      },
    ];
  },
};

export default nextConfig;
