"use strict";


const menuButton =
  document.getElementById("menu-button");

const dashboardMenu =
  document.getElementById("dashboard-menu");

const profileButton =
  document.getElementById("profile-button");

const profileDropdown =
  document.getElementById("profile-dropdown");

const createFixtureMessage =
  document.getElementById("create-fixture-message");

const createFixtureForm =
  document.getElementById("create-fixture-form");

const tournamentSelect =
  document.getElementById("tournament-select");

const homeTeamSelect =
  document.getElementById("home-team-select");

const awayTeamSelect =
  document.getElementById("away-team-select");

const poolSelect =
  document.getElementById("pool-select");

const matchDateInput =
  document.getElementById("match-date");

const venueInput =
  document.getElementById("venue");

const signOutButton =
  document.getElementById("sign-out-button");


let supabase = null;
let currentUserId = null;
let currentRoles = [];
let myTournaments = [];
let selectedTournamentTeams = [];


function showMessage(text, type = "error") {
  createFixtureMessage.textContent = text;
  createFixtureMessage.dataset.type = type;
  createFixtureMessage.hidden = false;
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


async function signOut() {
  await supabase.auth.signOut();

  window.location.replace(
    "../auth/login.html"
  );
}


function clearTeamSelects() {
  homeTeamSelect.textContent = "";
  awayTeamSelect.textContent = "";

  const homeOption =
    document.createElement("option");

  homeOption.value = "";
  homeOption.textContent =
    "Choose a tournament first";

  const awayOption =
    document.createElement("option");

  awayOption.value = "";
  awayOption.textContent =
    "Choose a tournament first";

  homeTeamSelect.appendChild(homeOption);
  awayTeamSelect.appendChild(awayOption);

  homeTeamSelect.disabled = true;
  awayTeamSelect.disabled = true;
}


function fillTeamSelects(teams) {
  homeTeamSelect.textContent = "";
  awayTeamSelect.textContent = "";

  const homePlaceholder =
    document.createElement("option");

  homePlaceholder.value = "";
  homePlaceholder.textContent =
    "Choose home team";

  const awayPlaceholder =
    document.createElement("option");

  awayPlaceholder.value = "";
  awayPlaceholder.textContent =
    "Choose away team";

  homeTeamSelect.appendChild(homePlaceholder);
  awayTeamSelect.appendChild(awayPlaceholder);

  teams.forEach((team) => {
    const homeOption =
      document.createElement("option");

    homeOption.value = team.id;
    homeOption.textContent = team.name;

    const awayOption =
      document.createElement("option");

    awayOption.value = team.id;
    awayOption.textContent = team.name;

    homeTeamSelect.appendChild(homeOption);
    awayTeamSelect.appendChild(awayOption);
  });

  homeTeamSelect.disabled = false;
  awayTeamSelect.disabled = false;
}


async function loadTournamentTeams(
  tournamentId
) {
  selectedTournamentTeams = [];

  clearTeamSelects();

  if (!tournamentId) {
    return;
  }

  try {
    const { data, error } = await supabase
      .from("team_applications")
      .select(
        "team_id, teams (id, name)"
      )
      .eq(
        "tournament_id",
        tournamentId
      );

    if (error) {
      showMessage(
        "Could not load tournament teams: " +
        error.message
      );

      return;
    }

    const teams = (data || [])
      .map((application) => application.teams)
      .filter(Boolean);

    if (teams.length < 2) {
      showMessage(
        "This tournament needs at least two registered teams before you can create a fixture."
      );

      return;
    }

    selectedTournamentTeams = teams;

    fillTeamSelects(teams);
  } catch (error) {
    showMessage(
      "Could not load tournament teams: " +
      (error?.message || String(error))
    );
  }
}


function fillTournamentSelect() {
  tournamentSelect.textContent = "";

  const placeholder =
    document.createElement("option");

  placeholder.value = "";
  placeholder.textContent =
    "Choose your tournament";

  tournamentSelect.appendChild(placeholder);

  myTournaments.forEach((tournament) => {
    const option =
      document.createElement("option");

    option.value = tournament.id;
    option.textContent = tournament.name;

    tournamentSelect.appendChild(option);
  });
}


async function loadMyTournaments() {
  try {
    const { data, error } = await supabase
      .from("tournaments")
      .select(
        "id, name, created_by"
      )
      .eq(
        "created_by",
        currentUserId
      )
      .order("id", {
        ascending: false
      });

    if (error) {
      showMessage(
        "Could not load your tournaments: " +
        error.message
      );

      return;
    }

    myTournaments = data || [];

    if (myTournaments.length === 0) {
      showMessage(
        "You have not created any tournaments yet. Create a tournament first."
      );

      return;
    }

    fillTournamentSelect();
  } catch (error) {
    showMessage(
      "Could not load your tournaments: " +
      (error?.message || String(error))
    );
  }
}


async function createFixture(event) {
  event.preventDefault();

  const tournamentId =
    tournamentSelect.value;

  const homeTeamId =
    homeTeamSelect.value;

  const awayTeamId =
    awayTeamSelect.value;

  const pool =
    poolSelect.value;

  const matchDate =
    matchDateInput.value;

  const venue =
    venueInput.value.trim();

  if (!tournamentId) {
    showMessage(
      "Choose a tournament."
    );

    return;
  }

  if (!homeTeamId || !awayTeamId) {
    showMessage(
      "Choose both the home team and away team."
    );

    return;
  }

  if (homeTeamId === awayTeamId) {
    showMessage(
      "Choose two different teams."
    );

    return;
  }

  if (!matchDate) {
    showMessage(
      "Choose the match date and time."
    );

    return;
  }

  if (!venue) {
    showMessage(
      "Enter the venue."
    );

    return;
  }

  const submitButton =
    createFixtureForm.querySelector(
      "button[type='submit']"
    );

  submitButton.disabled = true;
  submitButton.textContent =
    "Creating fixture...";

  try {
    const { error } = await supabase
      .from("fixtures")
      .insert({
        tournament_id: tournamentId,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        pool: pool,
        match_date: new Date(matchDate).toISOString(),
        venue: venue,
        status: "scheduled",
        created_by: currentUserId
      });

    if (error) {
      showMessage(
        "Could not create the fixture: " +
        error.message
      );

      return;
    }

    showMessage(
      "Fixture created successfully.",
      "success"
    );

    createFixtureForm.reset();

    clearTeamSelects();

    fillTournamentSelect();
  } catch (error) {
    showMessage(
      "Could not create the fixture: " +
      (error?.message || String(error))
    );
  } finally {
    submitButton.disabled = false;
    submitButton.textContent =
      "Create fixture";
  }
}


async function initialiseCreateFixture() {
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
        "Could not load your profile role: " +
        profileError.message
      );

      return;
    }

    currentRoles = Array.isArray(profile?.roles)
      ? profile.roles
      : [];

    if (!isOrganiser()) {
      showMessage(
        "Only tournament organisers can create fixtures."
      );

      createFixtureForm.hidden = true;

      return;
    }

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

    tournamentSelect.addEventListener(
      "change",
      () => {
        loadTournamentTeams(
          tournamentSelect.value
        );
      }
    );

    createFixtureForm.addEventListener(
      "submit",
      createFixture
    );

    await loadMyTournaments();
  } catch (error) {
    console.error(error);

    showMessage(
      "Could not load the create fixture page: " +
      (error?.message || String(error))
    );
  }
}


initialiseCreateFixture();