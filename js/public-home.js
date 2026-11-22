"use strict";


const teamsContainer =
  document.getElementById("teams-container");

const tournamentsContainer =
  document.getElementById("tournaments-container");


let supabase = null;


function showMessage(
  container,
  text
) {
  container.textContent = "";

  const message =
    document.createElement("p");

  message.className = "loading-text";
  message.textContent = text;

  container.appendChild(message);
}


function createTeamCard(team) {
  const teamCard =
    document.createElement("article");

  teamCard.className = "home-card";

  const teamName =
    document.createElement("h3");

  teamName.textContent =
    team.name || "Unnamed team";

  const teamCounty =
    document.createElement("p");

  teamCounty.textContent =
    "County: " +
    (team.county || "Not set");

  const teamStatus =
    document.createElement("span");

  teamStatus.className = "card-tag";
  teamStatus.textContent =
    team.status || "active";

  teamCard.appendChild(teamName);
  teamCard.appendChild(teamCounty);
  teamCard.appendChild(teamStatus);

  if (team.description) {
    const teamDescription =
      document.createElement("p");

    teamDescription.textContent =
      team.description;

    teamCard.appendChild(
      teamDescription
    );
  }

  return teamCard;
}


function createTournamentCard(
  tournament
) {
  const tournamentCard =
    document.createElement("article");

  tournamentCard.className = "home-card";

  const tournamentName =
    document.createElement("h3");

  tournamentName.textContent =
    tournament.name ||
    "Untitled tournament";

  const tournamentLocation =
    document.createElement("p");

  tournamentLocation.textContent =
    "Location: " +
    (tournament.location || "Not set");

  const tournamentStatus =
    document.createElement("span");

  tournamentStatus.className = "card-tag";
  tournamentStatus.textContent =
    tournament.status || "draft";

  tournamentCard.appendChild(
    tournamentName
  );

  tournamentCard.appendChild(
    tournamentLocation
  );

  tournamentCard.appendChild(
    tournamentStatus
  );

  if (tournament.description) {
    const tournamentDescription =
      document.createElement("p");

    tournamentDescription.textContent =
      tournament.description;

    tournamentCard.appendChild(
      tournamentDescription
    );
  }

  return tournamentCard;
}


async function loadTeams() {
  try {
    const { data, error } = await supabase
      .from("teams")
      .select(
        "id, name, county, description, status"
      )
      .eq("status", "active")
      .order("id", {
        ascending: false
      })
      .limit(6);

    if (error) {
      showMessage(
        teamsContainer,
        "Could not load teams: " +
        error.message
      );

      return;
    }

    teamsContainer.textContent = "";

    if (!data || data.length === 0) {
      showMessage(
        teamsContainer,
        "No active teams available yet."
      );

      return;
    }

    data.forEach((team) => {
      const teamCard =
        createTeamCard(team);

      teamsContainer.appendChild(
        teamCard
      );
    });
  } catch (error) {
    showMessage(
      teamsContainer,
      "Could not load teams: " +
      (error?.message || String(error))
    );
  }
}


async function loadTournaments() {
  try {
    const { data, error } = await supabase
      .from("tournaments")
      .select(
        "id, name, location, description, status"
      )
      .order("id", {
        ascending: false
      })
      .limit(6);

    if (error) {
      showMessage(
        tournamentsContainer,
        "Could not load tournaments: " +
        error.message
      );

      return;
    }

    tournamentsContainer.textContent = "";

    if (!data || data.length === 0) {
      showMessage(
        tournamentsContainer,
        "No tournaments available yet."
      );

      return;
    }

    data.forEach((tournament) => {
      const tournamentCard =
        createTournamentCard(tournament);

      tournamentsContainer.appendChild(
        tournamentCard
      );
    });
  } catch (error) {
    showMessage(
      tournamentsContainer,
      "Could not load tournaments: " +
      (error?.message || String(error))
    );
  }
}


async function initialiseHome() {
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

    await loadTeams();
    await loadTournaments();
  } catch (error) {
    console.error(error);

    showMessage(
      teamsContainer,
      "Could not load teams: " +
      (error?.message || String(error))
    );

    showMessage(
      tournamentsContainer,
      "Could not load tournaments: " +
      (error?.message || String(error))
    );
  }
}


initialiseHome();