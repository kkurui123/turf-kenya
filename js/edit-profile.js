"use strict";


const menuButton =
  document.getElementById("menu-button");

const dashboardMenu =
  document.getElementById("dashboard-menu");

const profileButton =
  document.getElementById("profile-button");

const profileDropdown =
  document.getElementById("profile-dropdown");

const profileForm =
  document.getElementById("edit-profile-form");

const fullNameInput =
  document.getElementById("full-name");

const countyInput =
  document.getElementById("county");

const phoneInput =
  document.getElementById("phone");

const currentRoleInput =
  document.getElementById("current-role");

const saveButton =
  document.getElementById("save-profile-button");

const messageBox =
  document.getElementById("edit-profile-message");

const signOutButton =
  document.getElementById("sign-out-button");


let supabase = null;
let currentUserId = null;
let saving = false;


function showMessage(text, type = "error") {
  messageBox.textContent = text;
  messageBox.dataset.type = type;
  messageBox.hidden = false;
}


function setSaving(isSaving) {
  saving = isSaving;

  saveButton.disabled = isSaving;

  saveButton.textContent = isSaving
    ? "Saving..."
    : "Save profile";

  profileForm.setAttribute(
    "aria-busy",
    String(isSaving)
  );
}


function setMenuOpen(isOpen) {
  dashboardMenu.hidden = !isOpen;

  menuButton.setAttribute(
    "aria-expanded",
    String(isOpen)
  );

  menuButton.setAttribute(
    "aria-label",
    isOpen
      ? "Close dashboard menu"
      : "Open dashboard menu"
  );
}


function setProfileOpen(isOpen) {
  profileDropdown.hidden = !isOpen;

  profileButton.setAttribute(
    "aria-expanded",
    String(isOpen)
  );
}


function closeAllMenus() {
  setMenuOpen(false);
  setProfileOpen(false);
}


function cleanText(value) {
  return value.trim();
}


function getRoleName(roles) {
  if (!Array.isArray(roles) || roles.length === 0) {
    return "Not set";
  }

  if (roles.includes("coach")) {
    return "Coach";
  }

  if (roles.includes("tournament_organiser")) {
    return "Tournament organiser";
  }

  if (roles.includes("player")) {
    return "Player";
  }

  return roles[0];
}


profileForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    if (
      !supabase ||
      !currentUserId ||
      saving
    ) {
      return;
    }

    const fullName =
      cleanText(fullNameInput.value);

    const county =
      cleanText(countyInput.value);

    const phone =
      cleanText(phoneInput.value);

    if (!profileForm.reportValidity()) {
      return;
    }

    messageBox.hidden = true;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          county: county,
          phone: phone
        })
        .eq("user_id", currentUserId);

      if (error) {
        showMessage(
          "Could not save your profile: " +
          error.message
        );

        return;
      }

      showMessage(
        "Profile saved successfully.",
        "success"
      );

      setTimeout(() => {
        window.location.replace(
          "profile.html"
        );
      }, 1200);
    } catch {
      showMessage(
        "Could not save your profile. Check your internet " +
        "connection and try again."
      );
    } finally {
      setSaving(false);
    }
  }
);


async function signOut() {
  if (!supabase) {
    return;
  }

  signOutButton.disabled = true;
  signOutButton.textContent = "Signing out...";

  try {
    const { error } =
      await supabase.auth.signOut();

    if (error) {
      signOutButton.disabled = false;
      signOutButton.textContent = "Sign out";
      return;
    }

    window.location.replace("../index.html");
  } catch {
    signOutButton.disabled = false;
    signOutButton.textContent = "Sign out";
  }
}


async function initialiseEditProfile() {
  if (
    window.location.protocol !== "http:" &&
    window.location.protocol !== "https:"
  ) {
    showMessage(
      "Open this page through a local web server, " +
      "not directly as a file."
    );

    return;
  }

  try {
    const connection = await import(
      "./config/supabase.js"
    );

    supabase = connection.supabase;

    if (!supabase) {
      throw new Error(
        "Supabase connection is missing."
      );
    }

    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (error || !user) {
      window.location.replace(
        "../auth/login.html"
      );

      return;
    }

    currentUserId = user.id;

    const { data, error: profileError } =
      await supabase
        .from("profiles")
        .select(
          "full_name, county, phone, roles"
        )
        .eq("user_id", currentUserId)
        .maybeSingle();

    if (profileError) {
      showMessage(
        "Could not load your profile. Check your connection " +
        "and try again."
      );
    }

    if (data) {
      fullNameInput.value =
        data.full_name || "";

      countyInput.value =
        data.county || "";

      phoneInput.value =
        data.phone || "";

      if (currentRoleInput) {
        currentRoleInput.value =
          getRoleName(data.roles);
      }
    }

    saveButton.disabled = false;

    menuButton.addEventListener(
      "click",
      () => {
        const isOpen =
          menuButton.getAttribute(
            "aria-expanded"
          ) === "true";

        setProfileOpen(false);
        setMenuOpen(!isOpen);
      }
    );

    profileButton.addEventListener(
      "click",
      () => {
        const isOpen =
          profileButton.getAttribute(
            "aria-expanded"
          ) === "true";

        setMenuOpen(false);
        setProfileOpen(!isOpen);
      }
    );

    document.addEventListener(
      "click",
      (event) => {
        const clickedInsideProfile =
          profileButton.contains(event.target) ||
          profileDropdown.contains(event.target);

        const clickedInsideMenu =
          menuButton.contains(event.target) ||
          dashboardMenu.contains(event.target);

        if (!clickedInsideProfile) {
          setProfileOpen(false);
        }

        if (!clickedInsideMenu) {
          setMenuOpen(false);
        }
      }
    );

    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape") {
          closeAllMenus();
        }
      }
    );

    if (signOutButton) {
      signOutButton.addEventListener(
        "click",
        signOut
      );
    }
  } catch {
    showMessage(
      "Could not load profile editing. Check your connection " +
      "and the project URL and publishable key in " +
      "js/config/supabase.js, then reload this page."
    );
  }
}


initialiseEditProfile();