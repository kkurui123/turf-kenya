"use strict";


const menuButton =
  document.getElementById("menu-button");

const dashboardMenu =
  document.getElementById("dashboard-menu");

const profileButton =
  document.getElementById("profile-button");

const profileDropdown =
  document.getElementById("profile-dropdown");

const tournamentsContainer =
  document.getElementById("tournaments-container");

const tournamentsMessage =
  document.getElementById("tournaments-message");

const createTournamentSection =
  document.getElementById("create-tournament-section");

const signOutButton =
  document.getElementById("sign-out-button");


let supabase = null;
let currentUserId = null;
let currentRoles = [];
let myTeams = [];
let myApplications = [];


function showMessage(text, type = "error") {
  tournamentsMessage.textContent = text;
  tournamentsMessage.dataset.type = type;
  tournamentsMessage.hidden = false;
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


function formatDate(value) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    "en-KE",
    {
      day: "numeric",
      month: "short",
      year: "numeric"
    }
  );
}


function getCountiesText(counties) {
  if (
    !Array.isArray(counties) ||
    counties.length === 0
  ) {
    return "Not set";
  }

  if (counties.includes("all-counties")) {
    return "All counties";
  }

  return counties.join(", ");
}


function isCoach() {
  return currentRoles.includes("coach");
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


function createCommentSection(tournament) {
  const commentSection =
    document.createElement("div");

  commentSection.className =
    "tournament-comments";

  const commentTitle =
    document.createElement("h3");

  commentTitle.textContent = "Comments";

  commentSection.appendChild(commentTitle);

  const commentsList =
    document.createElement("div");

  commentsList.className =
    "tournament-comments-list";

  commentsList.textContent =
    "Loading comments...";

  commentSection.appendChild(commentsList);

  const commentForm =
    document.createElement("form");

  commentForm.className =
    "tournament-comment-form";

  const commentInput =
    document.createElement("textarea");

  commentInput.placeholder =
    "Write a comment about this tournament...";

  commentInput.required = true;
  commentInput.rows = 3;

  const commentButton =
    createButton(
      "Post comment",
      "btn btn-primary",
      async () => {
        const commentText =
          commentInput.value.trim();

        if (!commentText) {
          showMessage(
            "Write a comment before posting."
          );

          return;
        }

        const { error } = await supabase
          .from("tournament_comments")
          .insert({
            tournament_id: tournament.id,
            user_id: currentUserId,
            comment: commentText
          });

        if (error) {
          showMessage(
            "Could not post your comment: " +
            error.message
          );

          return;
        }

        commentInput.value = "";

        await loadComments(
          tournament.id,
          commentsList
        );
      }
    );

  commentForm.appendChild(commentInput);
  commentForm.appendChild(commentButton);
  commentSection.appendChild(commentForm);

  loadComments(
    tournament.id,
    commentsList
  );

  return commentSection;
}


async function loadComments(
  tournamentId,
  commentsList
) {
  const { data, error } = await supabase
    .from("tournament_comments")
    .select(
      "id, comment, created_at, profiles (user_id, full_name)"
    )
    .eq("tournament_id", tournamentId)
    .order("created_at", {
      ascending: false
    });

  commentsList.textContent = "";

  if (error) {
    commentsList.textContent =
      "Could not load comments.";

    return;
  }

  if (!data || data.length === 0) {
    commentsList.textContent =
      "No comments yet. Be the first to comment.";

    return;
  }

  data.forEach((comment) => {
    const commentItem =
      document.createElement("div");

    commentItem.className =
      "tournament-comment";

    const commentText =
      document.createElement("p");

    commentText.textContent = comment.comment;

    const commentDate =
      document.createElement("small");

    commentDate.textContent = formatDate(
      comment.created_at
    );

    commentItem.appendChild(commentText);
    commentItem.appendChild(commentDate);
    commentsList.appendChild(commentItem);
  });
}


function canCoachRegisterTeam(tournament, team) {
  if (tournament.status !== "published") {
    return "This tournament is not open for registration.";
  }

  const allowedCounties =
    tournament.allowed_counties || [];

  const countyAllowed =
    allowedCounties.includes("all-counties") ||
    allowedCounties.includes(team.county);

  if (!countyAllowed) {
    return (
      "Your team county is not allowed for this tournament."
    );
  }

  const alreadyApplied = myApplications.some(
    (application) =>
      application.tournament_id === tournament.id &&
      application.team_id === team.id
  );

  if (alreadyApplied) {
    return "This team is already registered.";
  }

  return null;
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

  const tournamentTeams =
    document.createElement("p");

  tournamentTeams.textContent =
    "Teams allowed: " +
    (tournament.max_teams || "Not set");

  const tournamentCounties =
    document.createElement("p");

  tournamentCounties.textContent =
    "Counties allowed: " +
    getCountiesText(
      tournament.allowed_counties
    );

  tournamentCard.appendChild(tournamentTitle);
  tournamentCard.appendChild(tournamentStatus);
  tournamentCard.appendChild(tournamentLocation);
  tournamentCard.appendChild(tournamentDates);
  tournamentCard.appendChild(tournamentTeams);
  tournamentCard.appendChild(tournamentCounties);

  if (tournament.description) {
    const tournamentDescription =
      document.createElement("p");

    tournamentDescription.textContent =
      tournament.description;

    tournamentCard.appendChild(
      tournamentDescription
    );
  }

  if (tournament.announcement) {
    const tournamentAnnouncement =
      document.createElement("p");

    tournamentAnnouncement.textContent =
      "Announcement: " +
      tournament.announcement;

    tournamentCard.appendChild(
      tournamentAnnouncement
    );
  }

  const tournamentActions =
    document.createElement("div");

  tournamentActions.className =
    "home-actions";

  if (isCoach()) {
    if (myTeams.length === 0) {
      const registerTeamButton =
        createButton(
          "Register a team first",
          "btn btn-primary",
          () => {
            window.location.replace(
              "register-team.html"
            );
          }
        );

      tournamentActions.appendChild(
        registerTeamButton
      );
    } else {
      myTeams.forEach((team) => {
        const registrationError =
          canCoachRegisterTeam(
            tournament,
            team
          );

        const teamButton =
          createButton(
            registrationError
              ? team.name + " - Not eligible"
              : "Register " + team.name,
            "btn btn-primary",
            () => {
              if (registrationError) {
                showMessage(
                  registrationError
                );

                return;
              }

              registerTeam(
                tournament,
                team
              );
            }
          );

        if (registrationError) {
          teamButton.disabled = true;
        }

        tournamentActions.appendChild(
          teamButton
        );
      });
    }
  }


  if (isTournamentOwner(tournament)) {
    const editButton =
      createButton(
        "Edit tournament",
        "btn btn-primary",
        () => editTournament(tournament)
      );

    const statusButton =
      createButton(
        tournament.status === "suspended"
          ? "Publish tournament"
          : "Suspend tournament",
        "btn btn-primary",
        () => changeTournamentStatus(tournament)
      );

    const announcementButton =
      createButton(
        "Add announcement",
        "btn btn-primary",
        () => addAnnouncement(tournament)
      );

    const deleteButton =
      createButton(
        "Delete tournament",
        "btn btn-primary",
        () => deleteTournament(tournament)
      );

    tournamentActions.appendChild(editButton);
    tournamentActions.appendChild(statusButton);
    tournamentActions.appendChild(announcementButton);
    tournamentActions.appendChild(deleteButton);
  }

  if (tournamentActions.children.length > 0) {
    tournamentCard.appendChild(
      tournamentActions
    );
  }

  tournamentCard.appendChild(
    createCommentSection(tournament)
  );

  return tournamentCard;
}


function showTournaments(tournaments) {
  tournamentsContainer.textContent = "";

  if (!tournaments || tournaments.length === 0) {
    const emptyMessage =
      document.createElement("p");

    emptyMessage.textContent =
      "No tournaments have been created yet.";

    tournamentsContainer.appendChild(
      emptyMessage
    );

    return;
  }

  tournaments.forEach((tournament) => {
    const tournamentCard =
      createTournamentCard(tournament);

    tournamentsContainer.appendChild(
      tournamentCard
    );
  });
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
      "Could not load your profile role."
    );

    return;
  }

  currentRoles = Array.isArray(profile?.roles)
    ? profile.roles
    : [];

  if (isOrganiser()) {
    createTournamentSection.hidden = false;
  }
}


async function loadMyTeams() {
  if (!isCoach()) {
    myTeams = [];
    return;
  }

  const { data, error } = await supabase
    .from("teams")
    .select("id, name, county")
    .eq("coach_id", currentUserId);

  if (error) {
    myTeams = [];
    return;
  }

  myTeams = data || [];
}


async function loadMyApplications() {
  if (!isCoach()) {
    myApplications = [];
    return;
  }

  const { data, error } = await supabase
    .from("team_applications")
    .select(
      "id, tournament_id, team_id"
    )
    .eq("user_id", currentUserId);

  if (error) {
    myApplications = [];
    return;
  }

  myApplications = data || [];
}


async function loadTournaments() {
  try {
    const { data, error } = await supabase
      .from("tournaments")
      .select(
        "id, name, description, location, start_date, end_date, max_teams, allowed_counties, status, announcement, created_by"
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
  } catch {
    showMessage(
      "Could not load tournaments. Check your internet " +
      "connection and try again."
    );
  }
}


async function registerTeam(
  tournament,
  team
) {
  const registrationError =
    canCoachRegisterTeam(
      tournament,
      team
    );

  if (registrationError) {
    showMessage(registrationError);
    return;
  }

  const { error } = await supabase
    .from("team_applications")
    .insert({
      tournament_id: tournament.id,
      team_id: team.id,
      user_id: currentUserId,
      status: "pending"
    });

  if (error) {
    showMessage(
      "Could not register your team: " +
      error.message
    );

    return;
  }

  showMessage(
    team.name +
    " registered for " +
    tournament.name + ".",
    "success"
  );

  await loadMyApplications();
  await loadTournaments();
}


function editTournament(tournament) {
  const newName = window.prompt(
    "Enter the new tournament name:",
    tournament.name
  );

  if (!newName) {
    return;
  }

  const cleanName = newName.trim();

  if (!cleanName) {
    showMessage(
      "Enter a tournament name."
    );

    return;
  }

  updateTournament(tournament.id, {
    name: cleanName
  });
}


async function changeTournamentStatus(
  tournament
) {
  const newStatus =
    tournament.status === "suspended"
      ? "published"
      : "suspended";

  await updateTournament(
    tournament.id,
    {
      status: newStatus
    }
  );
}


function addAnnouncement(tournament) {
  const announcement = window.prompt(
    "Enter your tournament announcement:",
    tournament.announcement || ""
  );

  if (announcement === null) {
    return;
  }

  const cleanAnnouncement =
    announcement.trim();

  if (!cleanAnnouncement) {
    showMessage(
      "Enter an announcement."
    );

    return;
  }

  updateTournament(tournament.id, {
    announcement: cleanAnnouncement,
    announcement_created_at:
      new Date().toISOString()
  });
}


async function updateTournament(
  tournamentId,
  updates
) {
  try {
    const { error } = await supabase
      .from("tournaments")
      .update(updates)
      .eq("id", tournamentId)
      .eq("created_by", currentUserId);

    if (error) {
      showMessage(
        "Could not update the tournament: " +
        error.message
      );

      return;
    }

    showMessage(
      "Tournament updated successfully.",
      "success"
    );

    await loadTournaments();
  } catch {
    showMessage(
      "Could not update the tournament. Check your internet " +
      "connection and try again."
    );
  }
}


async function deleteTournament(tournament) {
  const confirmDelete = window.confirm(
    "Delete this tournament? This cannot be undone."
  );

  if (!confirmDelete) {
    return;
  }

  try {
    const { error } = await supabase
      .from("tournaments")
      .delete()
      .eq("id", tournament.id)
      .eq("created_by", currentUserId);

    if (error) {
      showMessage(
        "Could not delete the tournament: " +
        error.message
      );

      return;
    }

    showMessage(
      "Tournament deleted successfully.",
      "success"
    );

    await loadTournaments();
  } catch {
    showMessage(
      "Could not delete the tournament. Check your internet " +
      "connection and try again."
    );
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


async function initialiseTournaments() {
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

    await loadUserProfile();
    await loadMyTeams();
    await loadMyApplications();

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
  } catch {
    showMessage(
      "Could not load tournaments. Check your connection " +
      "and the project URL and publishable key in " +
      "js/config/supabase.js, then reload this page."
    );
  }
}


initialiseTournaments();