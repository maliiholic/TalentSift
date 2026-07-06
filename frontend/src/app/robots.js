export default function robots() {
  const baseUrl = 'https://talentsift-ghee.onrender.com';
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/Admin/',
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
