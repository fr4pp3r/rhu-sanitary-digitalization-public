// Shared site-wide UI helpers (menu toggles)

// Toggle main navbar on small screens
document.addEventListener('click', (e) => {
  const toggle = e.target.closest('.nav-toggle');
  if (toggle) {
    const navbar = toggle.closest('.navbar');
    if (navbar) {
      const isOpen = navbar.classList.toggle('open');
      // reflect state on the toggle for accessibility
      try { toggle.setAttribute('aria-expanded', String(isOpen)); } catch (err) {}
    }
  }

  const sidebarToggle = e.target.closest('#sidebar-toggle');
  if (sidebarToggle) {
    const layout = document.querySelector('.admin-layout');
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.toggle('open');
    if (layout) layout.classList.toggle('sidebar-open');
  }
});

// Close menus when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.navbar') && !e.target.closest('.nav-toggle')) {
    document.querySelectorAll('.navbar.open').forEach(n => n.classList.remove('open'));
    // update aria-expanded on any toggles inside navbars
    document.querySelectorAll('.nav-toggle').forEach(btn => btn.setAttribute('aria-expanded', 'false'));
  }
  if (!e.target.closest('.sidebar') && !e.target.closest('#sidebar-toggle')) {
    document.querySelectorAll('.sidebar.open').forEach(s => s.classList.remove('open'));
  }
});

// Close menus on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.navbar.open').forEach(n => n.classList.remove('open'));
    document.querySelectorAll('.sidebar.open').forEach(s => s.classList.remove('open'));
    document.querySelectorAll('.nav-toggle').forEach(btn => btn.setAttribute('aria-expanded', 'false'));
    document.querySelectorAll('#sidebar-toggle').forEach(btn => btn.setAttribute('aria-expanded', 'false'));
  }
});

// Hide nav-toggle when the inline navbar is visible (e.g., wide screens)
function updateNavToggleVisibility() {
  document.querySelectorAll('.navbar').forEach(navbar => {
    const nav = navbar.querySelector('.navbar-nav');
    const toggle = navbar.querySelector('.nav-toggle');
    if (!nav || !toggle) return;
    const style = window.getComputedStyle(nav);
    // If the nav is displayed (inline links visible), hide the toggle; otherwise show it
    if (style.display !== 'none') {
      toggle.style.display = 'none';
      try { toggle.setAttribute('aria-expanded', 'false'); } catch {}
    } else {
      toggle.style.display = '';
    }
  });
}

window.addEventListener('resize', updateNavToggleVisibility);
window.addEventListener('load', updateNavToggleVisibility);
document.addEventListener('DOMContentLoaded', updateNavToggleVisibility);

export {};
