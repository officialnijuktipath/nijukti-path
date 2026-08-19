export default async function handler(req, res) {

  try {

    const code = req.query?.code;

    if (!code) {
      return res.status(400).send("Authorization code missing");
    }

    const clientId =
      process.env.BLOGGER_CLIENT_ID;

    const clientSecret =
      process.env.BLOGGER_CLIENT_SECRET;

    const redirectUri =
      "https://nijukti-path.vercel.app/api/auth/callback";


    if (!clientId || !clientSecret) {

      return res.status(500).send(
        "Blogger OAuth environment variables are missing."
      );

    }


    const tokenResponse = await fetch(
      "https://oauth2.googleapis.com/token",
      {

        method: "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded"
        },

        body: new URLSearchParams({

          code: code,

          client_id: clientId,

          client_secret: clientSecret,

          redirect_uri: redirectUri,

          grant_type: "authorization_code"

        })

      }
    );


    const tokenText =
      await tokenResponse.text();


    let tokenData = {};

    try {

      tokenData =
        tokenText
          ? JSON.parse(tokenText)
          : {};

    } catch {

      return res.status(500).send(
        "Google returned an invalid response."
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
        "Google did not return a refresh token. Please authorize the app again."
      );

    }


    /* Store refresh token securely */

    const cookieValue =
      encodeURIComponent(refreshToken);


    res.setHeader(
      "Set-Cookie",

      BLOGGER_REFRESH_TOKEN=${cookieValue}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=31536000
    );


    return res.redirect(
      "/admin.html?blogger=connected"
    );


  } catch (error) {

    console.error(
      "OAuth CALLBACK ERROR:",
      error
    );

    return res.status(500).send(
      "OAuth callback error: " +
      (error?.message || "Unknown error")
    );

  }

}
