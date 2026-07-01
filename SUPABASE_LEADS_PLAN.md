# Supabase leads plan

Project ref: ofewxuqfjhamgerwzull
Project status: ACTIVE_HEALTHY
Region: eu-west-1

## Goal

Move leads from email-only flow to a database-backed flow.

## Current state

The site sends lead forms through Web3Forms.
The main lead pages already collect:

- name
- phone
- interest
- comment
- page url
- tracking data
- consent

## Proposed table

Table name: site_leads

Fields:

- id
- project
- name
- phone
- interest
- comment
- page_url
- page_title
- referrer
- tracking
- source
- consent
- status
- created_at

## Lead statuses

- new
- contacted
- qualified
- not_target
- archived

## Next safe step

Before applying migration, inspect existing database schema in Supabase.
Do not create tables blindly if project is used by other applications.

## Recommended integration

1. Create table site_leads.
2. Enable RLS.
3. Create insert policy or Edge Function.
4. Send leads from the website to Edge Function.
5. Keep Web3Forms as backup notification channel.
