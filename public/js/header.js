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

  current.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("active");
    current.parentElement.classList.toggle("active");
  });

  document.addEventListener("click", (e) => {
    if (!current.contains(e.target)) {
      dropdown.classList.remove("active");
      current.parentElement.classList.remove("active");
    }
  });
}

setupLanguageDropdown("langCurrent", "langDropdown");
setupLanguageDropdown("langCurrentMobile", "langDropdownMobile");
