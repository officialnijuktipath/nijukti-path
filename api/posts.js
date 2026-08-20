function sendJSON(res, status, data) {
  return res.status(status).json(data);
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
          `Bearer ${accessToken}`
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
    `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts`,
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${accessToken}`,

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

async function getBloggerPosts(
  accessToken,
  blogId
) {

  const response = await fetch(
    `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?maxResults=20`,
    {
      headers: {
        Authorization:
          `Bearer ${accessToken}`
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


function buildContent({description, category, officialLink, secondLink, secondLinkLabel, instructions, fields}) {
  const entries = fields && typeof fields === "object"
    ? Object.entries(fields).filter(([,v]) => v !== undefined && v !== null && String(v).trim())
    : [];
  const fieldHtml = entries.map(([k,v]) =>
    `<p><strong>${escapeHtml(k.replace(/([A-Z])/g," $1"))}:</strong> ${escapeHtml(v)}</p>`
  ).join("");
  const officialHtml = officialLink
    ? `<p><a href="${escapeHtml(officialLink)}" target="_blank" rel="noopener noreferrer">📄 Official / Notification Link</a></p>` : "";
  const secondHtml = secondLink
    ? `<p><a href="${escapeHtml(secondLink)}" target="_blank" rel="noopener noreferrer">${escapeHtml(secondLinkLabel || "🔗 Main Action Link")}</a></p>` : "";
  const instructionsHtml = instructions
    ? `<hr><p><strong>Important Instructions</strong></p><p>${escapeHtml(instructions)}</p>` : "";
  const meta = Buffer.from(JSON.stringify({
    description: description || "",
    category: category || "",
    officialLink: officialLink || "",
    secondLink: secondLink || "",
    secondLinkLabel: secondLinkLabel || "",
    instructions: instructions || "",
    fields: fields || {}
  }), "utf8").toString("base64");
  return `<!-- NIJUKTI_PATH_META:${meta} --><div><p>${escapeHtml(description)}</p><p><strong>Category:</strong> ${escapeHtml(category)}</p>${fieldHtml}${officialHtml}${secondHtml}${instructionsHtml}<hr><p><strong>NIJUKTI PATH</strong><br>Sarkari Naukri • Sarkari Bharosa</p></div>`;
}

async function bloggerRequest(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || "Blogger API request failed");
  return data;
}

function normalizePost(post, status) {
  let meta = {};
  const match = String(post.content || "").match(/NIJUKTI_PATH_META:([^\s-]+)\s*-->/);
  if (match) {
    try { meta = JSON.parse(Buffer.from(match[1], "base64").toString("utf8")); } catch (_) {}
  }
  return {
    id: post.id,
    title: post.title || "",
    category: meta.category || post.labels?.[0] || "",
    url: post.url || "",
    published: post.published || "",
    updated: post.updated || "",
    status,
    description: meta.description || "",
    officialLink: meta.officialLink || "",
    secondLink: meta.secondLink || "",
    secondLinkLabel: meta.secondLinkLabel || "",
    instructions: meta.instructions || "",
    fields: meta.fields || {},
    content: post.content || ""
  };
}

async function listPosts(accessToken, blogId, status) {
  const data = await bloggerRequest(
    `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?maxResults=50&status=${encodeURIComponent(status)}&fetchBodies=true`,
    {headers:{Authorization:`Bearer ${accessToken}`}}
  );
  return data.items || [];
}

async function getPost(accessToken, blogId, id) {
  return bloggerRequest(
    `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/${id}?fetchBody=true`,
    {headers:{Authorization:`Bearer ${accessToken}`}}
  );
}

async function createPost(accessToken, blogId, data, isDraft) {
  return bloggerRequest(
    `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?isDraft=${isDraft ? "true" : "false"}`,
    {
      method:"POST",
      headers:{Authorization:`Bearer ${accessToken}`,"Content-Type":"application/json"},
      body:JSON.stringify({
        kind:"blogger#post",
        title:data.title,
        content:buildContent(data),
        labels:[data.category || "Government Jobs"]
      })
    }
  );
}

async function updatePost(accessToken, blogId, id, data, publish) {
  return bloggerRequest(
    `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/${id}`,
    {
      method:"PUT",
      headers:{Authorization:`Bearer ${accessToken}`,"Content-Type":"application/json"},
      body:JSON.stringify({
        kind:"blogger#post",
        id:String(id),
        title:data.title,
        content:buildContent(data),
        labels:[data.category || "Government Jobs"]
      })
    }
  );
}

async function publishPost(accessToken, blogId, id) {
  return bloggerRequest(
    `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/${id}/publish`,
    {method:"POST",headers:{Authorization:`Bearer ${accessToken}`}}
  );
}

async function deletePost(accessToken, blogId, id) {
  const response = await fetch(
    `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/${id}`,
    {method:"DELETE",headers:{Authorization:`Bearer ${accessToken}`}}
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error?.message || "Unable to delete Blogger post");
  }
}

module.exports = async function handler(req, res) {
  try {
    if (!["GET","POST","PUT","DELETE"].includes(req.method))
      return sendJSON(res,405,{error:"Method not allowed"});

    const refreshToken = getCookie(req,"BLOGGER_REFRESH_TOKEN");
    if (!refreshToken)
      return sendJSON(res,401,{error:"Blogger is not connected. Please connect Blogger first."});

    if (!process.env.BLOGGER_CLIENT_ID || !process.env.BLOGGER_CLIENT_SECRET)
      return sendJSON(res,500,{error:"BLOGGER_CLIENT_ID or BLOGGER_CLIENT_SECRET is missing in Vercel Environment Variables."});

    const accessToken = await getAccessToken(refreshToken);
    const blogs = await getMyBlogs(accessToken);
    if (!blogs.length)
      return sendJSON(res,404,{error:"No Blogger blog found for this Google account."});

    const blogId = blogs[0].id;
    const id = req.query?.id || req.body?.id;

    if (req.method === "GET") {
      if (req.query?.id) {
        const post = await getPost(accessToken,blogId,req.query.id);
        return sendJSON(res,200,normalizePost(post,post.status === "DRAFT" ? "draft" : "published"));
      }
      const status = req.query?.status || "live";
      if (status === "all") {
        const [drafts,live] = await Promise.all([
          listPosts(accessToken,blogId,"draft"),
          listPosts(accessToken,blogId,"live")
        ]);
        return sendJSON(res,200,{
          drafts:drafts.map(p=>normalizePost(p,"draft")),
          posts:live.map(p=>normalizePost(p,"published"))
        });
      }
      const items = await listPosts(accessToken,blogId,status === "draft" ? "draft" : "live");
      return sendJSON(res,200,items.map(p=>normalizePost(p,status === "draft" ? "draft" : "published")));
    }

    if (req.method === "DELETE") {
      if (!id) return sendJSON(res,400,{error:"Post ID is required."});
      await deletePost(accessToken,blogId,id);
      return sendJSON(res,200,{success:true,message:"Post deleted successfully."});
    }

    const body = req.body || {};
    const data = {
      title:body.title,
      category:body.category || "Government Jobs",
      description:body.description || "",
      officialLink:body.officialLink || "",
      secondLink:body.secondLink || "",
      secondLinkLabel:body.secondLinkLabel || "",
      instructions:body.instructions || "",
      fields:body.fields || {}
    };

    if (!data.title) return sendJSON(res,400,{error:"Post title is required."});
    if (!data.description) return sendJSON(res,400,{error:"Description is required."});

    if (req.method === "POST") {
      const created = await createPost(accessToken,blogId,data,Boolean(body.draft));
      return sendJSON(res,200,{
        success:true,
        message:body.draft ? "Draft saved successfully on Blogger." : "Post published successfully on Blogger.",
        post:normalizePost(created,body.draft ? "draft" : "published")
      });
    }

    if (req.method === "PUT") {
      if (!id) return sendJSON(res,400,{error:"Post ID is required for update."});
      const updated = await updatePost(accessToken,blogId,id,data,false);
      if (body.publish) {
        const published = await publishPost(accessToken,blogId,id);
        return sendJSON(res,200,{success:true,message:"Post published successfully.",post:normalizePost(published,"published")});
      }
      return sendJSON(res,200,{success:true,message:"Draft updated successfully.",post:normalizePost(updated,"draft")});
    }
  } catch (error) {
    console.error("Blogger Posts API Error:",error);
    return sendJSON(res,500,{error:error.message || "Internal server error"});
  }
};
