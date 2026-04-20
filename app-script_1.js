const state = {
  supabase: null,
  demoMode: true,
  session: null,
  posts: [],
  loading: false
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  setupSupabase();
  await bootstrap();
  bindEvents();
}

/* ── SUPABASE INIT ── */
function setupSupabase() {
  const config = window.APP_CONFIG ?? {};

  if (config.SUPABASE_URL && config.SUPABASE_ANON_KEY && window.supabase) {
    state.supabase = window.supabase.createClient(
      config.SUPABASE_URL,
      config.SUPABASE_ANON_KEY,
      {
        auth: {
          detectSessionInUrl: true,
          persistSession: true,
          autoRefreshToken: true
        }
      }
    );
    state.demoMode = false;
  }
}

/* ── BOOTSTRAP ── */
async function bootstrap() {
  if (state.demoMode) {
    state.posts = [];
    render();
    return;
  }

  const { data: { session } } = await state.supabase.auth.getSession();
  state.session = session;

  await loadPosts();
  render();
}

/* ── LOAD POSTS (FIXED - NO JOIN) ── */
async function loadPosts() {
  if (state.demoMode) return;

  state.loading = true;

  try {
    const { data: posts, error } = await state.supabase
      .from("news_posts")
      .select("id,title,category,content,image_url,user_id,created_at,updated_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const { data: comments } = await state.supabase
      .from("comments")
      .select("id,post_id,user_id,comment_text,created_at");

    const { data: likes } = await state.supabase
      .from("post_likes")
      .select("post_id,user_id");

    state.posts = (posts || []).map(p => {

      const postComments = (comments || [])
        .filter(c => c.post_id === p.id);

      const postLikes = (likes || [])
        .filter(l => l.post_id === p.id);

      return {
        ...p,
        authorName: "User",
        likesCount: postLikes.length,
        likedByMe: state.session
          ? postLikes.some(l => l.user_id === state.session.user.id)
          : false,
        isOwner: state.session
          ? p.user_id === state.session.user.id
          : false,
        comments: postComments
      };
    });

  } catch (err) {
    console.error("loadPosts error:", err);
  }

  state.loading = false;
  render();
}

/* ── CREATE POST ── */
async function createPost(title, content, category) {
  const user = state.session?.user;
  if (!user) return alert("Login шаардлагатай");

  const { error } = await state.supabase.from("news_posts").insert({
    title,
    content,
    category,
    user_id: user.id
  });

  if (error) {
    console.error(error);
    return alert(error.message);
  }

  await loadPosts();
}

/* ── RENDER ── */
function render() {
  const feed = document.getElementById("feed");
  if (!feed) return;

  feed.innerHTML = "";

  state.posts.forEach(post => {
    const div = document.createElement("div");
    div.className = "post-card";

    div.innerHTML = `
      <h3>${escapeHtml(post.title)}</h3>
      <p>${escapeHtml(post.content)}</p>
      <small>${post.category}</small>
      <div>❤️ ${post.likesCount}</div>
      <hr/>
    `;

    feed.appendChild(div);
  });
}

/* ── EVENTS ── */
function bindEvents() {
  const form = document.getElementById("postForm");

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("titleInput").value;
    const content = document.getElementById("contentInput").value;
    const category = document.getElementById("categoryInput").value;

    await createPost(title, content, category);

    form.reset();
  });
}

/* ── UTIL ── */
function escapeHtml(v) {
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
