"use strict";


const menuButton =
  document.getElementById("menu-button");

const dashboardMenu =
  document.getElementById("dashboard-menu");

const profileButton =
  document.getElementById("profile-button");

const profileDropdown =
  document.getElementById("profile-dropdown");

const profileEmail =
  document.getElementById("profile-email");

const profileStatus =
  document.getElementById("profile-status");

const profileMemberDate =
  document.getElementById("profile-member-date");

const registerTeamCard =
  document.getElementById("register-team-card");

const createTournamentCard =
  document.getElementById("create-tournament-card");

const signOutButton =
  document.getElementById("sign-out-button");


let supabase = null;


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


function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString(
    "en-KE",
    {
      day: "numeric",
      month: "long",
      year: "numeric"
    }
  );
}


function showProfileDetails(user) {
  if (profileEmail) {
    profileEmail.textContent =
      user.email || "Not available";
  }

  if (profileStatus) {
    profileStatus.textContent =
      user.email_confirmed_at
        ? "Confirmed"
        : "Awaiting email confirmation";
  }

  if (profileMemberDate) {
    profileMemberDate.textContent =
      formatDate(user.created_at);
  }
}


async function updateRoleCards(userId) {
  const { data: profile, error } =
    await supabase
      .from("profiles")
      .select("roles")
      .eq("user_id", userId)
      .maybeSingle();

  const roles = Array.isArray(profile?.roles)
    ? profile.roles
    : [];

  const isCoach =
    roles.includes("coach");

  const isOrganiser =
    roles.includes("tournament_organiser");

  if (registerTeamCard) {
    registerTeamCard.hidden = !isCoach;
  }

  if (createTournamentCard) {
    createTournamentCard.hidden = !isOrganiser;
  }
}


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


async function initialiseHome() {
  if (
    window.location.protocol !== "http:" &&
    window.location.protocol !== "https:"
  ) {
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

    showProfileDetails(user);
    await updateRoleCards(user.id);

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
    if (profileEmail) {
      profileEmail.textContent =
        "Could not load";
    }

    if (profileStatus) {
      profileStatus.textContent =
        "Could not load";
    }

    if (profileMemberDate) {
      profileMemberDate.textContent =
        "Could not load";
    }
  }
}


initialiseHome();