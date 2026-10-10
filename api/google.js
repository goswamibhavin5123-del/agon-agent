const ALLOWED_ORIGINS = new Set([
  'https://rahutalk.com',
  'https://www.rahutalk.com',
]);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET') {
    return res.status(405).send('Method not allowed');
  }

  const { code, state, error } = req.query || {};

  if (error || !code || !state) {
    return res.status(400).send(
      'Google sign-in cancelled or failed. You can close this window.'
    );
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(String(state), 'base64').toString('utf8')
    );

    const origin = decoded.origin;

    if (!ALLOWED_ORIGINS.has(origin)) {
      return res.status(400).send('Invalid sign-in origin.');
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).send('Google OAuth settings are missing.');
    }

    const redirectUri = 'https://rahutalk.com/api/google';

    const tokenResponse = await fetch(
      'https://oauth2.googleapis.com/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code: String(code),
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      }
    );

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok || !tokens.id_token) {
      console.error('Google token exchange failed:', tokenResponse.status);
      return res.status(401).send('Google sign-in failed. Please try again.');
    }

    const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Rahu Talk Login</title></head>
<body>
<p>Completing Google sign-in...</p>
<script>
(() => {
  const origin = ${JSON.stringify(origin)};
  const idToken = ${JSON.stringify(tokens.id_token)};

  if (window.opener) {
    window.opener.postMessage(
      { type: 'google-auth-success', id_token: idToken },
      origin
    );
    window.close();
  } else {
    document.body.textContent =
      'Return to Rahu Talk and try again.';
  }
})();
</script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (err) {
    console.error('Google OAuth callback failed:', err.message);
    return res.status(500).send('Unable to complete Google sign-in.');
  }
}