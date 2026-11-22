"use strict";


const form =
  document.getElementById("login-form");


const emailInput =
  document.getElementById("email");


const passwordInput =
  document.getElementById("password");


const loginButton =
  document.getElementById("login-button");


const messageBox =
  document.getElementById("login-message");


let supabase = null;
let submitting = false;
let redirecting = false;


function showMessage(text, type = "error") {
  messageBox.textContent = text;
  messageBox.dataset.type = type;
  messageBox.hidden = false;
}


function setSubmitting(isSubmitting) {
  submitting = isSubmitting;

  loginButton.disabled =
    isSubmitting || redirecting;

  loginButton.textContent = isSubmitting
    ? "Signing in..."
    : "Sign in";

  form.setAttribute(
    "aria-busy",
    String(isSubmitting)
  );
}


function getConfirmationError() {
  const query = new URLSearchParams(
    window.location.search
  );

  const hash = new URLSearchParams(
    window.location.hash.slice(1)
  );

  return (
    query.has("error") ||
    query.has("error_code") ||
    query.has("error_description") ||
    hash.has("error") ||
    hash.has("error_code") ||
    hash.has("error_description")
  );
}


function getLoginError(error) {
  switch (error.code) {
    case "email_not_confirmed":
      return (
        "Confirm your email before signing in. " +
        "Check your inbox and spam folder for the confirmation link."
      );

    case "over_request_rate_limit":
      return (
        "Too many sign-in attempts. Please wait before trying again."
      );

    case "invalid_credentials":
      return (
        "Could not sign in with those details. " +
        "Check your email address and password."
      );

    default:
      return (
        "Could not sign in. Check your connection and account " +
        "details, then try again."
      );
  }
}


async function ensureProfile(user) {
  const selectedRole =
    user.user_metadata?.role;


  const allowedRoles = [
    "player",
    "coach",
    "tournament_organiser"
  ];


  const role = allowedRoles.includes(
    selectedRole
  )
    ? selectedRole
    : "player";


  const { data: profile, error } =
    await supabase
      .from("profiles")
      .select("roles")
      .eq("user_id", user.id)
      .maybeSingle();


  if (error) {
    throw error;
  }


  if (profile) {
    return profile;
  }


  const { data: newProfile, error: insertError } =
    await supabase
      .from("profiles")
      .insert({
        user_id: user.id,
        roles: [role]
      })
      .select("roles")
      .single();


  if (insertError) {
    throw insertError;
  }


  return newProfile;
}


async function openCorrectPage(user) {
  redirecting = true;
  loginButton.disabled = true;


  showMessage(
    "You are signed in. Opening your dashboard...",
    "success"
  );


  let profile = null;


  try {
    profile = await ensureProfile(user);
  } catch {
    window.location.replace(
      "../dashboard/home.html"
    );

    return;
  }


  const roles = Array.isArray(profile?.roles)
    ? profile.roles
    : [];


  if (roles.includes("coach")) {
    window.location.replace(
      "../dashboard/register-team.html"
    );

    return;
  }

  window.location.replace(
    "../dashboard/home.html"
  );
}


form.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();


    if (
      !supabase ||
      submitting ||
      redirecting
    ) {
      return;
    }


    emailInput.value =
      emailInput.value.trim();


    if (!form.reportValidity()) {
      return;
    }


    messageBox.hidden = true;
    setSubmitting(true);


    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: emailInput.value,
          password: passwordInput.value
        });


      if (error) {
        showMessage(
          getLoginError(error)
        );

        return;
      }


      if (!data.user || !data.session) {
        showMessage(
          "Sign-in could not be completed. Please try again."
        );

        return;
      }

      passwordInput.value = "";

      await openCorrectPage(data.user);
    } catch {
      showMessage(
        "Could not reach the sign-in service. " +
        "Check your internet connection and try again."
      );
    } finally {
      setSubmitting(false);
    }
  }
);


async function initialiseLogin() {
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


  const confirmationFailed =
    getConfirmationError();


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
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession();

    if (sessionError) {
      showMessage(
        "Your session could not be restored. " +
        "Try signing in again."
      );
    }


    if (session) {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (!userError && user) {
        await openCorrectPage(user);
        return;
      }

      showMessage(
        "Your previous session could not be verified. " +
        "Please sign in again."
      );
    }


    if (confirmationFailed) {
      showMessage(
        "The confirmation link could not be completed. " +
        "It may have expired or already been used. " +
        "If you have already confirmed your email, try signing in."
      );
    }


    loginButton.disabled = false;
  } catch {
    showMessage(
      "Could not load sign-in. Check your connection and " +
      "the project URL and publishable key in " +
      "js/config/supabase.js, then reload this page."
    );
  }
}


initialiseLogin();