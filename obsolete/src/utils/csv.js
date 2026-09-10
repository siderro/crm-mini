export function exportCSV(contacts, companies) {
  const companyMap = new Map();
  for (const c of companies) companyMap.set(c.id, c.name);

  const header = ['First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Notes', 'Created'];
  const rows = contacts.map(c => [
    c.first_name,
    c.last_name,
    c.email || '',
    c.phone || '',
    c.company_id ? (companyMap.get(c.company_id) || '') : '',
    (c.notes || '').replace(/\n/g, ' '),
    c.created_at ? new Date(c.created_at).toLocaleDateString() : '',
  ]);

  const escape = v => {
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? '"' + s.replace(/"/g, '""') + '"'
      : s;
  };

  const csv = [header, ...rows].map(r => r.map(escape).join(',')).join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `contacts_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
