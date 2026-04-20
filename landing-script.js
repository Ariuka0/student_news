/* landing-script.js — Auth page only */

const state = {
  supabase: null,
  isConfigured: false,
  mode: "login", // "login" | "signup"
  loading: false
};

const el = {
  authHeading:  () => document.getElementById("authHeading"),
  authSubhead:  () => document.getElementById("authSubhead"),
  authForm:     () => document.getElementById("authForm"),
  tabs:         () => Array.from(document.querySelectorAll(".auth-tab")),
  nameField:    () => document.getElementById("nameField"),
  nameInput:    () => document.getElementById("nameInput"),
  emailInput:   () => document.getElementById("emailInput"),
  passwordInput:() => document.getElementById("passwordInput"),
  togglePw:     () => document.getElementById("togglePw"),
  submitBtn:    () => document.getElementById("submitBtn"),
  btnLabel:     () => document.querySelector(".btn-label"),
  btnSpinner:   () => document.querySelector(".btn-spinner"),
  authError:    () => document.getElementById("authError"),
  authSuccess:  () => document.getElementById("authSuccess"),
  authNote:     () => document.getElementById("authNote")
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  configureSupabase();
  bindEvents();

  if (state.isConfigured) {
    try {
      const { data: { session } } = await state.supabase.auth.getSession();
      if (session) {
        // Already logged in — go straight to dashboard
        window.location.replace("./app.html");
        return;
      }
    } catch (err) {
      console.warn("Session check failed:", err);
    }
  }

  setMode("login");
}

function configureSupabase() {
  const config = window.APP_CONFIG ?? {};
  const hasClient = Boolean(window.supabase?.createClient);
  const hasKeys   = Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY);

  state.isConfigured = hasClient && hasKeys;

  if (state.isConfigured) {
    state.supabase = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
  }
}

function bindEvents() {
  // Tab switching
  el.tabs().forEach(tab => {
    tab.addEventListener("click", () => setMode(tab.dataset.mode));
  });

  // Form submit
  el.authForm().addEventListener("submit", handleSubmit);

  // Password visibility toggle
  el.togglePw().addEventListener("click", () => {
    const input = el.passwordInput();
    const isHidden = input.type === "password";
    input.type = isHidden ? "text" : "password";
    el.togglePw().setAttribute("aria-label", isHidden ? "Нуух" : "Нууц үг харуулах");
  });
}

function setMode(mode) {
  state.mode = mode;

  el.tabs().forEach(tab => {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  });

  clearMessages();

  if (mode === "signup") {
    el.authHeading().textContent = "Бүртгэл Үүсгэх";
    el.authSubhead().textContent = "Нэвтэрч байж мэдээ нийтлэх, лайк дарах боломжтой.";
    el.nameField().hidden = false;
    el.nameInput().required = true;
    el.btnLabel().textContent = "Бүртгүүлэх";
    el.authNote().textContent = "Бүртгэл үүсгэсний дараа мэдээ нийтлэх, засах, устгах боломж нээгдэнэ.";
  } else {
    el.authHeading().textContent = "Нэвтрэх";
    el.authSubhead().textContent = "Тавтай морилно уу. Үргэлжлүүлэхийн тулд нэвтэрнэ үү.";
    el.nameField().hidden = true;
    el.nameInput().required = false;
    el.btnLabel().textContent = "Нэвтрэх";
    el.authNote().textContent = "Зочноор орвол мэдээ харах боломжтой боловч нийтлэх, лайк дарах боломжгүй.";
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
        options: { data: { display_name: displayName } }
      });

      if (error) throw error;

      if (data.session) {
        // Auto-confirmed → go to dashboard
        window.location.href = "./app.html";
      } else {
        // Email confirmation required
        showSuccess("Бүртгэл үүслээ! Имэйлийг шалгаад баталгаажуулалтын линкийг дарна уу.");
        setLoading(false);
      }

    } else {
      const { error } = await state.supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.href = "./app.html";
    }

  } catch (err) {
    console.error(err);
    const msg = translateError(err.message || "Нэвтрэх үед алдаа гарлаа.");
    showError(msg);
    setLoading(false);
  }
}

function setLoading(on) {
  state.loading = on;
  const btn = el.submitBtn();
  btn.disabled = on;
  el.btnLabel().hidden = on;
  el.btnSpinner().hidden = !on;
}

function showError(msg) {
  const el_err = el.authError();
  el_err.textContent = msg;
  el_err.hidden = false;
  el.authSuccess().hidden = true;
}

function showSuccess(msg) {
  const el_ok = el.authSuccess();
  el_ok.textContent = msg;
  el_ok.hidden = false;
  el.authError().hidden = true;
}

function clearMessages() {
  el.authError().hidden = true;
  el.authSuccess().hidden = true;
}

function translateError(msg) {
  const map = {
    "Invalid login credentials":   "Имэйл эсвэл нууц үг буруу байна.",
    "Email not confirmed":          "Имэйл баталгаажуулалт хийгдээгүй байна.",
    "User already registered":      "Энэ имэйлээр бүртгэл аль хэдийн байна.",
    "Password should be at least 6 characters": "Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой.",
    "Unable to validate email address: invalid format": "Имэйл хаягийн формат буруу байна."
  };
  for (const [key, val] of Object.entries(map)) {
    if (msg.includes(key)) return val;
  }
  return msg;
}
