"use strict";


const registerTeamForm =
  document.getElementById("register-team-form");

const teamNameInput =
  document.getElementById("team-name");

const teamCountyInput =
  document.getElementById("team-county");

const teamDescriptionInput =
  document.getElementById("team-description");

const registerTeamButton =
  document.getElementById("register-team-button");

const registerTeamMessage =
  document.getElementById("register-team-message");


let supabase = null;
let currentUserId = null;
let registering = false;


function showMessage(text, type = "error") {
  registerTeamMessage.textContent = text;
  registerTeamMessage.dataset.type = type;
  registerTeamMessage.hidden = false;
}


function setRegistering(isRegistering) {
  registering = isRegistering;

  registerTeamButton.disabled = isRegistering;

  registerTeamButton.textContent = isRegistering
    ? "Registering team..."
    : "Register team";

  registerTeamForm.setAttribute(
    "aria-busy",
    String(isRegistering)
  );
}


function cleanText(value) {
  return value.trim();
}


async function checkExistingTeam() {
  const { data, error } = await supabase
    .from("teams")
    .select("id, name")
    .eq("coach_id", currentUserId)
    .maybeSingle();

  if (error) {
    showMessage(
      "Could not check your existing team: " +
      error.message
    );

    return true;
  }

  if (data) {
    showMessage(
      "You have already created a team: " +
      data.name +
      ". Each coach can create only one team."
    );

    registerTeamForm.hidden = true;

    return true;
  }

  return false;
}


registerTeamForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    if (
      !supabase ||
      !currentUserId ||
      registering
    ) {
      return;
    }

    if (!registerTeamForm.reportValidity()) {
      return;
    }

    const teamName =
      cleanText(teamNameInput.value);

    const teamCounty =
      teamCountyInput.value;

    const teamDescription =
      cleanText(teamDescriptionInput.value);

    if (!teamName) {
      showMessage(
        "Enter your team name."
      );

      return;
    }

    if (!teamCounty) {
      showMessage(
        "Choose your county."
      );

      return;
    }

    registerTeamMessage.hidden = true;
    setRegistering(true);

    try {
      const hasTeam =
        await checkExistingTeam();

      if (hasTeam) {
        return;
      }

      const { error } = await supabase
        .from("teams")
        .insert({
          coach_id: currentUserId,
          name: teamName,
          county: teamCounty,
          description: teamDescription,
          status: "active",
          created_by: currentUserId
        });

      if (error) {
        if (
          error.code === "23505" ||
          error.message.includes(
            "one_team_per_coach"
          )
        ) {
          showMessage(
            "You have already created a team. Each coach can create only one team."
          );

          return;
        }

        showMessage(
          "Could not register the team: " +
          error.message
        );

        return;
      }

      showMessage(
        "Team registered successfully.",
        "success"
      );

      registerTeamForm.reset();

      setTimeout(() => {
        window.location.replace(
          "teams.html"
        );
      }, 1200);
    } catch (caughtError) {
      showMessage(
        "Could not register the team: " +
        (caughtError.message ||
        "Unexpected error.")
      );
    } finally {
      setRegistering(false);
    }
  }
);


async function initialiseRegisterTeam() {
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
      "../js/config/supabase.js"
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

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("roles")
        .eq("user_id", currentUserId)
        .maybeSingle();

    if (profileError) {
      showMessage(
        "Could not check your coach role: " +
        profileError.message
      );

      return;
    }

    const roles = Array.isArray(profile?.roles)
      ? profile.roles
      : [];

    if (!roles.includes("coach")) {
      showMessage(
        "Only coaches can register teams."
      );

      registerTeamForm.hidden = true;

      return;
    }

    await checkExistingTeam();
  } catch (caughtError) {
    showMessage(
      "Could not load team registration: " +
      (caughtError.message ||
      "Unexpected error.")
    );
  }
}


initialiseRegisterTeam();