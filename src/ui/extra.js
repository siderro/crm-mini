import { sb } from '../supabase.js';

export async function renderExtra(container) {
  container.innerHTML = `
    <h2>Extra</h2>
    <div class="card" style="margin-top:1rem;">
      <h3>Export all data (JSON)</h3>
      <p style="margin:.5rem 0;color:var(--muted);">Downloads all tables: contacts, companies, projects, inbox.</p>
      <button id="export-json-btn" class="btn btn-primary">Export JSON</button>
      <span id="export-status" style="margin-left:.5rem;"></span>
    </div>
  `;

  container.querySelector('#export-json-btn').addEventListener('click', async () => {
    const btn = container.querySelector('#export-json-btn');
    const status = container.querySelector('#export-status');
    btn.disabled = true;
    btn.textContent = 'Exporting...';
    status.textContent = '';

    try {
      const tables = ['contacts', 'companies', 'projects', 'inbox'];
      const result = { exported_at: new Date().toISOString(), tables: {} };

      for (const table of tables) {
        const { data, error } = await sb.from(table).select('*');
        if (error) throw new Error(`${table}: ${error.message}`);
        result.tables[table] = data || [];
      }

      const json = JSON.stringify(result, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `crm-export-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);

      const counts = tables.map(t => `${t}: ${result.tables[t].length}`).join(', ');
      status.textContent = `Done (${counts})`;
      status.style.color = 'var(--success, green)';
    } catch (err) {
      status.textContent = `Error: ${err.message}`;
      status.style.color = 'var(--danger, red)';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Export JSON';
    }
  });
}
