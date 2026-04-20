const DEMO_POSTS = [
  {
    id: "demo-1",
    title: "Роботын баг бүсийн аварга боллоо",
    category: "Клуб",
    content: "Сургуулийн роботын баг амжилттай оролцож түрүүллээ.",
    userId: "demo-user-1",
    authorName: "Амина",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    likesCount: 0,
    likedByMe: false,
    isOwner: false,
    image_url: null,
    comments: []
  }
];

const state = {
  supabase: null,
  demoMode: true,
  guestMode: false,
  session: null,
  profile: null,
  posts: [],
  category: "Бүгд",
  sortBy: "latest",
  editingPostId: null,
  loading: false,
  selectedImageFile: null,
  selectedImageURL: null
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  setupSupabase();
  await bootstrap();
  bindEvents();
}

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

function bindEvents() {
  document.getElementById("postForm")?.addEventListener("submit", handlePostSubmit);
  document.getElementById("logoutButton")?.addEventListener("click", logout);
  document.getElementById("refreshButton")?.addEventListener("click", loadPosts);
}

async function bootstrap() {
  if (state.demoMode) {
    state.posts = DEMO_POSTS;
    render();
    return;
  }

  const { data: { session } } = await state.supabase.auth.getSession();
  state.session = session;

  if (!session) {
    state.guestMode = true;
  }

  await loadPosts();
  render();
}

async function loadPosts() {
  if (state.demoMode) {
    state.posts = DEMO_POSTS;
    render();
    return;
  }

  state.loading = true;

  try {
    const { data: posts, error } = await state.supabase
      .from("news_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const { data: comments } = await state.supabase
      .from("comments")
      .select("*");

    const { data: likes } = await state.supabase
      .from("post_likes")
      .select("*");

    state.posts = posts.map(p => {
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
    console.error(err);
  }

  state.loading = false;
  render();
}

async function handlePostSubmit(e) {
  e.preventDefault();

  if (!state.session) return alert("Login шаардлагатай");

  const title = document.getElementById("titleInput").value;
  const category = document.getElementById("categoryInput").value;
  const content = document.getElementById("contentInput").value;

  try {
    const { error } = await state.supabase
      .from("news_posts")
      .insert({
        title,
        category,
        content,
        user_id: state.session.user.id
      });

    if (error) throw error;

    await loadPosts();
    render();

  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

async function logout() {
  await state.supabase.auth.signOut();
  location.reload();
}

/* ── RENDER ── */

function render() {
  const feed = document.getElementById("feed");
  if (!feed) return;

  feed.innerHTML = "";

  state.posts.forEach(p => {
    const div = document.createElement("div");
    div.innerHTML = `
      <h3>${p.title}</h3>
      <p>${p.content}</p>
      <small>${p.category}</small>
      <hr/>
    `;
    feed.appendChild(div);
  });
}
