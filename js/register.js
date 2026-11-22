"use strict";


const form =
  document.getElementById("register-form");


const emailInput =
  document.getElementById("email");


const passwordInput =
  document.getElementById("password");


const confirmPasswordInput =
  document.getElementById("confirm-password");


const roleInput =
  document.getElementById("role");


const registerButton =
  document.getElementById("register-button");


const messageBox =
  document.getElementById("register-message");


let supabase = null;
let submitting = false;


function showMessage(text, type = "error") {
  messageBox.textContent = text;
  messageBox.dataset.type = type;
  messageBox.hidden = false;
}


function setSubmitting(isSubmitting) {
  submitting = isSubmitting;


  registerButton.disabled = isSubmitting;
  registerButton.textContent = isSubmitting
    ? "Creating account..."
    : "Create account";


  form.setAttribute(
    "aria-busy",
    String(isSubmitting)
  );
}


function validatePasswords() {
  const passwordsMatch =
    passwordInput.value ===
    confirmPasswordInput.value;


  confirmPasswordInput.setCustomValidity(
    passwordsMatch
      ? ""
      : "Your passwords do not match."
  );
}


passwordInput.addEventListener(
  "input",
  validatePasswords
);


confirmPasswordInput.addEventListener(
  "input",
  validatePasswords
);


function getRegistrationError(error) {
  switch (error.code) {
    case "weak_password":
      return (
        "Choose a stronger password. Use at least 12 " +
        "characters and follow the project's password requirements."
      );

    case "email_address_invalid":
      return "Enter a valid email address.";

    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return (
        "Too many attempts. Please wait before trying again."
      );

    case "signup_disabled":
      return "Account registration is currently unavailable.";

    default:
      return (
        "Registration could not be completed. Check your " +
        "connection and try again. If you already have an " +
        "account, use the sign-in page."
      );
  }
}


async function saveProfileRole(
  userId,
  selectedRole
) {
  const { error } = await supabase
    .from("profiles")
    .upsert({
      user_id: userId,
      roles: [selectedRole]
    });


  if (error) {
    throw error;
  }
}


function redirectToRolePage(selectedRole) {
  if (selectedRole === "coach") {
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


    if (submitting || !supabase) {
      return;
    }


    emailInput.value =
      emailInput.value.trim();

    validatePasswords();


    if (!form.reportValidity()) {
      return;
    }


    const selectedRole =
      roleInput.value;


    if (!selectedRole) {
      showMessage(
        "Choose your role before creating an account."
      );

      return;
    }


    messageBox.hidden = true;
    setSubmitting(true);


    try {
      const confirmationRedirect = new URL(
        "../auth/login.html",
        window.location.href
      ).href;


      const { data, error } =
        await supabase.auth.signUp({
          email: emailInput.value,
          password: passwordInput.value,

          options: {
            emailRedirectTo: confirmationRedirect,

            data: {
              role: selectedRole
            }
          }
        });


      if (error) {
        showMessage(
          getRegistrationError(error)
        );

        return;
      }


      if (data.session && data.user) {
        await saveProfileRole(
          data.user.id,
          selectedRole
        );

        showMessage(
          "Account created successfully.",
          "success"
        );

        form.hidden = true;

        setTimeout(() => {
          redirectToRolePage(selectedRole);
        }, 1000);

        return;
      }


      form.reset();


      showMessage(
        "Registration submitted. Check your inbox and spam " +
        "folder for a confirmation email. After confirming " +
        "and signing in, your selected role will be used.",
        "success"
      );

      form.hidden = true;
    } catch (caughtError) {
      showMessage(
        "Could not create your account: " +
        (caughtError.message ||
        "Unexpected error.")
      );
    } finally {
      setSubmitting(false);
    }
  }
);


async function initialiseRegistration() {
  if (
    window.location.protocol !== "http:" &&
    window.location.protocol !== "https:"
  ) {
    showMessage(
      "Open this page through a local web server, not " +
      "directly as a file."
    );

    return;
  }

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

    registerButton.disabled = false;
  } catch {
    showMessage(
      "Could not load registration. Check your internet " +
      "connection and the project URL and publishable key " +
      "in js/config/supabase.js, then reload."
    );
  }
}


initialiseRegistration();