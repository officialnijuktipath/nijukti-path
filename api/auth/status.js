export default function handler(req, res) {
  const cookies = req.headers.cookie || "";

  const connected = cookies
    .split(";")
    .some(cookie =>
      cookie.trim().startsWith("BLOGGER_REFRESH_TOKEN=")
    );

  res.status(200).json({
    connected
  });
}
