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

// Enhance the invitation with current public server counts; keep the link usable offline.
const discordInvite = document.querySelector('[data-discord-invite]');
if (discordInvite) {
    fetch('https://discord.com/api/v10/invites/' + encodeURIComponent(discordInvite.dataset.discordInvite) + '?with_counts=true', { signal: AbortSignal.timeout(6000) })
        .then(response => {
            if (!response.ok) throw new Error('Discord invite unavailable');
            return response.json();
        })
        .then(invite => {
            if (invite.guild?.name) discordInvite.querySelector('.discord-server-name').textContent = invite.guild.name;
            if (Number.isFinite(invite.approximate_presence_count) && Number.isFinite(invite.approximate_member_count)) {
                discordInvite.querySelector('[data-discord-online]').textContent = invite.approximate_presence_count.toLocaleString();
                discordInvite.querySelector('[data-discord-members]').textContent = invite.approximate_member_count.toLocaleString();
                discordInvite.querySelector('.discord-server-stats').hidden = false;
            }
        })
        .catch(() => {});
}
