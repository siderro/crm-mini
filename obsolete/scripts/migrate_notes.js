/**
 * Migration script: Convert existing notes (contacts + projects) into log entries.
 *
 * Notes format example:
 *   Some text without date
 *   [18.06.2025] Called about the project
 *   [14.06.2025] Sent proposal
 *   --- Activity log ---
 *   [02.06.2025] Met at conference
 *
 * Run in browser console while logged in, or adapt for Node.
 * This script is idempotent-ish: it checks if logs already exist for a contact/project
 * before inserting. But best to run only once.
 *
 * Usage: paste into browser console on the running app, or import as module.
 */

import { sb } from '../src/supabase.js';

const DATE_PATTERN = /\[(\d{1,2})\.(\d{1,2})\.(\d{4})\]\s*/;
const ACTIVITY_LOG_SEPARATOR = /---\s*Activity log\s*---/;

function parseNotesIntoEntries(notes, fallbackDate) {
  if (!notes || !notes.trim()) return [];

  // Remove "--- Activity log ---" separator lines
  const cleaned = notes.replace(ACTIVITY_LOG_SEPARATOR, '').trim();
  if (!cleaned) return [];

  const entries = [];
  const lines = cleaned.split('\n');

  let currentDate = null;
  let currentLines = [];

  for (const line of lines) {
    const match = line.match(DATE_PATTERN);
    if (match) {
      // Flush previous block
      if (currentLines.length > 0) {
        const text = currentLines.join('\n').trim();
        if (text) {
          entries.push({
            logged_at: currentDate || fallbackDate,
            content: text,
          });
        }
      }
      // Parse new date
      const [, day, month, year] = match;
      currentDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const remainder = line.replace(DATE_PATTERN, '').trim();
      currentLines = remainder ? [remainder] : [];
    } else {
      currentLines.push(line);
    }
  }

  // Flush last block
  if (currentLines.length > 0) {
    const text = currentLines.join('\n').trim();
    if (text) {
      entries.push({
        logged_at: currentDate || fallbackDate,
        content: text,
      });
    }
  }

  return entries;
}

function toDateStr(isoTimestamp) {
  if (!isoTimestamp) return new Date().toISOString().slice(0, 10);
  return new Date(isoTimestamp).toISOString().slice(0, 10);
}

async function migrate() {
  const user = (await sb.auth.getUser()).data.user;
  if (!user) {
    console.error('Not logged in. Open the app and log in first.');
    return;
  }

  console.log(`Migrating notes for user ${user.email}...`);

  // Check if logs table has data already
  const { count } = await sb.from('logs').select('*', { count: 'exact', head: true });
  if (count > 0) {
    console.warn(`logs table already has ${count} entries. Skipping migration to avoid duplicates.`);
    return;
  }

  // Fetch contacts with notes
  const { data: contacts } = await sb.from('contacts').select('id, notes, created_at').not('notes', 'is', null);
  let contactLogs = 0;

  for (const contact of (contacts || [])) {
    const entries = parseNotesIntoEntries(contact.notes, toDateStr(contact.created_at));
    if (entries.length === 0) continue;

    const rows = entries.map(e => ({
      user_id: user.id,
      contact_id: contact.id,
      project_id: null,
      content: e.content,
      logged_at: e.logged_at,
    }));

    const { error } = await sb.from('logs').insert(rows);
    if (error) {
      console.error(`Error migrating contact ${contact.id}:`, error);
    } else {
      contactLogs += rows.length;
    }
  }

  // Fetch projects with notes
  const { data: projects } = await sb.from('projects').select('id, notes, created_at, contact_id').not('notes', 'is', null);
  let projectLogs = 0;

  for (const project of (projects || [])) {
    const entries = parseNotesIntoEntries(project.notes, toDateStr(project.created_at));
    if (entries.length === 0) continue;

    const rows = entries.map(e => ({
      user_id: user.id,
      contact_id: project.contact_id || null,
      project_id: project.id,
      content: e.content,
      logged_at: e.logged_at,
    }));

    const { error } = await sb.from('logs').insert(rows);
    if (error) {
      console.error(`Error migrating project ${project.id}:`, error);
    } else {
      projectLogs += rows.length;
    }
  }

  console.log(`Migration complete: ${contactLogs} contact logs + ${projectLogs} project logs created.`);
}

migrate();
