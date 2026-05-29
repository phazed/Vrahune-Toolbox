import {
  getCurrentUser,
  signUp,
  signIn,
  signOut,
  saveToolboxToCloud,
  loadToolboxFromCloud,
  collectLocalToolboxBundle
} from "./cloud-save.js";

console.log("[Cloud UI] file loaded");

let cloudUiWired = false;
let autosaveTimer = null;
let lastLocalKeysHash = "";
let autosaveEnabled = false;

const AUTOSAVE_INTERVAL_MS = 30000;
const AUTOSAVE_FLAG_KEY = "vrahuneCloudAutosaveEnabledV1";

function getEl(id) {
  const el = document.getElementById(id);

  if (!el) {
    console.warn("[Cloud UI] Missing element: #" + id);
  }

  return el;
}

function setStatus(message) {
  console.log("[Cloud UI status]", message);

  const status = getEl("cloudStatus");
  if (status) {
    status.textContent = message;
  }
}

function getCredentials() {
  const emailInput = getEl("cloudEmail");
  const passwordInput = getEl("cloudPassword");

  const email = emailInput ? emailInput.value.trim() : "";
  const password = passwordInput ? passwordInput.value : "";

  if (!email || !password) {
    throw new Error("Enter email and password first.");
  }

  return {
    email: email,
    password: password
  };
}

function getLocalKeysHash() {
  try {
    const bundle = collectLocalToolboxBundle();
    return JSON.stringify(bundle.keys || {});
  } catch (err) {
    console.error("[Cloud UI] Could not hash local toolbox data:", err);
    return "";
  }
}

function rememberAutosaveEnabled(value) {
  autosaveEnabled = value;

  try {
    window.localStorage.setItem(AUTOSAVE_FLAG_KEY, value ? "true" : "false");
  } catch (err) {
    console.warn("[Cloud UI] Could not save autosave flag:", err);
  }
}

function readRememberedAutosaveEnabled() {
  try {
    return window.localStorage.getItem(AUTOSAVE_FLAG_KEY) === "true";
  } catch {
    return false;
  }
}

async function refreshCloudStatus() {
  try {
    const user = await getCurrentUser();

    if (user) {
      if (autosaveEnabled) {
        setStatus("Signed in as " + user.email + " · Autosave on");
      } else {
        setStatus("Signed in as " + user.email + " · Autosave off until Save/Load");
      }
    } else {
      setStatus("Not signed in");
    }
  } catch (err) {
    setStatus("Could not check sign-in status.");
    console.error("[Cloud UI] Status check failed:", err);
  }
}

async function runAutosaveCheck() {
  if (!autosaveEnabled) {
    return;
  }

  try {
    const user = await getCurrentUser();

    if (!user) {
      return;
    }

    const currentHash = getLocalKeysHash();

    if (!currentHash) {
      return;
    }

    if (currentHash === lastLocalKeysHash) {
      return;
    }

    setStatus("Autosaving to cloud...");

    const saved = await saveToolboxToCloud();
    lastLocalKeysHash = getLocalKeysHash();

    const savedTime = new Date(saved.updated_at).toLocaleTimeString();
    setStatus("Autosaved at " + savedTime);
  } catch (err) {
    setStatus("Autosave failed: " + err.message);
    console.error("[Cloud UI] Autosave failed:", err);
  }
}

function startAutosave() {
  if (autosaveTimer) {
    return;
  }

  console.log("[Cloud UI] autosave started");

  autosaveTimer = window.setInterval(function () {
    runAutosaveCheck();
  }, AUTOSAVE_INTERVAL_MS);
}

function stopAutosave() {
  if (autosaveTimer) {
    window.clearInterval(autosaveTimer);
    autosaveTimer = null;
  }

  console.log("[Cloud UI] autosave stopped");
}

function enableAutosaveFromCurrentState() {
  rememberAutosaveEnabled(true);
  lastLocalKeysHash = getLocalKeysHash();
  startAutosave();
}

function wireCloudButtons() {
  if (cloudUiWired) {
    console.log("[Cloud UI] buttons already wired");
    return;
  }

  console.log("[Cloud UI] wiring buttons");

  const signUpBtn = getEl("cloudSignUpBtn");
  const signInBtn = getEl("cloudSignInBtn");
  const signOutBtn = getEl("cloudSignOutBtn");
  const saveBtn = getEl("cloudSaveBtn");
  const loadBtn = getEl("cloudLoadBtn");

  if (signUpBtn) {
    signUpBtn.addEventListener("click", async function () {
      console.log("[Cloud UI] sign up clicked");

      try {
        const creds = getCredentials();

        setStatus("Creating account...");
        await signUp(creds.email, creds.password);

        setStatus("Account created. Check your email if confirmation is required.");
        alert("Account created. Check your email to confirm your account, then come back and sign in.");
        await refreshCloudStatus();
      } catch (err) {
        setStatus("Sign up failed: " + err.message);
        console.error("[Cloud UI] Sign up failed:", err);
      }
    });
  }

  if (signInBtn) {
    signInBtn.addEventListener("click", async function () {
      console.log("[Cloud UI] sign in clicked");

      try {
        const creds = getCredentials();

        setStatus("Signing in...");
        await signIn(creds.email, creds.password);

        autosaveEnabled = readRememberedAutosaveEnabled();

        if (autosaveEnabled) {
          lastLocalKeysHash = getLocalKeysHash();
          startAutosave();
        }

        await refreshCloudStatus();
      } catch (err) {
        setStatus("Sign in failed: " + err.message);
        console.error("[Cloud UI] Sign in failed:", err);
      }
    });
  }

  if (signOutBtn) {
    signOutBtn.addEventListener("click", async function () {
      console.log("[Cloud UI] sign out clicked");

      try {
        setStatus("Signing out...");

        rememberAutosaveEnabled(false);
        stopAutosave();

        await signOut();
        await refreshCloudStatus();
      } catch (err) {
        setStatus("Sign out failed: " + err.message);
        console.error("[Cloud UI] Sign out failed:", err);
      }
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", async function () {
      console.log("[Cloud UI] save clicked");

      try {
        setStatus("Saving toolbox to cloud...");

        const saved = await saveToolboxToCloud();
        const savedTime = new Date(saved.updated_at).toLocaleString();

        enableAutosaveFromCurrentState();

        setStatus("Saved to cloud at " + savedTime + " · Autosave on");
      } catch (err) {
        setStatus("Save failed: " + err.message);
        console.error("[Cloud UI] Save failed:", err);
      }
    });
  }

  if (loadBtn) {
    loadBtn.addEventListener("click", async function () {
      console.log("[Cloud UI] load clicked");

      try {
        const confirmed = window.confirm(
          "Load from cloud? This will replace the current browser data with your cloud save, then reload the page."
        );

        if (!confirmed) {
          return;
        }

        setStatus("Loading toolbox from cloud...");

        const loaded = await loadToolboxFromCloud();

        if (!loaded) {
          setStatus("No cloud save found yet.");
          return;
        }

        rememberAutosaveEnabled(true);

        const loadedTime = new Date(loaded.updated_at).toLocaleString();

        setStatus("Loaded cloud save from " + loadedTime + ". Reloading...");
        window.location.reload();
      } catch (err) {
        setStatus("Load failed: " + err.message);
        console.error("[Cloud UI] Load failed:", err);
      }
    });
  }

  cloudUiWired = true;
}

async function initCloudUi() {
  console.log("[Cloud UI] init");

  wireCloudButtons();

  autosaveEnabled = readRememberedAutosaveEnabled();

  if (autosaveEnabled) {
    lastLocalKeysHash = getLocalKeysHash();
    startAutosave();
  }

  await refreshCloudStatus();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCloudUi);
} else {
  initCloudUi();
}
