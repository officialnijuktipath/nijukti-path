const crypto = require("crypto");

function getCookie(req, name) {
  const cookieHeader = req.headers.cookie || "";

  for (const cookie of cookieHeader.split(";")) {
    const parts = cookie.trim().split("=");

    if (parts[0] === name) {
      return decodeURIComponent(parts.slice(1).join("="));
    }
  }

  return null;
}

function verifySession(token) {
  if (!token || !process.env.SESSION_SECRET) {
    return null;
  }

  const parts = token.split(".");

  if (parts.length !== 2) {
    return null;
  }

  const [payload, signature] = parts;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.SESSION_SECRET)
    .update(payload)
    .digest("base64url");

  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );

    if (!data.email || !data.exp) {
      return null;
    }

    if (Date.now() > data.exp) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const session = getCookie(
    req,
    "ADMIN_SESSION"
  );

  const admin = verifySession(session);

  if (!admin) {
    return res.status(401).json({
      authenticated: false
    });
  }

  return res.status(200).json({
    authenticated: true,
    email: admin.email
  });
};
