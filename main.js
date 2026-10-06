// The Home header is clear only while the visitor is at the top.
if (document.body.classList.contains('home-page')) {
    const updateNavbar = () => {
        document.body.classList.toggle('navbar-at-top', window.scrollY <= 0);
    };
    updateNavbar();
    window.addEventListener('scroll', updateNavbar, { passive: true });
    window.addEventListener('pageshow', updateNavbar);
}