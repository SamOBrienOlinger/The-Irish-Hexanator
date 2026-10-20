/* Enhance the existing history disclosures; no articles or destinations are changed. */
document.addEventListener('DOMContentLoaded', () => {
  ['what', 'who', 'where'].forEach((kind) => {
    const section = document.querySelector(`.l-${kind}`);
    if (!section) return;
    const heading = section.querySelector('h2');
    const panel = section.querySelector(`.${kind}-drop`);
    if (!heading || !panel) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'accordion-trigger';
    button.id = `${kind}-trigger`;
    panel.id = `${kind}-panel`;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-labelledby', button.id);
    button.setAttribute('aria-controls', panel.id);
    button.setAttribute('aria-expanded', 'false');
    const title = document.createElement('span');
    title.className = 'accordion-title';
    while (heading.firstChild) title.appendChild(heading.firstChild);
    title.querySelectorAll('img').forEach((image) => { image.alt = ''; });
    button.appendChild(title);
    const toggle = document.createElement('span');
    toggle.className = 'accordion-toggle';
    toggle.setAttribute('aria-hidden', 'true');
    button.appendChild(toggle);
    heading.appendChild(button);
    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!expanded));
      panel.style.display = expanded ? 'none' : 'block';
    });
  });
});
