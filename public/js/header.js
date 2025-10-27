// header.js

// --------------- MENU TOGGLE -----------------
const menuToggle = document.getElementById("menuToggle");
const mobileMenu = document.getElementById("mobileMenu");

menuToggle.addEventListener("click", () => {
  mobileMenu.classList.toggle("active");
  menuToggle.classList.toggle("open");
});

// --------------- LANGUAGE DROPDOWNS -----------------
function setupLanguageDropdown(currentId, dropdownId) {
  const current = document.getElementById(currentId);
  const dropdown = document.getElementById(dropdownId);

  if (!current || !dropdown) return;

  const languageLinks = dropdown.querySelectorAll('a[data-lang]');

  // Toggle dropdown visibility
  current.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("active");
    current.parentElement.classList.toggle("active");
  });

  // Handle language selection click
  languageLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault(); // Stop default link behavior
      const lang = link.getAttribute('data-lang');
      
      // Get the current page path, including any query parameters
      const currentPath = window.location.pathname + window.location.search;

      // Navigate to the backend endpoint to set the session variable and redirect
      window.location.href = `/set-language?lang=${lang}&redirect=${encodeURIComponent(currentPath)}`;
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!current.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove("active");
      current.parentElement.classList.remove("active");
    }
  });
}

// Initialize for both desktop and mobile dropdowns
setupLanguageDropdown("langCurrent", "langDropdown");
setupLanguageDropdown("langCurrentMobile", "langDropdownMobile");