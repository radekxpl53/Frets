export const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,30}$/;

export const usernameInputProps = {
  pattern: "[a-zA-Z0-9_]+",
  minLength: 3,
  maxLength: 30,
  title: "Tylko litery a–z (bez polskich znaków), cyfry i podkreślnik.",
};

export const usernameHint = "Tylko litery a–z (bez polskich znaków), cyfry i podkreślnik.";
