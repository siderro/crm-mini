export const notes = {
  id: 'notes',
  label: 'Notes',
  desc: 'Poznámky',
  render(mount) {
    mount.innerHTML = `
      <div class="placeholder">
        <h1>Notes</h1>
        <p class="muted">Připravuje se.</p>
        <a href="#/">← Hub</a>
      </div>`;
  },
};
