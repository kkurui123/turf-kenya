"use strict";


const registerTeamLink =
  document.getElementById("register-team-link");


let supabase = null;


async function updateNavigation() {
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
      return;
    }

    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (error || !user) {
      if (registerTeamLink) {
        registerTeamLink.hidden = true;
      }

      return;
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("roles")
        .eq("user_id", user.id)
        .maybeSingle();

    if (profileError || !profile) {
      if (registerTeamLink) {
        registerTeamLink.hidden = true;
      }

      return;
    }

    const roles = Array.isArray(profile.roles)
      ? profile.roles
      : [];

    const isCoach =
      roles.includes("coach");

    if (registerTeamLink) {
      registerTeamLink.hidden = !isCoach;
    }
  } catch {
    if (registerTeamLink) {
      registerTeamLink.hidden = true;
    }
  }
}


updateNavigation();