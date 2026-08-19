module.exports = async function handler(req, res) {

  try {

    const requestUrl =
      new URL(
        req.url,
        "https://nijukti-path.vercel.app"
      );

    const code =
      requestUrl.searchParams.get("code");

    const oauthError =
      requestUrl.searchParams.get("error");

    if (oauthError) {

      return res.status(400).send(
        "Google OAuth error: " + oauthError
      );

    }

    if (!code) {

      return res.status(400).send(
        "Authorization code missing."
      );

    }

    const clientId =
      process.env.BLOGGER_CLIENT_ID;

    const clientSecret =
      process.env.BLOGGER_CLIENT_SECRET;

    const redirectUri =
      "https://nijukti-path.vercel.app/api/auth/callback";


    if (!clientId || !clientSecret) {

      return res.status(500).send(
        "BLOGGER_CLIENT_ID or BLOGGER_CLIENT_SECRET is missing."
      );

    }


    const tokenResponse =
      await fetch(
        "https://oauth2.googleapis.com/token",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded"
          },

          body:
            new URLSearchParams({

              code: code,

              client_id: clientId,

              client_secret: clientSecret,

              redirect_uri: redirectUri,

              grant_type:
                "authorization_code"

            }).toString()
        }
      );


    const responseText =
      await tokenResponse.text();


    let tokenData;

    try {

      tokenData =
        JSON.parse(responseText);

    } catch {

      return res.status(500).send(
        "Google returned an invalid token response."
      );

    }


    if (!tokenResponse.ok) {

      return res.status(400).send(
        "Google OAuth failed: " +
        (
          tokenData.error_description ||
          tokenData.error ||
          "Unknown error"
        )
      );

    }


    const refreshToken =
      tokenData.refresh_token;


    if (!refreshToken) {

      return res.status(400).send(
        "Refresh token was not returned by Google. Please authorize again."
      );

    }


    const cookie =
      "BLOGGER_REFRESH_TOKEN=" +
      encodeURIComponent(refreshToken) +
      "; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=31536000";


    res.setHeader(
      "Set-Cookie",
      cookie
    );


    return res.redirect(
      302,
      "/admin.html?blogger=connected"
    );


  } catch (error) {

    console.error(
      "CALLBACK ERROR:",
      error
    );

    return res.status(500).send(
      "OAuth callback crashed: " +
      (
        error &&
        error.message
          ? error.message
          : "Unknown error"
      )
    );

  }

};
