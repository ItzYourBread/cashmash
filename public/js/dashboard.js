document.addEventListener('DOMContentLoaded', () => {
  const menuItems = document.querySelectorAll('.sidebar-menu li');
  const sections = document.querySelectorAll('.content-section');
  const sectionIds = Array.from(menuItems).map(item => item.dataset.section);

  // Get active section from URL or default
  const urlParams = new URLSearchParams(window.location.search);
  const activeSection = urlParams.get('section') || 'statistics';

  function activateSection(targetId) {
    menuItems.forEach(i => {
      i.classList.remove('active');
      if (i.dataset.section === targetId) i.classList.add('active');
    });
    sections.forEach(sec => {
      sec.classList.remove('active');
      if (sec.id === targetId) sec.classList.add('active');
    });
  }

  // Initialize
  activateSection(activeSection);

  // Click Handlers
  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.dataset.section;
      history.pushState(null, '', `/dashboard?section=${target}&page=1`);
      activateSection(target);
    });
  });

  // Arrow Key Navigation
  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    const currentActiveItem = document.querySelector('.sidebar-menu li.active');
    if (!currentActiveItem) return;

    const currentActiveIndex = sectionIds.indexOf(currentActiveItem.dataset.section);
    let nextIndex = currentActiveIndex;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextIndex = Math.min(currentActiveIndex + 1, sectionIds.length - 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      nextIndex = Math.max(currentActiveIndex - 1, 0);
    } else {
      return;
    }

    if (nextIndex !== currentActiveIndex) {
      const target = sectionIds[nextIndex];
      history.pushState(null, '', `/dashboard?section=${target}`);
      activateSection(target);
    }
  });
});