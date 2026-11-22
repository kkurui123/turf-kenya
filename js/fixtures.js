"use strict";


const menuButton =
  document.getElementById("menu-button");

const dashboardMenu =
  document.getElementById("dashboard-menu");

const profileButton =
  document.getElementById("profile-button");

const profileDropdown =
  document.getElementById("profile-dropdown");

const fixturesContainer =
  document.getElementById("fixtures-container");

const fixturesMessage =
  document.getElementById("fixtures-message");

const createFixtureSection =
  document.getElementById("create-fixture-section");

const signOutButton =
  document.getElementById("sign-out-button");


let supabase = null;
let currentUserId = null;
let currentRoles = [];
let selectedTournament = null;


function showMessage(text, type = "error") {
  fixturesMessage.textContent = text;
  fixturesMessage.dataset.type = type;
  fixturesMessage.hidden = false;
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


function isOrganiser() {
  return currentRoles.includes(
    "tournament_organiser"
  );
}


function isTournamentOwner(tournament) {
  return (
    isOrganiser() &&
    tournament.created_by === currentUserId
  );
}


function formatDate(value) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(
    "en-KE",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}


function createButton(
  text,
  className,
  clickHandler
) {
  const button =
    document.createElement("button");

  button.type = "button";
  button.className = className;
  button.textContent = text;

  button.addEventListener(
    "click",
    clickHandler
  );

  return button;
}


async function signOut() {
  await supabase.auth.signOut();

  window.location.replace(
    "../auth/login.html"
  );
}


function createTournamentCard(tournament) {
  const tournamentCard =
    document.createElement("article");

  tournamentCard.className =
    "tournament-card";

  const tournamentTitle =
    document.createElement("h2");

  tournamentTitle.textContent =
    tournament.name || "Untitled tournament";

  const tournamentStatus =
    document.createElement("span");

  tournamentStatus.className =
    "tournament-status";

  tournamentStatus.textContent =
    tournament.status || "draft";

  const tournamentLocation =
    document.createElement("p");

  tournamentLocation.textContent =
    "Location: " +
    (tournament.location || "Not set");

  const tournamentDates =
    document.createElement("p");

  tournamentDates.textContent =
    "Dates: " +
    formatDate(tournament.start_date) +
    " to " +
    formatDate(tournament.end_date);

  tournamentCard.appendChild(tournamentTitle);
  tournamentCard.appendChild(tournamentStatus);
  tournamentCard.appendChild(tournamentLocation);
  tournamentCard.appendChild(tournamentDates);

  if (tournament.description) {
    const tournamentDescription =
      document.createElement("p");

    tournamentDescription.textContent =
      tournament.description;

    tournamentCard.appendChild(
      tournamentDescription
    );
  }

  const tournamentActions =
    document.createElement("div");

  tournamentActions.className =
    "home-actions";

  const viewFixturesButton =
    createButton(
      "View fixtures",
      "btn btn-primary",
      () => openTournamentFixtures(tournament)
    );

  tournamentActions.appendChild(
    viewFixturesButton
  );

  if (isTournamentOwner(tournament)) {
    const createFixtureButton =
      createButton(
        "Create fixture",
        "btn btn-primary",
        () => createFixture(tournament)
      );

    tournamentActions.appendChild(
      createFixtureButton
    );
  }

  tournamentCard.appendChild(
    tournamentActions
  );

  return tournamentCard;
}


function showTournaments(tournaments) {
  fixturesContainer.textContent = "";

  if (!tournaments || tournaments.length === 0) {
    const emptyMessage =
      document.createElement("p");

    emptyMessage.textContent =
      "No tournaments have been created yet.";

    fixturesContainer.appendChild(
      emptyMessage
    );

    return;
  }

  tournaments.forEach((tournament) => {
    const tournamentCard =
      createTournamentCard(tournament);

    fixturesContainer.appendChild(
      tournamentCard
    );
  });
}


function createFixtureRow(fixture) {
  const fixtureRow =
    document.createElement("article");

  fixtureRow.className = "fixture-card";

  const poolLabel =
    document.createElement("p");

  poolLabel.className = "fixture-pool";

  poolLabel.textContent =
    "Pool " + (fixture.pool || "A");

  const matchTitle =
    document.createElement("h3");

  matchTitle.textContent =
    (fixture.home_team?.name || "Home team") +
    " vs " +
    (fixture.away_team?.name || "Away team");

  const matchDate =
    document.createElement("p");

  matchDate.textContent =
    "Date: " + formatDate(fixture.match_date);

  const matchVenue =
    document.createElement("p");

  matchVenue.textContent =
    "Venue: " + (fixture.venue || "Not set");

  const matchStatus =
    document.createElement("p");

  matchStatus.textContent =
    "Status: " + (fixture.status || "scheduled");

  const matchScore =
    document.createElement("p");

  matchScore.textContent =
    "Score: " +
    (fixture.home_score ?? "-") +
    " - " +
    (fixture.away_score ?? "-");

  fixtureRow.appendChild(poolLabel);
  fixtureRow.appendChild(matchTitle);
  fixtureRow.appendChild(matchDate);
  fixtureRow.appendChild(matchVenue);
  fixtureRow.appendChild(matchStatus);
  fixtureRow.appendChild(matchScore);

  if (isTournamentOwner(selectedTournament)) {
    const fixtureActions =
      document.createElement("div");

    fixtureActions.className =
      "home-actions";

    const resultButton =
      createButton(
        fixture.status === "completed"
          ? "Edit result"
          : "Record result",
        "btn btn-primary",
        () => recordResult(fixture)
      );

    const deleteButton =
      createButton(
        "Delete fixture",
        "btn btn-primary",
        () => deleteFixture(fixture)
      );

    fixtureActions.appendChild(resultButton);
    fixtureActions.appendChild(deleteButton);
    fixtureRow.appendChild(fixtureActions);
  }

  return fixtureRow;
}


function showFixtures(fixtures) {
  fixturesContainer.textContent = "";

  const backButton =
    createButton(
      "Back to tournaments",
      "btn btn-primary",
      () => {
        selectedTournament = null;
        loadTournaments();
      }
    );

  fixturesContainer.appendChild(backButton);

  const tournamentTitle =
    document.createElement("h2");

  tournamentTitle.textContent =
    selectedTournament.name;

  fixturesContainer.appendChild(
    tournamentTitle
  );

  if (!fixtures || fixtures.length === 0) {
    const emptyMessage =
      document.createElement("p");

    emptyMessage.textContent =
      "No fixtures have been created for this tournament yet.";

    fixturesContainer.appendChild(
      emptyMessage
    );

    return;
  }

  const pools = {};

  fixtures.forEach((fixture) => {
    const poolName =
      fixture.pool || "A";

    if (!pools[poolName]) {
      pools[poolName] = [];
    }

    pools[poolName].push(fixture);
  });

  Object.keys(pools)
    .sort()
    .forEach((poolName) => {
      const poolHeading =
        document.createElement("h3");

      poolHeading.textContent =
        "Pool " + poolName;

      fixturesContainer.appendChild(
        poolHeading
      );

      pools[poolName].forEach((fixture) => {
        const fixtureRow =
          createFixtureRow(fixture);

        fixturesContainer.appendChild(
          fixtureRow
        );
      });
    });
}


async function loadTournaments() {
  try {
    const { data, error } = await supabase
      .from("tournaments")
      .select(
        "id, name, description, location, start_date, end_date, status, created_by"
      )
      .order("id", {
        ascending: false
      });

    if (error) {
      showMessage(
        "Could not load tournaments: " +
        error.message
      );

      return;
    }

    showTournaments(data);
  } catch (error) {
    showMessage(
      "Could not load tournaments: " +
      (error?.message || String(error))
    );
  }
}


async function loadTournamentFixtures(
  tournament
) {
  try {
    const { data, error } = await supabase
      .from("fixtures")
      .select(
        "id, pool, match_date, venue, status, home_score, away_score, home_team_id, away_team_id, home_team:teams!fixtures_home_team_id_fkey(id, name), away_team:teams!fixtures_away_team_id_fkey(id, name)"
      )
      .eq(
        "tournament_id",
        tournament.id
      )
      .order("pool", {
        ascending: true
      })
      .order("match_date", {
        ascending: true
      });

    if (error) {
      showMessage(
        "Could not load fixtures: " +
        error.message
      );

      return;
    }

    showFixtures(data);
  } catch (error) {
    showMessage(
      "Could not load fixtures: " +
      (error?.message || String(error))
    );
  }
}


async function openTournamentFixtures(
  tournament
) {
  selectedTournament = tournament;

  await loadTournamentFixtures(tournament);
}


async function createFixture(tournament) {
  const { data: teams, error } = await supabase
    .from("team_applications")
    .select(
      "team_id, teams (id, name)"
    )
    .eq(
      "tournament_id",
      tournament.id
    );

  if (error) {
    showMessage(
      "Could not load tournament teams: " +
      error.message
    );

    return;
  }

  const tournamentTeams = (teams || [])
    .map((application) => application.teams)
    .filter(Boolean);

  if (tournamentTeams.length < 2) {
    showMessage(
      "At least two teams must be registered before creating a fixture."
    );

    return;
  }

  const teamNames = tournamentTeams.map(
    (team) => team.name
  );

  const homeTeamName = window.prompt(
    "Choose the home team:\n\n" +
    teamNames.join("\n")
  );

  if (!homeTeamName) {
    return;
  }

  const homeTeam = tournamentTeams.find(
    (team) => team.name === homeTeamName
  );

  if (!homeTeam) {
    showMessage(
      "Choose one of the teams in this tournament."
    );

    return;
  }

  const awayTeamName = window.prompt(
    "Choose the away team:\n\n" +
    teamNames.join("\n")
  );

  if (!awayTeamName) {
    return;
  }

  const awayTeam = tournamentTeams.find(
    (team) => team.name === awayTeamName
  );

  if (!awayTeam) {
    showMessage(
      "Choose one of the teams in this tournament."
    );

    return;
  }

  if (homeTeam.id === awayTeam.id) {
    showMessage(
      "Choose two different teams."
    );

    return;
  }

  const pool = window.prompt(
    "Enter the pool:\n\nA\nB\nC\nD"
  );

  if (!pool) {
    return;
  }

  const cleanPool =
    pool.trim().toUpperCase();

  const matchDate = window.prompt(
    "Enter the match date and time:\n\nFor example: 2026-12-01 15:00"
  );

  if (!matchDate) {
    return;
  }

  const venue = window.prompt(
    "Enter the venue:"
  );

  if (!venue) {
    return;
  }

  const { error: fixtureError } = await supabase
    .from("fixtures")
    .insert({
      tournament_id: tournament.id,
      home_team_id: homeTeam.id,
      away_team_id: awayTeam.id,
      pool: cleanPool,
      match_date: new Date(matchDate).toISOString(),
      venue: venue.trim(),
      status: "scheduled",
      created_by: currentUserId
    });

  if (fixtureError) {
    showMessage(
      "Could not create the fixture: " +
      fixtureError.message
    );

    return;
  }

  showMessage(
    "Fixture created successfully.",
    "success"
  );

  await loadTournamentFixtures(tournament);
}


async function recordResult(fixture) {
  const homeScore = window.prompt(
    "Enter " +
    (fixture.home_team?.name || "home team") +
    " score:"
  );

  if (homeScore === null) {
    return;
  }

  const awayScore = window.prompt(
    "Enter " +
    (fixture.away_team?.name || "away team") +
    " score:"
  );

  if (awayScore === null) {
    return;
  }

  const cleanHomeScore =
    Number(homeScore);

  const cleanAwayScore =
    Number(awayScore);

  if (
    !Number.isInteger(cleanHomeScore) ||
    !Number.isInteger(cleanAwayScore) ||
    cleanHomeScore < 0 ||
    cleanAwayScore < 0
  ) {
    showMessage(
      "Enter valid whole-number scores."
    );

    return;
  }

  const { error } = await supabase
    .from("fixtures")
    .update({
      home_score: cleanHomeScore,
      away_score: cleanAwayScore,
      status: "completed"
    })
    .eq("id", fixture.id)
    .eq("created_by", currentUserId);

  if (error) {
    showMessage(
      "Could not save the result: " +
      error.message
    );

    return;
  }

  showMessage(
    "Result saved successfully.",
    "success"
  );

  await loadTournamentFixtures(
    selectedTournament
  );
}


async function deleteFixture(fixture) {
  const confirmDelete = window.confirm(
    "Delete this fixture? This cannot be undone."
  );

  if (!confirmDelete) {
    return;
  }

  const { error } = await supabase
    .from("fixtures")
    .delete()
    .eq("id", fixture.id)
    .eq("created_by", currentUserId);

  if (error) {
    showMessage(
      "Could not delete the fixture: " +
      error.message
    );

    return;
  }

  showMessage(
    "Fixture deleted successfully.",
    "success"
  );

  await loadTournamentFixtures(
    selectedTournament
  );
}


async function loadUserProfile() {
  const { data: profile, error } =
    await supabase
      .from("profiles")
      .select("roles")
      .eq("user_id", currentUserId)
      .maybeSingle();

  if (error) {
    showMessage(
      "Could not load your profile role: " +
      error.message
    );

    return;
  }

  currentRoles = Array.isArray(profile?.roles)
    ? profile.roles
    : [];

  if (isOrganiser()) {
    createFixtureSection.hidden = false;
  }
}


async function initialiseFixtures() {
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

    await loadUserProfile();

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

    await loadTournaments();
  } catch (error) {
    console.error(error);

    showMessage(
      "Could not load fixtures: " +
      (error?.message || String(error))
    );
  }
}


initialiseFixtures();