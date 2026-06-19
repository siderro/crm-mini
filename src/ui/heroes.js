import { sb } from '../supabase.js';

export async function renderHeroes(container) {
  container.innerHTML = '<div class="loading">Loading...</div>';

  try {
    const { data: projects } = await sb.from('projects')
      .select('id, title, amount, status, updated_at, contact_id, contacts(first_name, last_name)')
      .in('status', ['won', 'lost'])
      .order('updated_at', { ascending: false });

    const list = projects || [];

    // Build month filter options from data
    const months = new Set();
    for (const p of list) {
      if (p.updated_at) {
        const d = new Date(p.updated_at);
        months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
    }
    const sortedMonths = Array.from(months).sort().reverse();

    const won = list.filter(p => p.status === 'won');
    const lost = list.filter(p => p.status === 'lost');

    // Yearly stats
    const years = new Set();
    for (const p of list) {
      if (p.updated_at) years.add(new Date(p.updated_at).getFullYear());
    }

    const yearStats = Array.from(years).sort().reverse().map(year => {
      const yearWon = won.filter(p => new Date(p.updated_at).getFullYear() === year);
      const yearLost = lost.filter(p => new Date(p.updated_at).getFullYear() === year);
      const wonVal = yearWon.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
      const lostVal = yearLost.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
      const total = yearWon.length + yearLost.length;
      const winRate = total > 0 ? Math.round((yearWon.length / total) * 100) : 0;
      return `${year}: ${yearWon.length} won (${fmtK(wonVal)}) &middot; ${yearLost.length} lost (${fmtK(lostVal)}) &middot; win rate ${winRate}%`;
    });

    container.innerHTML = `
      <div class="page-header">
        <h1>Heroes & Zeroes</h1>
        <div class="header-actions">
          <select id="month-filter" class="input">
            <option value="all">All time</option>
            ${sortedMonths.map(m => `<option value="${m}">${fmtMonth(m)}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="heroes-stats">
        ${yearStats.map(s => `<div>${s}</div>`).join('')}
      </div>

      <div class="heroes-grid">
        <div class="heroes-col">
          <div class="section-bar section-bar-contacts">HEROES</div>
          ${won.length === 0
            ? '<div class="empty-state">No wins yet.</div>'
            : `<div class="table-wrap">
              <table class="data-table" id="heroes-table">
                <thead><tr><th>Project</th><th>Value</th><th>Contact</th><th>Date</th></tr></thead>
                <tbody>
                  ${won.map(p => renderRow(p)).join('')}
                </tbody>
              </table>
            </div>`}
        </div>
        <div class="heroes-col">
          <div class="section-bar section-bar-deals">ZEROES</div>
          ${lost.length === 0
            ? '<div class="empty-state">No losses.</div>'
            : `<div class="table-wrap">
              <table class="data-table" id="zeroes-table">
                <thead><tr><th>Project</th><th>Value</th><th>Contact</th><th>Date</th></tr></thead>
                <tbody>
                  ${lost.map(p => renderRow(p)).join('')}
                </tbody>
              </table>
            </div>`}
        </div>
      </div>
    `;

    // Month filter
    container.querySelector('#month-filter').addEventListener('change', (e) => {
      const val = e.target.value;
      const rows = container.querySelectorAll('#heroes-table tbody tr, #zeroes-table tbody tr');
      rows.forEach(row => {
        if (val === 'all') {
          row.style.display = '';
        } else {
          row.style.display = row.dataset.month === val ? '' : 'none';
        }
      });
    });

    // Click rows
    container.querySelectorAll('.clickable-row').forEach(row => {
      row.addEventListener('click', () => {
        window.location.hash = `#/projects/${row.dataset.id}`;
      });
    });

  } catch (err) {
    container.innerHTML = `<div class="error">Error: ${esc(err.message)}</div>`;
  }
}

function renderRow(p) {
  const date = p.updated_at ? new Date(p.updated_at) : null;
  const dateStr = date ? `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}` : '-';
  const month = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : '';
  const contactName = p.contacts
    ? `${esc(p.contacts.first_name)} ${esc(p.contacts.last_name)}`
    : '-';

  return `
    <tr class="clickable-row" data-id="${p.id}" data-month="${month}">
      <td><strong>${esc(p.title)}</strong></td>
      <td>${p.amount ? fmtK(parseFloat(p.amount)) : '-'}</td>
      <td>${contactName}</td>
      <td>${dateStr}</td>
    </tr>
  `;
}

function fmtK(amount) {
  if (!amount) return '0';
  return `${Math.round(amount / 1000)}K`;
}

function fmtMonth(m) {
  const [y, mo] = m.split('-');
  const names = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[parseInt(mo)]} ${y}`;
}

function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
