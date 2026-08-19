const https = require("https");

function sendJSON(res, status, data) {
  res.status(status).json(data);
}

function getCookie(req, name) {
  const cookieHeader = req.headers.cookie || "";

  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const parts = cookie.trim().split("=");

    if (parts[0] === name) {
      return decodeURIComponent(parts.slice(1).join("="));
    }
  }

  return null;
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function getAccessToken(refreshToken) {
  const response = await fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id:
          process.env.BLOGGER_CLIENT_ID,

        client_secret:
          process.env.BLOGGER_CLIENT_SECRET,

        refresh_token:
          refreshToken,

        grant_type:
          "refresh_token"
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error_description ||
      data.error ||
      "Google token refresh failed"
    );
  }

  return data.access_token;
}

async function getMyBlogs(accessToken) {
  const response = await fetch(
    "https://www.googleapis.com/blogger/v3/users/self/blogs",
    {
      headers: {
        Authorization:
          Bearer ${accessToken}
      }
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error?.message ||
      "Unable to get Blogger blogs"
    );
  }

  return data.items || [];
}

async function createBloggerPost(
  accessToken,
  blogId,
  title,
  category,
  description,
  officialLink
) {

  const content = `
    <div>
      <p>${escapeHtml(description)}</p>

      <p>
        <strong>Category:</strong>
        ${escapeHtml(category)}
      </p>

      <p>
        <a
          href="${escapeHtml(officialLink)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          👉 View Official Notification
        </a>
      </p>

      <hr>

      <p>
        <strong>NIJUKTI PATH</strong><br>
        Sarkari Naukri • Sarkari Bharosa
      </p>
    </div>
  `;

  const response = await fetch(
    https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts,
    {
      method: "POST",

      headers: {
        Authorization:
          Bearer ${accessToken},

        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({
        kind: "blogger#post",

        title: title,

        content: content,

        labels: [
          category
        ]
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error?.message ||
      "Blogger post creation failed"
    );
  }

  return data;
}

async function getBloggerPosts(accessToken, blogId) {

  const response = await fetch(
    https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?maxResults=20,
    {
      headers: {
        Authorization:
          Bearer ${accessToken}
      }
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error?.message ||
      "Unable to load Blogger posts"
    );
  }

  return data.items || [];
}

module.exports = async function handler(req, res) {

  try {

    if (req.method !== "POST" &&
        req.method !== "GET") {

      return sendJSON(
        res,
        405,
        {
          error:
            "Method not allowed"
        }
      );
    }

    const refreshToken =
      getCookie(
        req,
        "BLOGGER_REFRESH_TOKEN"
      );

    if (!refreshToken) {

      return sendJSON(
        res,
        401,
        {
          error:
            "Blogger is not connected. Please connect Blogger first."
        }
      );
    }

    if (!process.env.BLOGGER_CLIENT_ID ||
        !process.env.BLOGGER_CLIENT_SECRET) {

      return sendJSON(
        res,
        500,
        {
          error:
            "BLOGGER_CLIENT_ID or BLOGGER_CLIENT_SECRET is missing in Vercel Environment Variables."
        }
      );
    }

    const accessToken =
      await getAccessToken(
        refreshToken
      );

    const blogs =
      await getMyBlogs(
        accessToken
      );

    if (!blogs.length) {

      return sendJSON(
        res,
        404,
        {
          error:
            "No Blogger blog found for this Google account."
        }
      );
    }

    /*
      First blog of the connected
      Google account is used.
    */

    const blogId =
      blogs[0].id;

    /*
      GET /api/posts
      ----------------
      Load recent Blogger posts
    */

    if (req.method === "GET") {

      const posts =
        await getBloggerPosts(
          accessToken,
          blogId
        );

      return sendJSON(
        res,
        200,
        posts.map(post => ({
          id: post.id,

          title:
            post.title || "",

          category:
            post.labels?.[0] || "",

          url:
            post.url || "",

          published:
            post.published || ""
        }))
      );
    }

    /*
      POST /api/posts
      ----------------
      Create Blogger post
    */

    const {
      title,
      category,
      description,
      officialLink
    } = req.body || {};

    if (!title) {

      return sendJSON(
        res,
        400,
        {
          error:
            "Post title is required."
        }
      );
    }

    if (!description) {

      return sendJSON(
        res,
        400,
        {
          error:
            "Description is required."
        }
      );
    }

    if (!officialLink) {

      return sendJSON(
        res,
        400,
        {
          error:
            "Official link is required."
        }
      );
    }

    const post =
      await createBloggerPost(
        accessToken,
        blogId,
        title,
        category || "Government Jobs",
        description,
        officialLink
      );

    return sendJSON(
      res,
      200,
      {
        success: true,

        message:
          "Post published successfully on Blogger.",

        post: {
          id:
            post.id,

          title:
            post.title,

          url:
            post.url,

          published:
            post.published
        }
      }
    );

  } catch (error) {

    console.error(
      "Blogger Posts API Error:",
      error
    );

    return sendJSON(
      res,
      500,
      {
        error:
          error.message ||
          "Internal server error"
      }
    );
  }
};
