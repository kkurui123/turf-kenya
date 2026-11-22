import { supabase } from "./config/supabase.js";

const teamsContainer =
  document.getElementById(
    "teams-container"
  );

const tournamentsContainer =
  document.getElementById(
    "tournaments-container"
  );

const googleSignInButton =
  document.getElementById(
    "google-sign-in-button"
  );

function createTeamCard(team) {
  const card =
    document.createElement("article");

  card.className = "card";

  const name =
    document.createElement("h3");

  name.textContent =
    team.name || "Unnamed team";

  const location =
    document.createElement("p");

  location.textContent =
    team.location ||
    "Location not provided";

  const status =
    document.createElement("span");

  status.className = "status";

  status.textContent =
    team.status || "Active";

  card.appendChild(name);
  card.appendChild(location);
  card.appendChild(status);

  return card;
}

function createTournamentCard(
  tournament
) {
  const card =
    document.createElement("article");

  card.className = "card";

  const name =
    document.createElement("h3");

  name.textContent =
    tournament.name ||
    "Unnamed tournament";

  const location =
    document.createElement("p");

  location.textContent =
    tournament.location ||
    "Location not provided";

  const startDate =
    document.createElement("p");

  startDate.textContent =
    tournament.start_date
      ? "Starts: " +
        tournament.start_date
      : "Start date not provided";

  card.appendChild(name);
  card.appendChild(location);
  card.appendChild(startDate);

  return card;
}

function showMessage(
  container,
  message
) {
  container.innerHTML = "";

  const messageElement =
    document.createElement("p");

  messageElement.className =
    "empty-message";

  messageElement.textContent =
    message;

  container.appendChild(
    messageElement
  );
}

async function loadTeams() {
  try {
    const { data, error } =
      await supabase
        .from("teams")
        .select("*")
        .eq("status", "active")
        .order("created_at", {
          ascending: false
        })
        .limit(6);

    if (error) {
      console.error(error);

      showMessage(
        teamsContainer,
        "Could not load teams."
      );

      return;
    }

    if (!data || data.length === 0) {
      showMessage(
        teamsContainer,
        "No teams available yet."
      );

      return;
    }

    teamsContainer.innerHTML = "";

    data.forEach(function (team) {
      teamsContainer.appendChild(
        createTeamCard(team)
      );
    });
  } catch (error) {
    console.error(error);

    showMessage(
      teamsContainer,
      "Could not load teams."
    );
  }
}

async function loadTournaments() {
  try {
    const { data, error } =
      await supabase
        .from("tournaments")
        .select("*")
        .order("created_at", {
          ascending: false
        })
        .limit(6);

    if (error) {
      console.error(error);

      showMessage(
        tournamentsContainer,
        "Could not load tournaments."
      );

      return;
    }

    if (
      !data ||
      data.length === 0
    ) {
      showMessage(
        tournamentsContainer,
        "No tournaments available yet."
      );

      return;
    }

    tournamentsContainer.innerHTML =
      "";

    data.forEach(function (
      tournament
    ) {
      tournamentsContainer.appendChild(
        createTournamentCard(
          tournament
        )
      );
    });
  } catch (error) {
    console.error(error);

    showMessage(
      tournamentsContainer,
      "Could not load tournaments."
    );
  }
}

async function signInWithGoogle() {
  try {
    const { error } =
      await supabase.auth
        .signInWithOAuth({
          provider: "google",
          options: {
            redirectTo:
              window.location.origin +
              "/dashboard/home.html"
          }
        });

    if (error) {
      console.error(error);

      alert(
        "Could not sign in with Google: " +
        error.message
      );
    }
  } catch (error) {
    console.error(error);

    alert(
      "Could not sign in with Google."
    );
  }
}

async function initialiseHome() {
  await loadTeams();

  await loadTournaments();
}

if (googleSignInButton) {
  googleSignInButton.addEventListener(
    "click",
    signInWithGoogle
  );
}

initialiseHome();