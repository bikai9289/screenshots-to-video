const icons = ['scan-line','play','pause','arrow-up-right','circle-play','sparkles','arrow-down-right','mouse-pointer-2','maximize','minimize','image','move-right','arrow-up','clapperboard','file-video-2','check','scan-eye','panels-top-left','refresh-cw','plus','x','menu'];
async function loadIcons() {
  await Promise.all(icons.map(async name => {
    const response = await fetch(`assets/icons/${name}.svg`);
    if (!response.ok) throw new Error(`Icon missing: ${name}`);
    const markup = await response.text();
    document.querySelectorAll(`[data-lucide="${name}"]`).forEach(node => {
      const template = document.createElement('template');
      template.innerHTML = markup.trim();
      const svg = template.content.firstElementChild;
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      svg.classList.add(...node.classList);
      node.replaceWith(svg);
    });
  }));
}
loadIcons().catch(console.error);
const film = document.querySelector('.film');
const pauseButton = document.querySelector('.play-control');
const scrubber = document.querySelector('.scrubber');
let playing = !matchMedia('(prefers-reduced-motion: reduce)').matches;
let currentTime = Math.min(18, Math.max(0, Number(localStorage.getItem('stv-demo-time')) || 0));
let lastFrame = performance.now();
const animated = () => document.querySelectorAll('.product-shot,.focus-ring,.shot-cursor');
function syncPlayback() {
  film.classList.toggle('paused', !playing);
  pauseButton.setAttribute('aria-label', playing ? 'Pause demo' : 'Play demo');
  pauseButton.innerHTML = `<i data-lucide="${playing ? 'pause' : 'play'}"></i>`;
  loadIcons().catch(console.error);
}
pauseButton.addEventListener('click', () => { playing = !playing; syncPlayback(); });
scrubber.addEventListener('input', () => { currentTime = Number(scrubber.value); localStorage.setItem('stv-demo-time', currentTime); });
function tick(now) {
  if (playing && !document.hidden) currentTime = (currentTime + Math.min((now - lastFrame) / 1000, .1)) % 18;
  lastFrame = now;
  scrubber.value = currentTime;
  document.querySelector('.timecode').textContent = `00:${String(Math.floor(currentTime)).padStart(2,'0')} / 00:18`;
  document.querySelector('.scene-counter').textContent = `SCENE 0${Math.min(3,Math.floor(currentTime/6)+1)} / 03`;
  animated().forEach(el => el.getAnimations().forEach(animation => { animation.pause(); animation.currentTime = currentTime * 1000; }));
  requestAnimationFrame(tick);
}
if (!playing) film.classList.add('paused');
syncPlayback();
requestAnimationFrame(tick);
window.addEventListener('pagehide', () => localStorage.setItem('stv-demo-time', currentTime));
const expandButton = document.querySelector('.fullscreen');
function setExpanded(expanded) {
  film.classList.toggle('expanded', expanded);
  document.body.style.overflow = expanded ? 'hidden' : '';
  expandButton.setAttribute('aria-label', expanded ? 'Collapse demo' : 'Expand demo');
  expandButton.innerHTML = `<i data-lucide="${expanded ? 'minimize' : 'maximize'}"></i>`;
  loadIcons().catch(console.error);
}
expandButton.addEventListener('click', () => setExpanded(!film.classList.contains('expanded')));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && film.classList.contains('expanded')) setExpanded(false); });
const examples = {
  launch: { number:'01 / PRODUCT LAUNCH', title:'A launch that<br>looks the part.', text:'Put your product front and center. Turn the dashboard, the details, and the big reveal into one clear story.', kicker:'MEET YOUR NEXT BIG THING.', duration:'00:18 / 16:9', className:'' },
  feature: { number:'02 / FEATURE UPDATE', title:'One feature.<br>All the attention.', text:'Give your newest feature a closer look. Focus on the detail that makes a difference, then share the update with your users.', kicker:'A SMALL UPDATE. A BIG DIFFERENCE.', duration:'00:12 / 16:9', className:'feature-example' },
  social: { number:'03 / SOCIAL TEASER', title:'Stop the scroll.<br>Start the story.', text:'Give your next announcement a little movement. Put the product first and make every second count in the feed.', kicker:'SOMETHING GOOD IS COMING.', duration:'00:10 / 9:16', className:'social-example' }
};
document.querySelectorAll('[data-example]').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('[data-example]').forEach(item => { const active = item === tab; item.classList.toggle('active',active); item.setAttribute('aria-selected',String(active)); item.tabIndex = active ? 0 : -1; });
    const data = examples[tab.dataset.example];
    document.querySelector('.number-label').textContent = data.number;
    document.querySelector('.example-info h3').innerHTML = data.title;
    document.querySelector('.example-info p').textContent = data.text;
    document.querySelector('.example-kicker').textContent = data.kicker;
    document.querySelector('.example-duration').textContent = data.duration;
    document.querySelector('.example-visual').className = `example-visual ${data.className}`;
    document.querySelector('#example-panel').setAttribute('aria-labelledby',tab.id);
    const button = document.querySelector('.example-play');
    button.setAttribute('aria-label',`Play ${tab.textContent.trim().toLowerCase()} example`);
  });
  tab.addEventListener('keydown', event => {
    const tabs = [...document.querySelectorAll('[data-example]')];
    let index = tabs.indexOf(tab);
    if(event.key === 'ArrowRight') index = (index + 1) % tabs.length;
    else if(event.key === 'ArrowLeft') index = (index + tabs.length - 1) % tabs.length;
    else if(event.key === 'Home') index = 0;
    else if(event.key === 'End') index = tabs.length - 1;
    else return;
    event.preventDefault(); tabs[index].click(); tabs[index].focus();
  });
});
document.querySelector('.example-play').addEventListener('click', event => {
  const preview = document.querySelector('.mini-browser');
  const active = preview.classList.toggle('playing');
  event.currentTarget.setAttribute('aria-label',active ? 'Pause example' : 'Play example');
  event.currentTarget.innerHTML = `<i data-lucide="${active ? 'pause' : 'play'}"></i>`;
  loadIcons().catch(console.error);
});
const dialog = document.querySelector('#create-dialog');
document.querySelectorAll('[data-create]').forEach(button => button.addEventListener('click', () => dialog.showModal()));
dialog.addEventListener('click', event => { if(event.target === dialog){ const rect = dialog.getBoundingClientRect(); if(event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom) dialog.close(); } });
document.querySelector('#back-to-examples').addEventListener('click', () => { dialog.close(); document.querySelector('#examples').scrollIntoView({ behavior:'smooth' }); });
const menuToggle = document.querySelector('.menu-toggle');
menuToggle.addEventListener('click', () => { const open = document.querySelector('nav').classList.toggle('open'); menuToggle.setAttribute('aria-expanded',String(open)); menuToggle.setAttribute('aria-label',open ? 'Close menu' : 'Open menu'); });
document.querySelectorAll('nav a').forEach(link => link.addEventListener('click', () => { document.querySelector('nav').classList.remove('open'); menuToggle.setAttribute('aria-expanded','false'); menuToggle.setAttribute('aria-label','Open menu'); }));
