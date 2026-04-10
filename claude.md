# Project

## What this app is
This is a lightweight all-purpose mini CRM for personal use.

Its main purpose is to:
- track open opportunities
- keep contacts visible and fresh
- link contacts, companies and deals
- record what was discussed with each contact
- show when I last spoke with someone and about which project

The app already exists.
Do not redesign it from scratch.
These instructions are written ex post to guide future changes.

## Main records
- Contact
- Company
- Deal

## Main product priorities
- clarity
- speed
- stability
- high information density
- practical usefulness
- easy maintenance

## Authentication
- Google login is used

## Working rules
- First understand the existing solution before changing it.
- Prefer small edits over large rewrites.
- Preserve the current architecture unless there is a strong reason not to.
- Preserve the current UI style.
- Do not add libraries unless clearly justified.
- Reuse existing patterns and components where possible.
- Do not invent fancy UX.
- Prefer literal, explicit UI over hidden interactions.
- Keep the app dense, practical, and fast to scan.

## UX/UI reference
Before making UI changes, follow:
- `UX-UI-RULES.md`
- `REFERENCES.md`

## Safety
- Do not read `.env` files.
- Do not expose secrets.
- Do not hardcode credentials.
- Be careful with destructive changes.

## How to respond
- Be brief.
- State what you changed.
- State what should be checked manually.
- Do not overexplain.