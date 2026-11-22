"use strict";


const createTournamentForm =
  document.getElementById("create-tournament-form");


const tournamentNameInput =
  document.getElementById("tournament-name");


const tournamentDescriptionInput =
  document.getElementById("tournament-description");


const tournamentLocationInput =
  document.getElementById("tournament-location");


const tournamentStartDateInput =
  document.getElementById("tournament-start-date");


const tournamentEndDateInput =
  document.getElementById("tournament-end-date");


const maxTeamsInput =
  document.getElementById("max-teams");


const allowedCountiesInput =
  document.getElementById("allowed-counties");


const createTournamentButton =
  document.getElementById("create-tournament-button");


const createTournamentMessage =
  document.getElementById("create-tournament-message");


const signOutButton =
  document.getElementById("sign-out-button");


const menuButton =
  document.getElementById("menu-button");


const dashboardMenu =
  document.getElementById("dashboard-menu");


const profileButton =
  document.getElementById("profile-button");


const profileDropdown =
  document.getElementById("profile-dropdown");


let supabase = null;
let currentUserId = null;
let creating = false;


function showMessage(text, type = "error") {
  createTournamentMessage.textContent = text;
  createTournamentMessage.dataset.type = type;
  createTournamentMessage.hidden = false;
}


function setCreating(isCreating) {
  creating = isCreating;


  createTournamentButton.disabled = isCreating;


  createTournamentButton.textContent = isCreating
    ? "Creating tournament..."
    : "Create tournament";


  createTournamentForm.setAttribute(
    "aria-busy",
    String(isCreating)
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
    isOpen ? "Close dashboard menu" : "Open dashboard menu"
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


function getSelectedCounties() {
  const selectedOptions = Array.from(
    allowedCountiesInput.selectedOptions
  );


  const selectedCounties = [];


  selectedOptions.forEach((option) => {
    selectedCounties.push(option.value);
  });


  return selectedCounties;
}


function getCreateError(error) {
  if (error.code === "23514") {
    return (
      "Please check the tournament details. Some values are " +
      "not valid."
    );
  }


  if (error.code === "42501") {
    return (
      "You do not have permission to create a tournament. " +
      "Your account must have the tournament organiser role."
    );
  }


  if (error.message) {
    return (
      "Could not create the tournament: " +
      error.message
    );
  }


  return (
    "Could not create the tournament. Check your connection " +
    "and try again."
  );
}


createTournamentForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();


    if (!supabase || !currentUserId || creating) {
      return;
    }


    const tournamentName =
      cleanText(tournamentNameInput.value);


    const tournamentDescription =
      cleanText(tournamentDescriptionInput.value);


    const tournamentLocation =
      cleanText(tournamentLocationInput.value);


    const tournamentStartDate =
      tournamentStartDateInput.value;


    const tournamentEndDate =
      tournamentEndDateInput.value;


    const maxTeams =
      Number(maxTeamsInput.value);


    const allowedCounties =
      getSelectedCounties();


    if (!createTournamentForm.reportValidity()) {
      return;
    }


    if (!tournamentName) {
      showMessage("Enter the tournament name.");
      return;
    }


    if (!tournamentStartDate) {
      showMessage("Choose the tournament start date.");
      return;
    }


    if (!tournamentEndDate) {
      showMessage("Choose the tournament end date.");
      return;
    }


    if (tournamentEndDate < tournamentStartDate) {
      showMessage(
        "The end date cannot be before the start date."
      );


      return;
    }


    if (
      !maxTeams ||
      maxTeams < 2 ||
      maxTeams > 128
    ) {
      showMessage(
        "Enter a number of teams between 2 and 128."
      );


      return;
    }


    if (allowedCounties.length === 0) {
      showMessage(
        "Choose at least one county that can register."
      );


      return;
    }


    createTournamentMessage.hidden = true;
    setCreating(true);


    try {
      const { error } = await supabase
        .from("tournaments")
        .insert({
          organiser_id: currentUserId,
          name: tournamentName,
          description: tournamentDescription,
          location: tournamentLocation,
          start_date: tournamentStartDate,
          end_date: tournamentEndDate,
          max_teams: maxTeams,
          allowed_counties: allowedCounties,
          status: "draft",
          created_by: currentUserId
        });


      if (error) {
        showMessage(getCreateError(error));
        return;
      }


      showMessage(
        "Tournament created successfully.",
        "success"
      );


      setTimeout(() => {
        window.location.replace("tournaments.html");
      }, 1200);
    } catch (caughtError) {
      showMessage(
        "Could not create the tournament: " +
        (caughtError.message || "Unexpected error.")
      );
    } finally {
      setCreating(false);
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
    const { error } = await supabase.auth.signOut();


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


async function initialiseCreateTournament() {
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
      throw new Error("Supabase connection is missing.");
    }


    const {
      data: { user },
      error
    } = await supabase.auth.getUser();


    if (error || !user) {
      window.location.replace("../auth/login.html");
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
        "Could not check your tournament organiser role."
      );


      return;
    }


    const roles = Array.isArray(profile?.roles)
      ? profile.roles
      : [];


    if (!roles.includes("tournament_organiser")) {
      showMessage(
        "Only tournament organisers can create tournaments."
      );


      createTournamentForm.hidden = true;
      return;
    }


    menuButton.addEventListener("click", () => {
      const isOpen =
        menuButton.getAttribute("aria-expanded") === "true";


      setProfileOpen(false);
      setMenuOpen(!isOpen);
    });


    profileButton.addEventListener("click", () => {
      const isOpen =
        profileButton.getAttribute("aria-expanded") === "true";


      setMenuOpen(false);
      setProfileOpen(!isOpen);
    });


    document.addEventListener("click", (event) => {
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
    });


    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeAllMenus();
      }
    });


    if (signOutButton) {
      signOutButton.addEventListener("click", signOut);
    }
  } catch (caughtError) {
    showMessage(
      "Could not load tournament creation: " +
      (caughtError.message || "Unexpected error.")
    );
  }
}


initialiseCreateTournament();