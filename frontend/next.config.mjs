/** @type {import('next').NextConfig} */
const nextConfig = {
    turbopack: {
      root: '.',
    },
    images: {
      unoptimized: process.env.NODE_ENV === 'development',
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'media.istockphoto.com',
        },
        {
          protocol: 'https',
          hostname: 'lh3.googleusercontent.com',
        },
        {
          protocol: 'https',
          hostname: 'randomuser.me',
        },
        {
          protocol: 'http',
          hostname: '127.0.0.1',
        },
        {
          protocol: 'http',
          hostname: 'localhost',
        },
      ],
  },
};

export default nextConfig;
