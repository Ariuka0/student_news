/* app-script.js — Dashboard page */

const DEMO_POSTS = [
  {
    id: "demo-1",
    title: "Роботын баг бүсийн аваргын цом хүртлээ",
    category: "Клуб",
    content: "Хоёр долоо хоногийн турш бүтээж, туршсан аврах робот нь амжилттай оролцож, роботын баг тэргүүн байр эзэллээ. Тэд ирэх сард улсын шатанд сургуулиа төлөөлөн оролцоно.",
    userId: "demo-user-1",
    authorName: "Амина",
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    likesCount: 18, likedByMe: false, isOwner: false,
    image_url: null,
    comments: [{ id: "dc1", authorName: "Тэмүүлэн", commentText: "Үүнийг сургуулиараа тэмдэглэх хэрэгтэй шүү.", createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString() }]
  },
  {
    id: "demo-2",
    title: "Шалгалтын долоо хоногт номын сан орой хүртэл ажиллана",
    category: "Хичээл",
    content: "Шалгалтын үеэр номын сан 20:00 цаг хүртэл ажиллах тул оюутнууд илүү тайван орчинд давтлага хийх, багаар ажиллах, төслөө бэлдэх боломжтой боллоо.",
    userId: "demo-user-2", authorName: "Нараа",
    createdAt: new Date(Date.now() - 1000 * 60 * 65).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 65).toISOString(),
    likesCount: 11, likedByMe: false, isOwner: false, image_url: null, comments: []
  },
  {
    id: "demo-3",
    title: "Баасан гарагт спортын багуудаа дэмжих өдөрлөг болно",
    category: "Спорт",
    content: "Баасан гарагт сургуулийн өнгийн хувцастай ирж, тоглолтын өмнөх дэмжлэгийн өдөрлөгт оролцох боломжтой. Клубууд мөн талбайн эргэн тойронд танилцуулгын булан гаргана.",
    userId: "demo-user-3", authorName: "Жавхаа",
    createdAt: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
    likesCount: 9, likedByMe: false, isOwner: false, image_url: null,
    comments: [{ id: "dc2", authorName: "Билгүүн", commentText: "Тоглолтын яг цагийг бас нэмчихвэл гоё байна.", createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString() }]
  }
];

const state = {
  supabase: null,
  isConfigured: false,
  demoMode: true,
  guestMode: false,
  session: null,
  profile: null,
  posts: [],
  category: "Бүгд",
  sortBy: "latest",
  editingPostId: null,
  loading: false,
  // image upload state
  selectedImageFile: null,
  selectedImageURL: null,
  uploadingImage: false
};

// Cache DOM element references
const el = {
  guestBanner:         () => document.getElementById("guestBanner"),
  setupCard:           () => document.getElementById("setupCard"),
  userCard:            () => document.getElementById("userCard"),
  userAvatar:          () => document.getElementById("userAvatar"),
  userGreeting:        () => document.getElementById("userGreeting"),
  userEmail:           () => document.getElementById("userEmail"),
  navUser:             () => document.getElementById("navUser"),
  composer:            () => document.getElementById("composer"),
  composerEyebrow:     () => document.getElementById("composerEyebrow"),
  composerTitle:       () => document.getElementById("composerTitle"),
  composerHint:        () => document.getElementById("composerHint"),
  postForm:            () => document.getElementById("postForm"),
  titleInput:          () => document.getElementById("titleInput"),
  categoryInput:       () => document.getElementById("categoryInput"),
  contentInput:        () => document.getElementById("contentInput"),
  postSubmitButton:    () => document.getElementById("postSubmitButton"),
  cancelEditButton:    () => document.getElementById("cancelEditButton"),
  logoutButton:        () => document.getElementById("logoutButton"),
  jumpComposerButton:  () => document.getElementById("jumpComposerButton"),
  postCount:           () => document.getElementById("postCount"),
  likeCount:           () => document.getElementById("likeCount"),
  commentCount:        () => document.getElementById("commentCount"),
  featuredStory:       () => document.getElementById("featuredStory"),
  connectionBadge:     () => document.getElementById("connectionBadge"),
  refreshButton:       () => document.getElementById("refreshButton"),
  feed:                () => document.getElementById("feed"),
  filterBar:           () => document.getElementById("filterBar"),
  statusMessage:       () => document.getElementById("statusMessage"),
  sortSelect:          () => document.getElementById("sortSelect"),
  postTemplate:        () => document.getElementById("postTemplate"),
  // image upload
  imageFileInput:      () => document.getElementById("imageFileInput"),
  imageUploadArea:     () => document.getElementById("imageUploadArea"),
  imagePreviewWrap:    () => document.getElementById("imagePreviewWrap"),
  imagePreview:        () => document.getElementById("imagePreview"),
  removeImageBtn:      () => document.getElementById("removeImageBtn"),
  uploadProgress:      () => document.getElementById("uploadProgress"),
  uploadProgressText:  () => document.getElementById("uploadProgressText")
};

let msgTimeout = 0;

document.addEventListener("DOMContentLoaded", init);

async function init() {
  configureSupabase();
  bindEvents();
  await bootstrap();
}

function configureSupabase() {
  const config = window.APP_CONFIG ?? {};
  const hasClient = Boolean(window.supabase?.createClient);
  const hasKeys   = Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY);

  state.isConfigured = hasClient && hasKeys;
  state.demoMode     = !state.isConfigured;

  if (state.isConfigured) {
    state.supabase = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
  }
}

function bindEvents() {
  el.refreshButton().addEventListener("click", () => void refreshFeed());
  el.logoutButton().addEventListener("click", handleLogout);
  el.jumpComposerButton().addEventListener("click", () => {
    el.composer().scrollIntoView({ behavior: "smooth", block: "start" });
  });

  el.postForm().addEventListener("submit", handlePostSubmit);
  el.cancelEditButton().addEventListener("click", clearEditState);

  el.sortSelect().addEventListener("change", (e) => {
    state.sortBy = e.target.value;
    renderFeed();
  });

  el.filterBar().addEventListener("click", handleFilterClick);
  el.feed().addEventListener("click", (e) => void handleFeedClick(e));
  el.feed().addEventListener("submit", (e) => void handleFeedSubmit(e));

  // Image upload events
  el.imageFileInput().addEventListener("change", handleImageFileChange);
  el.removeImageBtn().addEventListener("click", removeImage);

  const uploadArea = el.imageUploadArea();
  uploadArea.addEventListener("click", () => {
    if (!uploadArea.classList.contains("disabled")) {
      el.imageFileInput().click();
    }
  });
  uploadArea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!uploadArea.classList.contains("disabled")) el.imageFileInput().click();
    }
  });

  // Drag & drop
  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    if (!uploadArea.classList.contains("disabled")) uploadArea.classList.add("drag-over");
  });
  uploadArea.addEventListener("dragleave", () => uploadArea.classList.remove("drag-over"));
  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("drag-over");
    if (uploadArea.classList.contains("disabled")) return;
    const file = e.dataTransfer?.files?.[0];
    if (file) handleImageSelect(file);
  });
}

/* ── IMAGE UPLOAD FUNCTIONS ── */

function handleImageFileChange(e) {
  const file = e.target.files?.[0];
  if (file) handleImageSelect(file);
  // Reset input so same file can be re-selected
  e.target.value = "";
}

function handleImageSelect(file) {
  // Validate type
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    showMessage("Зөвхөн JPG, PNG, WEBP форматын зураг оруулна уу.", "error");
    return;
  }

  // Validate size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    showMessage("Зургийн хэмжээ 5MB-аас хэтрэхгүй байх ёстой.", "error");
    return;
  }

  state.selectedImageFile = file;

  // Show preview
  const reader = new FileReader();
  reader.onload = (e) => {
    state.selectedImageURL = e.target.result;
    previewImage(e.target.result);
  };
  reader.readAsDataURL(file);
}

function previewImage(dataURL) {
  el.imageUploadArea().hidden = true;
  el.imagePreview().src = dataURL;
  el.imagePreviewWrap().hidden = false;
}

function removeImage() {
  state.selectedImageFile = null;
  state.selectedImageURL  = null;
  el.imagePreview().src = "";
  el.imagePreviewWrap().hidden = true;
  el.imageUploadArea().hidden = false;
  el.uploadProgress().hidden  = true;
}

async function uploadImageToSupabase(file) {
  if (!state.supabase) throw new Error("Supabase not configured");

  const ext      = file.name.split(".").pop().toLowerCase() || "jpg";
  const filename = `${state.session.user.id}_${Date.now()}.${ext}`;
  const bucket   = "post-images";

  el.uploadProgress().hidden = false;
  el.uploadProgressText().textContent = "Зураг байршуулж байна...";

  const { data, error } = await state.supabase.storage
    .from(bucket)
    .upload(filename, file, { contentType: file.type, upsert: false });

  if (error) throw error;

  // Get public URL
  const { data: urlData } = state.supabase.storage.from(bucket).getPublicUrl(filename);
  el.uploadProgress().hidden = true;
  return urlData.publicUrl;
}

/* ── BOOTSTRAP & DATA ── */

async function bootstrap() {
  if (!state.isConfigured) {
    state.guestMode = true;
    state.posts = cloneData(DEMO_POSTS);
    render();
    showMessage("Demo preview горимд байна. config.js болон SQL setup-аа хийгээрэй.", "info", true);
    return;
  }

  try {
    const { data: { session } } = await state.supabase.auth.getSession();
    state.session = session;

    if (session) {
      state.guestMode = false;
      await ensureOwnProfile();
    } else {
      state.guestMode = true;
    }

    state.supabase.auth.onAuthStateChange(async (_event, sessionData) => {
      const wasGuest = state.guestMode;
      state.session  = sessionData;
      state.profile  = null;

      if (sessionData) {
        state.guestMode = false;
        await ensureOwnProfile();
      } else {
        state.guestMode = true;
        clearEditState();
        if (!wasGuest) {
          window.location.href = "./index.html";
          return;
        }
      }

      await loadPosts();
      render();
    });

    await loadPosts();
    render();

  } catch (err) {
    console.error(err);
    state.demoMode  = true;
    state.guestMode = true;
    state.posts = cloneData(DEMO_POSTS);
    render();
    showMessage("Supabase холболтод алдаа гарлаа. Demo горимд шилжлээ.", "error", true);
  }
}

async function refreshFeed() {
  if (state.demoMode) {
    state.posts = cloneData(DEMO_POSTS);
    render();
    showMessage("Demo шинэчлэгдлээ.", "info");
    return;
  }
  const ok = await loadPosts();
  render();
  if (ok) showMessage("Мэдээний жагсаалт шинэчлэгдлээ.", "success");
}

async function ensureOwnProfile() {
  if (!state.session) { state.profile = null; return; }

  const fallback    = getNameFromEmail(state.session.user.email);
  const displayName = (
    state.session.user.user_metadata?.display_name ||
    state.profile?.display_name ||
    fallback
  ).trim();

  const payload = { id: state.session.user.id, display_name: displayName };
  const { error } = await state.supabase.from("profiles").upsert(payload);
  if (error) throw error;
  state.profile = payload;
}

async function loadPosts() {
  if (state.demoMode) {
    state.posts = cloneData(DEMO_POSTS);
    return true;
  }

  state.loading = true;
  renderFeed();

  try {
    const [pr, cr, lr] = await Promise.all([
      state.supabase.from("news_posts")
        .select("id,title,category,content,image_url,user_id,created_at,updated_at,profiles!news_posts_user_id_fkey(display_name)")
        .order("created_at", { ascending: false }),
      state.supabase.from("comments")
        .select("id,post_id,user_id,comment_text,created_at,profiles!comments_user_id_fkey(display_name)")
        .order("created_at", { ascending: true }),
      state.supabase.from("post_likes").select("post_id,user_id")
    ]);

    if (pr.error) throw pr.error;
    if (cr.error) throw cr.error;
    if (lr.error) throw lr.error;

    state.posts = normalizeRemotePosts(pr.data ?? [], cr.data ?? [], lr.data ?? []);
    return true;
  } catch (err) {
    console.error(err);
    showMessage("Өгөгдөл ачаалах үед алдаа гарлаа. SQL policy эсвэл config-аа шалгана уу.", "error", true);
    return false;
  } finally {
    state.loading = false;
  }
}

function normalizeRemotePosts(posts, comments, likes) {
  return posts.map(post => {
    const postComments = comments
      .filter(c => c.post_id === post.id)
      .map(c => ({ id: c.id, authorName: getRelatedDisplayName(c.profiles), commentText: c.comment_text, createdAt: c.created_at }));

    const postLikes = likes.filter(l => l.post_id === post.id);

    return {
      id: post.id, title: post.title, category: post.category,
      content: post.content, userId: post.user_id,
      image_url: post.image_url || null,
      authorName: getRelatedDisplayName(post.profiles),
      createdAt: post.created_at, updatedAt: post.updated_at,
      likesCount: postLikes.length,
      likedByMe: Boolean(state.session && postLikes.some(l => l.user_id === state.session.user.id)),
      isOwner: Boolean(state.session && post.user_id === state.session.user.id),
      comments: postComments
    };
  });
}

/* ── RENDER ── */
function render() {
  renderGuestBanner();
  renderConnectionState();
  renderNavUser();
  renderAuthPanels();
  renderStats();
  renderFeaturedStory();
  renderFilterBar();
  renderFeed();
  renderComposerState();
}

function renderGuestBanner() {
  el.guestBanner().hidden = !state.guestMode;
}

function renderConnectionState() {
  const badge = el.connectionBadge();
  if (!state.isConfigured || state.demoMode) {
    badge.dataset.state = "setup";
    badge.textContent   = "Demo горим";
    return;
  }
  if (state.session) {
    badge.dataset.state = "authed";
    badge.textContent   = "Нэвтэрсэн";
    return;
  }
  badge.dataset.state = "connected";
  badge.textContent   = "Supabase холбогдсон";
}

function renderNavUser() {
  const nav = el.navUser();
  if (state.session) {
    const name  = state.profile?.display_name || getNameFromEmail(state.session.user.email);
    const email = state.session.user.email ?? "";
    nav.innerHTML = `
      <div style="text-align:right">
        <div class="nav-user-name">${escapeHtml(name)}</div>
        <div class="nav-user-email">${escapeHtml(email)}</div>
      </div>
    `;
  } else {
    nav.innerHTML = `
      <a href="./index.html" class="btn btn-primary" style="font-size:0.85rem;padding:9px 16px">Нэвтрэх</a>
    `;
  }
}

function renderAuthPanels() {
  el.setupCard().hidden = state.isConfigured;
  el.userCard().hidden  = !state.session;

  if (state.session) {
    const name  = state.profile?.display_name || getNameFromEmail(state.session.user.email);
    const email = state.session.user.email ?? "";
    el.userGreeting().textContent = name;
    el.userEmail().textContent    = email;
    el.userAvatar().textContent   = (name[0] || "?").toUpperCase();
  }
}

function renderComposerState() {
  const locked    = state.demoMode || state.guestMode || !state.session;
  const isEditing = Boolean(state.editingPostId);

  el.composerEyebrow().textContent  = isEditing ? "Пост Засварлах" : "Шинэ Мэдээ";
  el.composerTitle().textContent    = isEditing ? "Өөрийн мэдээг засварлаж байна" : "Мэдээ нийтлэх";
  el.postSubmitButton().textContent = isEditing ? "Засвар Хадгалах" : "Нийтлэх";
  el.cancelEditButton().hidden = !isEditing;

  if (state.demoMode) {
    el.composerHint().textContent = "Demo горимд байна. config.js болон SQL setup хийсний дараа ажиллана.";
  } else if (state.guestMode || !state.session) {
    el.composerHint().textContent = "Мэдээ нийтлэхийн тулд эхлээд нэвтэрнэ үү.";
  } else {
    const name = state.profile?.display_name || getNameFromEmail(state.session.user.email);
    el.composerHint().textContent = `${name} нэрээр нийтлэгдэнэ.`;
  }

  // Lock/unlock form fields
  Array.from(el.postForm().elements).forEach(field => {
    if (field instanceof HTMLElement) field.toggleAttribute("disabled", locked);
  });

  // Lock/unlock upload area
  const uploadArea = el.imageUploadArea();
  if (locked) {
    uploadArea.classList.add("disabled");
  } else {
    uploadArea.classList.remove("disabled");
  }
}

function renderStats() {
  const likeTotal    = state.posts.reduce((s, p) => s + p.likesCount, 0);
  const commentTotal = state.posts.reduce((s, p) => s + p.comments.length, 0);
  el.postCount().textContent    = String(state.posts.length);
  el.likeCount().textContent    = String(likeTotal);
  el.commentCount().textContent = String(commentTotal);
}

function renderFeaturedStory() {
  const box = el.featuredStory();
  if (!state.posts.length) {
    box.innerHTML = `
      <p class="featured-label">Онцлох</p>
      <h2>Одоогоор мэдээ алга</h2>
      <p class="featured-body">Нэвтрээд эхний мэдээгээ нийтлээрэй.</p>
    `;
    return;
  }

  const top = [...state.posts].sort((a, b) =>
    b.likesCount !== a.likesCount
      ? b.likesCount - a.likesCount
      : new Date(b.createdAt) - new Date(a.createdAt)
  )[0];

  box.innerHTML = `
    <p class="featured-label">Онцлох</p>
    <h2>${escapeHtml(top.title)}</h2>
    <p class="featured-body">${escapeHtml(top.content)}</p>
    <div class="featured-meta">
      <span>${escapeHtml(top.category)}</span>
      <span>${top.likesCount} лайк</span>
      <span>${escapeHtml(top.authorName)}</span>
    </div>
  `;
}

function renderFilterBar() {
  const cats = ["Бүгд", ...new Set(state.posts.map(p => p.category))];
  const bar  = el.filterBar();
  bar.innerHTML = "";
  cats.forEach(cat => {
    const btn = document.createElement("button");
    btn.type      = "button";
    btn.className = `filter-chip${state.category === cat ? " active" : ""}`;
    btn.dataset.category = cat;
    btn.textContent = cat;
    bar.appendChild(btn);
  });
}

function renderFeed() {
  const feed = el.feed();

  if (state.loading) {
    feed.innerHTML = `<div class="loading-feed">Мэдээ ачаалж байна...</div>`;
    return;
  }

  const visible = getVisiblePosts();
  feed.innerHTML = "";

  if (!visible.length) {
    feed.innerHTML = `<div class="empty-feed">Энэ ангилалд одоохондоо мэдээ алга.</div>`;
    return;
  }

  visible.forEach(post => {
    const frag = el.postTemplate().content.cloneNode(true);

    frag.querySelector(".post-category").textContent = post.category;
    frag.querySelector(".post-date").textContent     = formatDate(post.createdAt);
    frag.querySelector(".post-title").textContent    = post.title;
    frag.querySelector(".post-body").textContent     = post.content;
    frag.querySelector(".author-chip").textContent   = post.authorName;

    // Inject post image if present
    if (post.image_url) {
      const img = document.createElement("img");
      img.src       = post.image_url;
      img.alt       = escapeHtml(post.title);
      img.className = "post-image";
      img.loading   = "lazy";
      // Insert before card-actions
      const cardActions = frag.querySelector(".card-actions");
      cardActions.parentNode.insertBefore(img, cardActions);
    }

    const likeBtn = frag.querySelector(".like-btn");
    likeBtn.dataset.postId = post.id;
    likeBtn.textContent    = post.likedByMe ? `♥ ${post.likesCount}` : `♡ ${post.likesCount}`;
    likeBtn.classList.toggle("is-liked", post.likedByMe);
    likeBtn.disabled = state.demoMode || state.guestMode || !state.session;

    frag.querySelector(".comment-count").textContent = `${post.comments.length} сэтгэгдэл`;

    const ownerActions = frag.querySelector(".owner-actions");
    ownerActions.hidden = !post.isOwner;
    frag.querySelector(".edit-btn").dataset.postId   = post.id;
    frag.querySelector(".delete-btn").dataset.postId = post.id;

    const commentsList = frag.querySelector(".comments-list");
    if (!post.comments.length) {
      commentsList.innerHTML = `<div class="empty-comments">Анхны сэтгэгдлийг үлдээгээрэй.</div>`;
    } else {
      post.comments.forEach(c => {
        const div = document.createElement("div");
        div.className = "comment-item";
        div.innerHTML = `<p>${escapeHtml(c.commentText)}</p><div class="comment-meta">${escapeHtml(c.authorName)} · ${formatDate(c.createdAt)}</div>`;
        commentsList.appendChild(div);
      });
    }

    const commentForm  = frag.querySelector(".comment-form");
    const commentInput = frag.querySelector(".comment-input");
    const commentNote  = frag.querySelector(".comment-note");
    const commentBtn   = frag.querySelector(".comment-submit-btn");

    commentForm.dataset.postId = post.id;
    const canComment = !state.demoMode && !state.guestMode && state.session;
    commentInput.placeholder = canComment ? "Сэтгэгдлээ энд бичнэ үү" : "Сэтгэгдэл үлдээхийн тулд нэвтэрнэ үү";
    commentInput.disabled = !canComment;
    commentBtn.disabled   = !canComment;
    commentNote.textContent = state.demoMode
      ? "Supabase тохиргоо хийсний дараа comment database дээр хадгалагдана."
      : canComment
        ? "Сэтгэгдэл таны профайл нэрээр хадгалагдана."
        : "Comment үлдээхийн тулд нэвтэрнэ үү.";

    feed.appendChild(frag);
  });
}

function getVisiblePosts() {
  const filtered = state.category === "Бүгд"
    ? [...state.posts]
    : state.posts.filter(p => p.category === state.category);

  return filtered.sort((a, b) => {
    if (state.sortBy === "liked" && b.likesCount !== a.likesCount)
      return b.likesCount - a.likesCount;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

/* ── EVENT HANDLERS ── */
function handleFilterClick(e) {
  const btn = e.target.closest(".filter-chip");
  if (!btn) return;
  state.category = btn.dataset.category;
  renderFilterBar();
  renderFeed();
}

async function handleFeedClick(e) {
  const btn = e.target.closest("button");
  if (!btn) return;
  if (btn.classList.contains("like-btn"))   { await toggleLike(btn.dataset.postId); return; }
  if (btn.classList.contains("edit-btn"))   { startEdit(btn.dataset.postId); return; }
  if (btn.classList.contains("delete-btn")) { await deletePost(btn.dataset.postId); }
}

async function handleFeedSubmit(e) {
  const form = e.target.closest(".comment-form");
  if (!form) return;
  e.preventDefault();

  if (state.demoMode) {
    showMessage("Comment feature-г ажиллуулахын тулд Supabase холбоно уу.", "info", true);
    return;
  }
  if (!state.session) {
    showMessage("Comment үлдээхийн тулд эхлээд нэвтэрнэ үү.", "error");
    return;
  }

  const input       = form.querySelector(".comment-input");
  const commentText = input.value.trim();
  if (!commentText) { showMessage("Сэтгэгдлээ хоосон орхиж болохгүй.", "error"); return; }

  try {
    const { error } = await state.supabase.from("comments").insert({
      post_id: form.dataset.postId,
      user_id: state.session.user.id,
      comment_text: commentText
    });
    if (error) throw error;
    input.value = "";
    await loadPosts();
    render();
    showMessage("Сэтгэгдэл амжилттай хадгалагдлаа.", "success");
  } catch (err) {
    console.error(err);
    showMessage(err.message || "Сэтгэгдэл хадгалах үед алдаа гарлаа.", "error", true);
  }
}

async function toggleLike(postId) {
  if (state.demoMode) { showMessage("Like feature-г ажиллуулахын тулд Supabase холбоно уу.", "info", true); return; }
  if (!state.session) { showMessage("Лайк дарахын тулд эхлээд нэвтэрнэ үү.", "error"); return; }

  const post = state.posts.find(p => p.id === postId);
  if (!post) return;

  try {
    if (post.likedByMe) {
      const { error } = await state.supabase.from("post_likes").delete()
        .eq("post_id", postId).eq("user_id", state.session.user.id);
      if (error) throw error;
    } else {
      const { error } = await state.supabase.from("post_likes").insert({ post_id: postId, user_id: state.session.user.id });
      if (error) throw error;
    }
    await loadPosts();
    render();
  } catch (err) {
    console.error(err);
    showMessage(err.message || "Лайк шинэчлэх үед алдаа гарлаа.", "error", true);
  }
}

function startEdit(postId) {
  const post = state.posts.find(p => p.id === postId && p.isOwner);
  if (!post) { showMessage("Зөвхөн өөрийн постыг л засах боломжтой.", "error"); return; }
  state.editingPostId = postId;
  el.titleInput().value    = post.title;
  el.categoryInput().value = post.category;
  el.contentInput().value  = post.content;
  // Clear image when editing (don't replace existing image unless new one uploaded)
  removeImage();
  renderComposerState();
  el.composer().scrollIntoView({ behavior: "smooth", block: "start" });
}

function clearEditState() {
  state.editingPostId = null;
  el.postForm().reset();
  el.categoryInput().value = "Сургууль";
  removeImage();
  renderComposerState();
}

async function handleLogout() {
  if (!state.supabase) return;
  const { error } = await state.supabase.auth.signOut();
  if (error) { showMessage(error.message || "Гарах үед алдаа гарлаа.", "error", true); return; }
}

async function handlePostSubmit(e) {
  e.preventDefault();

  if (state.demoMode) { showMessage("Энэ form-ыг ажиллуулахын тулд Supabase холболтоо хийгээрэй.", "info", true); return; }
  if (!state.session)  { showMessage("Мэдээ нийтлэхийн тулд нэвтэрнэ үү.", "error"); return; }

  const title    = el.titleInput().value.trim();
  const category = el.categoryInput().value.trim();
  const content  = el.contentInput().value.trim();

  if (!title || !category || !content) { showMessage("Гарчиг, ангилал, агуулгаа бүгдийг бөглөнө үү.", "error"); return; }

  // Disable form during submission
  el.postSubmitButton().disabled = true;
  el.postSubmitButton().textContent = state.editingPostId ? "Хадгалж байна..." : "Нийтлэж байна...";

  try {
    let imageUrl = null;

    // Upload image first if selected
    if (state.selectedImageFile && !state.demoMode) {
      try {
        imageUrl = await uploadImageToSupabase(state.selectedImageFile);
      } catch (imgErr) {
        console.error("Image upload failed:", imgErr);
        showMessage("Зураг байршуулахад алдаа гарлаа: " + (imgErr.message || ""), "error", true);
        el.postSubmitButton().disabled = false;
        el.postSubmitButton().textContent = state.editingPostId ? "Засвар Хадгалах" : "Нийтлэх";
        return;
      }
    }

    if (state.editingPostId) {
      const updatePayload = { title, category, content };
      // Only update image if a new one was uploaded
      if (imageUrl) updatePayload.image_url = imageUrl;

      const { error } = await state.supabase.from("news_posts")
        .update(updatePayload)
        .eq("id", state.editingPostId)
        .eq("user_id", state.session.user.id);
      if (error) throw error;
      showMessage("Пост амжилттай засагдлаа.", "success");
    } else {
      const payload = { title, category, content, user_id: state.session.user.id };
      if (imageUrl) payload.image_url = imageUrl;

      const { error } = await state.supabase.from("news_posts").insert(payload);
      if (error) throw error;
      showMessage("Мэдээ амжилттай нийтлэгдлээ.", "success");
    }

    clearEditState();
    await loadPosts();
    render();
  } catch (err) {
    console.error(err);
    showMessage(err.message || "Пост хадгалах үед алдаа гарлаа.", "error", true);
  } finally {
    el.postSubmitButton().disabled = false;
    renderComposerState();
  }
}

async function deletePost(postId) {
  if (state.demoMode) { showMessage("Delete feature-г ажиллуулахын тулд Supabase холбоно уу.", "info", true); return; }
  const post = state.posts.find(p => p.id === postId && p.isOwner);
  if (!post) { showMessage("Зөвхөн өөрийн постыг л устгах боломжтой.", "error"); return; }

  if (!window.confirm("Энэ мэдээг устгах уу?")) return;

  try {
    const { error } = await state.supabase.from("news_posts").delete()
      .eq("id", postId).eq("user_id", state.session.user.id);
    if (error) throw error;
    if (state.editingPostId === postId) clearEditState();
    await loadPosts();
    render();
    showMessage("Пост устгагдлаа.", "success");
  } catch (err) {
    console.error(err);
    showMessage(err.message || "Пост устгах үед алдаа гарлаа.", "error", true);
  }
}

/* ── UTILITIES ── */
function showMessage(msg, tone = "info", sticky = false) {
  const box = el.statusMessage();
  box.textContent    = msg;
  box.dataset.tone   = tone;
  clearTimeout(msgTimeout);
  if (!sticky) msgTimeout = setTimeout(() => { box.textContent = ""; }, 3400);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("mn-MN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function getRelatedDisplayName(rec) {
  if (Array.isArray(rec) && rec[0]?.display_name) return rec[0].display_name;
  if (rec && typeof rec === "object" && rec.display_name) return rec.display_name;
  return "Нэргүй хэрэглэгч";
}

function getNameFromEmail(email) {
  if (!email) return "Хэрэглэгч";
  const part = email.split("@")[0].replace(/[._-]+/g, " ").trim();
  if (!part) return "Хэрэглэгч";
  return part.split(" ").filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
}

function cloneData(data) { return JSON.parse(JSON.stringify(data)); }

function escapeHtml(v) {
  return String(v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
