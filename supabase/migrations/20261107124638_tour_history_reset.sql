-- A Tour restart removes only the authenticated owner's Tour archive.
grant delete on public.volleyworld_tour_seasons to authenticated;
create policy tour_delete_owner on public.volleyworld_tour_seasons
  for delete to authenticated using ((select auth.uid()) = user_id);
