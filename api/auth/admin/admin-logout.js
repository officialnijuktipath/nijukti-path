module.exports = async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  // Admin session cookie clear
  res.setHeader("Set-Cookie", [
    "ADMIN_SESSION=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
    "ADMIN_TOKEN=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
    "admin_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
  ]);

  return res.status(200).json({
    success: true,
    message: "Logged out successfully."
  });
};
