const crypto = require("crypto");

function sendJSON(res, status, data) {
  return res.status(status).json(data);
}

function createSession(email) {
  const payload = Buffer.from(
    JSON.stringify({
      email,
      exp: Date.now() + 24 * 60 * 60 * 1000
    })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", process.env.SESSION_SECRET)
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return sendJSON(res, 405, {
        error: "Method not allowed"
      });
    }

    if (
      !process.env.ADMIN_EMAIL ||
      !process.env.ADMIN_PASSWORD ||
      !process.env.SESSION_SECRET
    ) {
      return sendJSON(res, 500, {
        error: "Admin authentication environment variables are missing."
      });
    }

    const { email, password } = req.body || {};

    if (!email || !password) {
      return sendJSON(res, 400, {
        error: "Email and password are required."
      });
    }

    if (
      email.trim().toLowerCase() !==
        process.env.ADMIN_EMAIL.trim().toLowerCase() ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return sendJSON(res, 401, {
        error: "Invalid email or password."
      });
    }

    const session = createSession(email.trim());

    res.setHeader(
      "Set-Cookie",
      `ADMIN_SESSION=${session}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400`
    );

    return sendJSON(res, 200, {
      success: true,
      message: "Admin login successful."
    });

  } catch (error) {
    console.error("Admin Login Error:", error);

    return sendJSON(res, 500, {
      error: "Internal server error."
    });
  }
};
