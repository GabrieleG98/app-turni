-- RLS per timbrature_correzioni
alter table if exists timbrature_correzioni enable row level security;

-- Dipendente: vede solo le sue richieste
drop policy if exists "correzioni_select_own" on timbrature_correzioni;
create policy "correzioni_select_own" on timbrature_correzioni
  for select using (auth.uid() = dipendente_id);

-- Dipendente: può inserire solo le sue
drop policy if exists "correzioni_insert_own" on timbrature_correzioni;
create policy "correzioni_insert_own" on timbrature_correzioni
  for insert with check (auth.uid() = dipendente_id);

-- Manager/owner: vede tutte le richieste
drop policy if exists "correzioni_select_manager" on timbrature_correzioni;
create policy "correzioni_select_manager" on timbrature_correzioni
  for select using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid()
        and role in ('manager', 'owner')
    )
  );

-- Manager/owner: può aggiornare (approvare/rifiutare)
drop policy if exists "correzioni_update_manager" on timbrature_correzioni;
create policy "correzioni_update_manager" on timbrature_correzioni
  for update using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid()
        and role in ('manager', 'owner')
    )
  );
