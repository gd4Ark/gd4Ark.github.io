const primaryColorScheme = ""; // "light" | "dark"

// Get theme data from local storage
const currentTheme = localStorage.getItem("theme");

function getPreferTheme() {
  if (currentTheme) return currentTheme;
  if (primaryColorScheme) return primaryColorScheme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

let themeValue = getPreferTheme();

function setPreference() {
  localStorage.setItem("theme", themeValue);
  reflectPreference();
}

function reflectPreference() {
  document.firstElementChild.setAttribute("data-theme", themeValue);
  document.querySelector("#theme-btn")?.setAttribute("aria-label", themeValue);
  const body = document.body;
  if (body) {
    const bgColor = window.getComputedStyle(body).backgroundColor;
    document
      .querySelector("meta[name='theme-color']")
      ?.setAttribute("content", bgColor);
  }
}

// Set early so no page flashes / CSS is made aware
reflectPreference();

// Sync with system changes
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", ({ matches: isDark }) => {
    themeValue = isDark ? "dark" : "light";
    setPreference();
  });

// Theme button click handler - bound once, reset on astro:after-swap
let themeBtnBound = false;

function bindThemeBtn() {
  if (themeBtnBound) return;
  const btn = document.querySelector("#theme-btn");
  if (!btn) return;
  themeBtnBound = true;
  btn.addEventListener("click", () => {
    themeValue = themeValue === "light" ? "dark" : "light";
    setPreference();
  });
}

window.onload = () => {
  reflectPreference();
  bindThemeBtn();

  document.addEventListener("astro:after-swap", () => {
    themeBtnBound = false;
    reflectPreference();
    bindThemeBtn();
  });
};
