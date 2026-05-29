import {
  getCurrentUser,
  signUp,
  signIn,
  signOut,
  saveToolboxToCloud,
  loadToolboxFromCloud
} from "./cloud-save.js";

function getEl(id) {
  return document.getElementById(id);
}

function setStatus(message) {
  const status = getEl("cloudStatus");
  if (status) status.textContent = message;
}

function getCredentials() {
  const email = getEl("cloudEmail")?.value.trim();
  const password = getEl("cloudPassword")?.value;

  if (!email || !password) {
    throw new Error("Enter email and password first.");
  }

  return { email, password };
}

async function refreshCloudStatus() {
  const user = await getCurrentUser();

  if (user) {
    setStatus(`Signed in as ${user.email}`);
  } else {
    setStatus("Not signed in");
  }
}

function wireCloudButtons() {
  const signUpBtn = getEl("cloudSignUpBtn");
  const signInBtn = getEl("cloudSignInBtn");
  const signOutBtn = getEl("cloudSignOutBtn");
  const saveBtn = getEl("cloudSaveBtn");
  const loadBtn = getEl("cloudLoadBtn");

  signUpBtn?.addEventListener("click", async () => {
    try {
      const { email, password } = getCredentials();
      setStatus("Creating account...");
      await signUp(email, password);
      setStatus("Account created. Check your email if confirmation is required.");
      await refreshCloudStatus();
    } catch (err) {
      setStatus(`Sign up failed: ${err.message}`);
    }
  });

  signInBtn?.addEventListener("click", async () => {
    try {
      const { email, password } = getCredentials();
      setStatus("Signing in...");
      await signIn(email, password);
      await refreshCloudStatus();
    } catch (err) {
      setStatus(`Sign in failed: ${err.message}`);
    }
  });

  signOutBtn?.addEventListener("click", async () => {
    try {
      await signOut();
      await refreshCloudStatus();
    } catch (err) {
      setStatus(`Sign out failed: ${err.message}`);
    }
  });

  saveBtn?.addEventListener("click", async () => {
    try {
      setStatus("Saving toolbox to cloud...");
      const saved = await saveToolboxToCloud();
      setStatus(`Saved to cloud at ${new Date(saved.updated_at).toLocaleString()}`);
    } catch (err) {
      setStatus(`Save failed: ${err.message}`);
    }
  });

  loadBtn?.addEventListener("click", async () => {
    try {
      const confirmed = window.confirm(
        "Load from cloud? This will replace the current browser data with your cloud save, then reload the page."
      );

      if (!confirmed) return;

      setStatus("Loading toolbox from cloud...");
      const loaded = await loadToolboxFromCloud();

      if (!loaded) {
        setStatus("No cloud save found yet.");
        return;
      }

      setStatus(`Loaded cloud save from ${new Date(loaded.updated_at).toLocaleString()}. Reloading...`);
      window.location.reload();
    } catch (err) {
      setStatus(`Load failed: ${err.message}`);
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  wireCloudButtons();
  await refreshCloudStatus();
});
