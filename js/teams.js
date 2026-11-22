"use strict";


const teamsContainer =
  document.getElementById("teams-container");


const teamsMessage =
  document.getElementById("teams-message");


let supabase = null;
let currentUserId = null;
let currentRoles = [];
let myTeams = [];


function showMessage(text, type = "error") {
  teamsMessage.textContent = text;
  teamsMessage.dataset.type = type;
  teamsMessage.hidden = false;
}


function hideMessage() {
  teamsMessage.hidden = true;
}


function cleanText(value) {
  return value.trim();
}


function isCoach() {
  return currentRoles.includes("coach");
}


function isTeamOwner(team) {
  return team.coach_id === currentUserId;
}


function createButton(
  text,
  className,
  clickHandler
) {
  const button =
    document.createElement("button");

  button.type = "button";
  button.className = "team-button " + className;
  button.textContent = text;

  button.addEventListener(
    "click",
    clickHandler
  );

  return button;
}


function createTeamCard(team) {
  const teamCard =
    document.createElement("article");

  teamCard.className = "team-card";
  teamCard.dataset.teamId = team.id;

  const teamTop =
    document.createElement("div");

  teamTop.className = "team-card-top";

  const teamDetails =
    document.createElement("div");

  const teamName =
    document.createElement("h2");

  teamName.className = "team-name";
  teamName.textContent =
    team.name || "Unnamed team";

  const teamCounty =
    document.createElement("p");

  teamCounty.className = "team-county";
  teamCounty.textContent =
    "County: " + (team.county || "Not set");

  teamDetails.appendChild(teamName);
  teamDetails.appendChild(teamCounty);

  const teamStatus =
    document.createElement("span");

  const teamStatusText =
    team.status === "suspended"
      ? "Suspended"
      : "Active";

  teamStatus.className =
    "team-status team-status-" + team.status;

  teamStatus.textContent = teamStatusText;

  teamTop.appendChild(teamDetails);
  teamTop.appendChild(teamStatus);
  teamCard.appendChild(teamTop);

  if (team.description) {
    const teamDescription =
      document.createElement("p");

    teamDescription.className =
      "team-description";

    teamDescription.textContent =
      team.description;

    teamCard.appendChild(teamDescription);
  }

  if (isTeamOwner(team)) {
    const ownerLabel =
      document.createElement("p");

    ownerLabel.className = "team-owner-label";
    ownerLabel.textContent =
      "You are the coach of this team.";

    teamCard.appendChild(ownerLabel);
  }

  const teamActions =
    document.createElement("div");

  teamActions.className = "team-actions";

  if (isTeamOwner(team)) {
    const suspendButton =
      createButton(
        team.status === "suspended"
          ? "Activate team"
          : "Suspend team",
        team.status === "suspended"
          ? "team-button-success"
          : "team-button-warning",
        () => toggleTeamStatus(team)
      );

    const deleteButton =
      createButton(
        "Delete team",
        "team-button-danger",
        () => deleteTeam(team)
      );

    teamActions.appendChild(suspendButton);
    teamActions.appendChild(deleteButton);
  } else if (isCoach()) {
    const inviteButton =
      createButton(
        "Invite to match",
        "team-button-primary",
        () => inviteTeamToMatch(team)
      );

    teamActions.appendChild(inviteButton);
  } else {
    const joinButton =
      createButton(
        "Join team",
        "team-button-primary",
        () => joinTeam(team)
      );

    teamActions.appendChild(joinButton);
  }

  if (teamActions.children.length > 0) {
    teamCard.appendChild(teamActions);
  }

  return teamCard;
}


function showTeams(teams) {
  teamsContainer.textContent = "";

  if (!teams || teams.length === 0) {
    const emptyMessage =
      document.createElement("p");

    emptyMessage.textContent =
      "No teams have been registered yet.";

    teamsContainer.appendChild(emptyMessage);
    return;
  }

  teams.forEach((team) => {
    const teamCard =
      createTeamCard(team);

    teamsContainer.appendChild(teamCard);
  });
}


async function loadTeams() {
  try {
    const { data, error } = await supabase
      .from("teams")
      .select(
        "id, name, county, description, status, coach_id, created_at"
      )
      .order("created_at", {
        ascending: false
      });

    if (error) {
      showMessage(
        "Could not load teams: " +
        error.message
      );

      return;
    }

    showTeams(data);
  } catch (caughtError) {
    showMessage(
      "Could not load teams: " +
      (caughtError.message || "Unexpected error.")
    );
  }
}


async function joinTeam(team) {
  try {
    const { error } = await supabase
      .from("team_members")
      .insert({
        team_id: team.id,
        user_id: currentUserId,
        role: "player",
        status: "active",
        created_by: currentUserId
      });

    if (error) {
      showMessage(
        "Could not join the team: " +
        error.message
      );

      return;
    }

    showMessage(
      "You joined " + team.name + " as a player.",
      "success"
    );

    await loadTeams();
  } catch (caughtError) {
    showMessage(
      "Could not join the team: " +
      (caughtError.message || "Unexpected error.")
    );
  }
}


async function toggleTeamStatus(team) {
  try {
    const nextStatus =
      team.status === "suspended"
        ? "active"
        : "suspended";

    const { error } = await supabase
      .from("teams")
      .update({
        status: nextStatus
      })
      .eq("id", team.id)
      .eq("coach_id", currentUserId);

    if (error) {
      showMessage(
        "Could not update the team: " +
        error.message
      );

      return;
    }

    showMessage(
      nextStatus === "suspended"
        ? "Team suspended."
        : "Team activated.",
      "success"
    );

    await loadTeams();
  } catch (caughtError) {
    showMessage(
      "Could not update the team: " +
      (caughtError.message || "Unexpected error.")
    );
  }
}


async function deleteTeam(team) {
  const confirmed = window.confirm(
    "Delete " + team.name + "? This cannot be undone."
  );

  if (!confirmed) {
    return;
  }

  try {
    const { error } = await supabase
      .from("teams")
      .delete()
      .eq("id", team.id)
      .eq("coach_id", currentUserId);

    if (error) {
      showMessage(
        "Could not delete the team: " +
        error.message
      );

      return;
    }

    showMessage(
      "Team deleted.",
      "success"
    );

    await loadTeams();
  } catch (caughtError) {
    showMessage(
      "Could not delete the team: " +
      (caughtError.message || "Unexpected error.")
    );
  }
}


async function inviteTeamToMatch(team) {
  if (myTeams.length === 0) {
    showMessage(
      "Register a team before inviting another team to a match."
    );

    return;
  }

  const teamNames = myTeams.map(
    (myTeam) => myTeam.name
  );

  const selectedTeamName = window.prompt(
    "Choose your team:\n\n" +
    teamNames.join("\n")
  );

  if (!selectedTeamName) {
    return;
  }

  const selectedTeam = myTeams.find(
    (myTeam) =>
      myTeam.name === selectedTeamName
  );

  if (!selectedTeam) {
    showMessage(
      "Choose one of your own teams."
    );

    return;
  }

  const invitationMessage = window.prompt(
    "Write an invitation message:"
  );

  if (!invitationMessage) {
    return;
  }

  try {
    const { error } = await supabase
      .from("match_invitations")
      .insert({
        from_coach_id: currentUserId,
        from_team_id: selectedTeam.id,
        to_team_id: team.id,
        message: cleanText(invitationMessage),
        status: "pending"
      });

    if (error) {
      showMessage(
        "Could not send the invitation: " +
        error.message
      );

      return;
    }

    showMessage(
      "Match invitation sent to " + team.name + ".",
      "success"
    );
  } catch (caughtError) {
    showMessage(
      "Could not send the invitation: " +
      (caughtError.message || "Unexpected error.")
    );
  }
}


async function loadMyTeams() {
  if (!isCoach()) {
    myTeams = [];
    return;
  }

  const { data, error } = await supabase
    .from("teams")
    .select("id, name")
    .eq("coach_id", currentUserId);

  if (error) {
    myTeams = [];
    return;
  }

  myTeams = data || [];
}


async function initialiseTeams() {
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
        "Could not check your role."
      );

      return;
    }

    currentRoles = Array.isArray(profile?.roles)
      ? profile.roles
      : [];

    await loadMyTeams();
    await loadTeams();
  } catch (caughtError) {
    showMessage(
      "Could not load teams: " +
      (caughtError.message || "Unexpected error.")
    );
  }
}


initialiseTeams();