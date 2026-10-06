// Compatibility for previously cached pages. The site now uses dark mode only.
document.body.classList.remove('lightmode');
document.getElementById('theme-switch')?.remove();
try { localStorage.removeItem('lightmode'); } catch (_) { /* Storage can be disabled. */ }