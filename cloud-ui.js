import {
  getCurrentUser,
  signUp,
  signIn,
  signOut,
  saveToolboxToCloud,
  loadToolboxFromCloud
} from "./cloud-save.js";

console.log("[Cloud UI] file loaded");

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

  return { email, password };
}

async function refreshCloudStatus() {
  const user = await getCurrentUser();

  if (user) {
    setStatus("Signed in as " + user.email);
  } else {
    setStatus("Not signed in");
  }
}

function wireCloudButtons() {
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
        setStatus("Saved to cloud at " + savedTime);
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

        const loadedTime = new Date(loaded.updated_at).toLocaleString();
        setStatus("Loaded cloud save from " + loadedTime + ". Reloading...");
        window.location.reload();
      } catch (err) {
        setStatus("Load failed: " + err.message);
        console.error("[Cloud UI] Load failed:", err);
      }
    });
  }
}

async function initCloudUi() {
  console.log("[Cloud UI] init");

  wireCloudButtons();
  await refreshCloudStatus();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCloudUi);
} else {
  initCloudUi();
}
