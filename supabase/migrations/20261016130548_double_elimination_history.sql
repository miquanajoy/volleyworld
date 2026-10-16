-- Double elimination adds up to 31 playoff games: 496 league + 4 play-in + 31.
-- Expand only the match-count check. Ownership policies and immutable archives stay intact.
alter table public.volleyworld_seasons
 drop constraint volleyworld_seasons_played_check,
 add constraint volleyworld_seasons_played_check check (played between 0 and 531);
