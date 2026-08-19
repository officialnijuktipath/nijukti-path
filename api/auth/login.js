export default function handler(req, res) {
  const clientId = process.env.BLOGGER_CLIENT_ID;

  if (!clientId) {
    return res.status(500).send("BLOGGER_CLIENT_ID is not configured");
  }

  const redirectUri =
    "https://nijukti-path.vercel.app/api/auth/callback";

  const scope =
    "https://www.googleapis.com/auth/blogger";

  const authUrl =
    "https://accounts.google.com/o/oauth2/v2/auth" +
    "?client_id=" + encodeURIComponent(clientId) +
    "&redirect_uri=" + encodeURIComponent(redirectUri) +
    "&response_type=code" +
    "&scope=" + encodeURIComponent(scope) +
    "&access_type=offline" +
    "&prompt=consent";

  res.redirect(authUrl);
}
