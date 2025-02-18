const authSettings = {
  redirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
  scopes: 'email profile',
  domains: ['eeisd.org'],
  cookieOptions: {
    sameSite: 'lax',
    secure: true,
    path: '/',
    domain: process.env.NODE_ENV === 'production' ? '.mr-romero.com' : undefined
  }
};

export default authSettings;
