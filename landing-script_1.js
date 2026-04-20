/* landing-script.js — Auth page only
   FIXES:
   - Uses detectSessionInUrl to capture email confirmation token on redirect
   - Handles PKCE flow for email confirmation
   - Clears hash/search after session detected to avoid re-processing
   - Explicit redirectTo pointing at the Vercel production URL
*/

const SITE_URL = (() => {
  // Auto-detect: works on localhost AND on Vercel
  const { protocol, host } = window.location;
  return `${protocol}//${host}`;
})();

const state = {
  supabase: null,
  isConfigured: false,
  mode: "login",
  loading: false
};

const el = {
  authHeading:   () => document.getElementById("authHeading"),
  authSubhead:   () => document.getElementById("authSubhead"),
  authForm:      () => document.getElementById("authForm"),
  tabs:          () => Array.from(document.querySelectorAll(".auth-tab")),
  nameField:     () => document.getElementById("nameField"),
  nameInput:     () => document.getElementById("nameInput"),
  emailInput:    () => document.getElementById("emailInput"),
  passwordInput: () => document.getElementById("passwordInput"),
  togglePw:      () => document.getElementById("togglePw"),
  submitBtn:     () => document.getElementById("submitBtn"),
  btnLabel:      () => document.querySelector(".btn-label"),
  btnSpinner:    () => document.querySelector(".btn-spinner"),
  authError:     () => document.getElementById("authError"),
  authSuccess:   () => document.getElementById("authSuccess"),
  authNote:      () => document.getElementById("authNote")
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  configureSupabase();
  bindEvents();

  if (!state.isConfigured) {
    setMode("login");
    return;
  }

  // ── Handle email-confirmation redirect ──
  // Supabase v2 with PKCE puts the token in the URL hash or query string.
  // getSession() automatically exchanges it and signs the user in.
  try {
    const { data: { session }, error } = await state.supabase.auth.getSession();

    // Clean up the URL so a refresh doesn't re-process the token
    if (window.location.hash || window.location.search.includes("code=")) {
      history.replaceState(null, "", window.location.pathname);
    }

    if (error) {
      console.warn("Session error:", error.message);
      showError("Баталгаажуулалтын линк хүчингүй эсвэл хугацаа нь дууссан байна. Дахин нэвтэрнэ үү.");
    } else if (session) {
      window.location.replace("./app.html");
      return;
    }
  } catch (err) {
    console.warn("Session check failed:", err);
  }

  setMode("login");
}

function configureSupabase() {
  const config   = window.APP_CONFIG ?? {};
  const hasClient = Boolean(window.supabase?.createClient);
  const hasKeys   = Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY);

  state.isConfigured = hasClient && hasKeys;

  if (state.isConfigured) {
    state.supabase = window.supabase.createClient(
      config.SUPABASE_URL,
      config.SUPABASE_ANON_KEY,
      {
        auth: {
          // Ensures the email-confirmation token in the URL is auto-exchanged
          detectSessionInUrl: true,
          persistSession:     true,
          autoRefreshToken:   true
        }
      }
    );
  }
}

function bindEvents() {
  el.tabs().forEach(tab =>
    tab.addEventListener("click", () => setMode(tab.dataset.mode))
  );

  el.authForm().addEventListener("submit", handleSubmit);

  el.togglePw().addEventListener("click", () => {
    const input  = el.passwordInput();
    const hidden = input.type === "password";
    input.type   = hidden ? "text" : "password";
    el.togglePw().setAttribute("aria-label", hidden ? "Нуух" : "Нууц үг харуулах");
  });
}

function setMode(mode) {
  state.mode = mode;

  el.tabs().forEach(tab => {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  clearMessages();

  if (mode === "signup") {
    el.authHeading().textContent  = "Бүртгэл Үүсгэх";
    el.authSubhead().textContent  = "Нэвтрэч байж мэдээ нийтлэх, лайк дарах боломжтой.";
    el.nameField().hidden         = false;
    el.nameInput().required       = true;
    el.btnLabel().textContent     = "Бүртгүүлэх";
    el.authNote().textContent     = "Бүртгэл үүсгэсний дараа мэдээ нийтлэх, засах, устгах боломж нээгдэнэ.";
  } else {
    el.authHeading().textContent  = "Нэвтрэх";
    el.authSubhead().textContent  = "Тавтай морилно уу. Үргэлжлүүлэхийн тулд нэвтэрнэ үү.";
    el.nameField().hidden         = true;
    el.nameInput().required       = false;
    el.btnLabel().textContent     = "Нэвтрэх";
    el.authNote().textContent     = "Зочноор орвол мэдээ харах боломжтой боловч нийтлэх, лайк дарах боломжгүй.";
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  clearMessages();

  if (!state.isConfigured || !state.supabase) {
    showError("Supabase тохиргоо хийгдээгүй байна. config.js файлаа шалгана уу.");
    return;
  }

  const email       = el.emailInput().value.trim();
  const password    = el.passwordInput().value.trim();
  const displayName = el.nameInput().value.trim();

  if (!email || !password) {
    showError("Имэйл болон нууц үгээ оруулна уу.");
    return;
  }

  if (state.mode === "signup" && !displayName) {
    showError("Бүртгүүлэхдээ нэрээ заавал оруулна уу.");
    return;
  }

  setLoading(true);

  try {
    if (state.mode === "signup") {
      const { data, error } = await state.supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          // Tell Supabase where to redirect after the user clicks
          // the confirmation link in their email.
          emailRedirectTo: `${SITE_URL}/index.html`
        }
      });

      if (error) throw error;

      if (data.session) {
        // Email confirmation disabled → log straight in
        window.location.href = "./app.html";
      } else {
        showSuccess(
          "Бүртгэл үүслээ! " +
          "Таны имэйл рүү баталгаажуулах линк илгээлээ. " +
          "Спам хавтсаа ч шалгаарай."
        );
        setLoading(false);
      }

    } else {
      const { error } = await state.supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.href = "./app.html";
    }

  } catch (err) {
    console.error(err);
    showError(translateError(err.message || "Нэвтрэх үед алдаа гарлаа."));
    setLoading(false);
  }
}

function setLoading(on) {
  state.loading = on;
  el.submitBtn().disabled  = on;
  el.btnLabel().hidden      = on;
  el.btnSpinner().hidden    = !on;
}

function showError(msg) {
  const box = el.authError();
  box.textContent = msg;
  box.hidden      = false;
  el.authSuccess().hidden = true;
}

function showSuccess(msg) {
  const box = el.authSuccess();
  box.textContent = msg;
  box.hidden      = false;
  el.authError().hidden = true;
}

function clearMessages() {
  el.authError().hidden   = true;
  el.authSuccess().hidden = true;
}

function translateError(msg) {
  const map = {
    "Invalid login credentials":
      "Имэйл эсвэл нууц үг буруу байна.",
    "Email not confirmed":
      "Имэйл баталгаажуулалт хийгдээгүй байна. Имэйлийн хайрцгаа шалгана уу.",
    "User already registered":
      "Энэ имэйлээр бүртгэл аль хэдийн байна.",
    "Password should be at least 6 characters":
      "Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой.",
    "Unable to validate email address: invalid format":
      "Имэйл хаягийн формат буруу байна.",
    "over_email_send_rate_limit":
      "Хэт олон удаа оролдлоо. Хэсэг хугацааны дараа дахин оролдоно уу.",
    "Email rate limit exceeded":
      "Имэйл илгээх хязгаар хэтэрлээ. Түр хүлээгээд дахин оролдоно уу."
  };
  for (const [key, val] of Object.entries(map)) {
    if (msg.includes(key)) return val;
  }
  return msg;
}
