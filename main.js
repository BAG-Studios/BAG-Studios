// The Home header is clear only while the visitor is at the top.
if (document.body.classList.contains('home-page')) {
    const updateNavbar = () => {
        document.body.classList.toggle('navbar-at-top', window.scrollY <= 0);
    };
    updateNavbar();
    window.addEventListener('scroll', updateNavbar, { passive: true });
    window.addEventListener('pageshow', updateNavbar);
}

const siteHeader = document.querySelector('.site-header');
const menuButton = document.querySelector('.site-menu-button');
const siteNavigation = document.querySelector('#site-navigation');
if (siteHeader && menuButton && siteNavigation) {
    const updateHeader = () => siteHeader.classList.toggle('scrolled', window.scrollY > 0);
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
    window.addEventListener('pageshow', updateHeader);
    const closeMenu = () => {
        menuButton.setAttribute('aria-expanded', 'false');
        siteHeader.classList.remove('menu-open');
        siteNavigation.classList.remove('open');
        menuButton.querySelector('span').textContent = '+';
    };
    menuButton.addEventListener('click', () => {
        const open = menuButton.getAttribute('aria-expanded') !== 'true';
        if (!open) return closeMenu();
        menuButton.setAttribute('aria-expanded', 'true');
        siteHeader.classList.add('menu-open');
        siteNavigation.classList.add('open');
        menuButton.querySelector('span').textContent = '−';
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
            closeMenu();
            menuButton.focus();
        }
    });
    siteNavigation.addEventListener('click', event => {
        if (event.target.closest('a')) closeMenu();
    });
    window.matchMedia('(min-width: 1001px)').addEventListener('change', event => {
        if (event.matches) closeMenu();
    });
}
