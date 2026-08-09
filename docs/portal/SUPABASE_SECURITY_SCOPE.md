# Supabase security scope портала

Дата: 2026-08-09

Проект Supabase: `ofewxuqfjhamgerwzull`.

## Важная граница

Этот Supabase-проект используется не только порталом новостроек. Live Security Advisor показывает предупреждения по CRM-функциям `nav_*` / `nav_v2_*` с `SECURITY DEFINER`, которые доступны роли `authenticated`.

Эти функции не относятся к порталу `deputat36/bm` и не должны автоматически изменяться из portal-задачи. Отдельные shared-project контуры `nav_*`, `nav_v2_*`, `parket_*`, `broker_*` считаются out-of-scope для portal migration work.

Portal-owned database objects определяются префиксами:

```text
newbuild_
set_newbuild_
```

## Live Security Advisor 9 августа 2026

Для portal-owned объектов Advisor не показал WARN `authenticated_security_definer_function_executable`.

Он показал четыре INFO `rls_enabled_no_policy`:

```text
public.newbuild_leads
public.newbuild_lead_events
public.newbuild_lead_rate_limits
public.newbuild_lead_operational_policies
```

Для текущей архитектуры это ожидаемый сигнал, а не автоматическое требование создать публичные RLS policies: portal browser не обращается к этим таблицам напрямую, а server-side Edge Function использует service-role access. Migrations должны при этом явно держать anon/authenticated grants закрытыми.

Static guard проверяет именно эту модель и не считает INFO доказательством безопасности сам по себе.

## Shared-project WARN

Live Advisor также показывает:

- `authenticated_security_definer_function_executable` для множества CRM RPC `nav_* / nav_v2_*`;
- `auth_leaked_password_protection` — leaked password protection в общем Supabase Auth выключена.

Portal-задача не будет автоматически исправлять эти предупреждения:

1. изменение CRM RPC может сломать отдельное приложение и требует отдельного permission/RLS аудита;
2. настройка leaked-password protection относится ко всему Auth-проекту и требует решения владельца shared environment.

Issue портала не должен утверждать, что эти общие WARN устранены.

## Static repository guard

`tools/validate-portal-supabase-security.mjs` сканирует полный `supabase/migrations` checkout и portal Edge source.

Для portal-owned SQL запрещено:

- `SECURITY DEFINER` в `newbuild_*` / `set_newbuild_*` functions;
- функции без явного `SECURITY INVOKER`;
- функции без фиксированного `search_path`;
- EXECUTE portal functions для PUBLIC/anon/authenticated;
- grants portal tables/views для anon/authenticated/PUBLIC;
- portal views без `security_invoker=true`;
- portal tables без RLS enable;
- hardcoded service-role/JWT credentials в Edge source.

Service-role grants допускаются явно.

## Почему functions требуют явного revoke

Postgres по умолчанию даёт EXECUTE на новые функции роли PUBLIC. Supabase рекомендует явно отзывать EXECUTE у PUBLIC/anon/authenticated и возвращать его только тем ролям, которым RPC действительно нужен.

Static guard отмечает отсутствие явного REVOKE предупреждением, даже если функция `SECURITY INVOKER`. `SECURITY DEFINER` для portal-owned functions запрещён полностью на текущем этапе.

## Views

Views в exposed schema могут работать с правами владельца. Для portal-owned views требуется `security_invoker=true`; дополнительно operational views должны оставаться закрытыми от anon/authenticated и предоставляться только service role.

## Data API change 2026

Supabase переводит новые public tables/functions на explicit exposure model. Это не повод ослаблять portal security: migrations всё равно должны явно фиксировать нужные grants и RLS, чтобы поведение не зависело от dashboard default.

## После любого portal DDL

1. прогнать repository guard;
2. выполнить live Supabase Security Advisor;
3. сравнить findings только в portal-owned scope;
4. отдельно записать shared-project findings, не присваивая их порталу;
5. не считать изменение завершённым без live verification.

## Команды

```bash
node tools/validate-portal-supabase-security.mjs
node tools/build-portal-supabase-security-report.mjs
node tools/build-portal-supabase-security-report.mjs --format=json
```
