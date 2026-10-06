const dialog = document.querySelector('.trailer-dialog');
const host = dialog.querySelector('.video-host');
document.querySelectorAll('[data-trailer]').forEach(button => button.addEventListener('click', () => {
  const frame = document.createElement('iframe');
  frame.src = 'https://www.youtube-nocookie.com/embed/ezhkpZdxWnw?autoplay=1';
  frame.title = 'Atira early gameplay showcase';
  frame.allow = 'autoplay; encrypted-media; picture-in-picture';
  frame.allowFullscreen = true;
  host.replaceChildren(frame);
  dialog.showModal();
}));
dialog.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => host.replaceChildren());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
