export default async function handler(req, res) {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send("Authorization code missing");
  }

  const clientId = process.env.BLOGGER_CLIENT_ID;
  const clientSecret = process.env.BLOGGER_CLIENT_SECRET;

  const redirectUri =
    "https://nijukti-path.vercel.app/api/auth/callback";

  if (!clientId || !clientSecret) {
    return res.status(500).send("Blogger OAuth variables are not configured");
  }

  try {
    const tokenResponse = await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code"
        })
      }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return res.status(400).send(
        "Google OAuth failed: " +
        (tokenData.error_description || tokenData.error || "Unknown error")
      );
    }

    const refreshToken = tokenData.refresh_token;

    if (!refreshToken) {
      return res.status(400).send(
        "Refresh token was not returned by Google."
      );
    }

    res.setHeader(
      "Set-Cookie",
      BLOGGER_REFRESH_TOKEN=${encodeURIComponent(refreshToken)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=31536000
    );

    res.redirect("/admin.html?blogger=connected");

  } catch (error) {
    return res.status(500).send(
      "OAuth callback error: " + error.message
    );
  }
}
