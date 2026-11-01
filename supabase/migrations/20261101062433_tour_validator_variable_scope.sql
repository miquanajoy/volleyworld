create or replace function public.volleyworld_tour_league_valid(l jsonb,roster jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$
#variable_conflict use_column
declare norm jsonb; ranked jsonb; b jsonb:=l->'bracket';p jsonb:=l->'playin';m jsonb;ms jsonb;k text;prior text;prefix text;idx integer;i integer;expected integer;seed integer;id text;used text[]:='{}';keys text[]:='{}';orders bigint[]:='{}';prior_ms jsonb;done boolean:=false;prior_max bigint;
begin
 if l->>'version' is distinct from '1' or l->>'playoffFormat' is distinct from 'single' or l->>'playoffEntry' is distinct from 'top16' or l->'setupConfirmed' is distinct from 'true'::jsonb then return false;end if;
 select jsonb_set(l,'{rounds}',jsonb_agg(row_data order by r)) into norm from (select r,jsonb_agg(jsonb_set(m,'{id}',to_jsonb(regexp_replace(m->>'id','^L','L-'))) order by n) row_data from jsonb_array_elements(l->'rounds') with ordinality x(rd,r) cross join lateral jsonb_array_elements(rd) with ordinality q(m,n) group by r) q;
 if not public.volleyworld_full_league_valid(norm,roster,'L') then return false;end if;
 -- All matches of a League round must finish before the next round can start.
 for ms in select value from jsonb_array_elements(l->'rounds') loop
  if done and exists(select 1 from jsonb_array_elements(ms) q(m) where m->'sets'<>'null'::jsonb) then return false;end if;
  if exists(select 1 from jsonb_array_elements(ms) q(m) where m->'sets'='null'::jsonb) then done:=true;end if;
 end loop;
 for m in select value from public.volleyworld_tour_matches(jsonb_build_object('league',l)) q(value) loop
  if jsonb_typeof(m)<>'object' or not(roster ? (m->>'a')) or not(roster ? (m->>'b')) or m->>'a'=m->>'b' or coalesce(m->>'id','') !~ '^[LPRQSFBD0-9-]+$' or m->>'id'=any(keys) or not public.volleyworld_full_score_valid(m->'sets') then return false;end if;keys:=array_append(keys,m->>'id');
  if m->'sets'<>'null'::jsonb then
   if jsonb_typeof(m->'resultOrder') is distinct from 'number' or (m->>'resultOrder')::numeric<>trunc((m->>'resultOrder')::numeric) or (m->>'resultOrder')::numeric not between 1 and 9007199254740991 or (m->>'resultOrder')::bigint=any(orders) then return false;end if;orders:=array_append(orders,(m->>'resultOrder')::bigint);
  elsif m ? 'resultOrder' then return false;end if;
 end loop;
 if p='null'::jsonb then return b='null'::jsonb;end if;
 if done or jsonb_typeof(p)<>'array' or jsonb_array_length(p)<>4 then return false;end if;
 ranked:=public.volleyworld_full_group_table(l);i:=0;
 for m in select value from jsonb_array_elements(p) loop
  if m->>'id' is distinct from 'P'||i or m->>'a' is distinct from ranked->>(16+i) or m->>'b' is distinct from ranked->>(23-i) then return false;end if;i:=i+1;
 end loop;
 if b='null'::jsonb then return true;end if;
 if jsonb_typeof(b)<>'object' or exists(select 1 from jsonb_array_elements(p) q(m) where m->'sets'='null'::jsonb) or (select count(*) from jsonb_object_keys(b))<>7 or not(b ?& array['seeds','r20','r16','qf','sf','bronze','final']) or jsonb_array_length(b->'r20')<>4 then return false;end if;
 i:=0;for m in select value from jsonb_array_elements(b->'r20') loop
  if m->>'id' is distinct from 'D'||i or m->>'a' is distinct from ranked->>(12+i) or m->>'b' is distinct from public.volleyworld_full_winner(p->(3-i)) then return false;end if;i:=i+1;
 end loop;
 if jsonb_array_length(b->'r16')=0 then
  return b->'seeds'='{}'::jsonb and b->'qf'='[]'::jsonb and b->'sf'='[]'::jsonb and b->'bronze'='[]'::jsonb and b->'final'='[]'::jsonb;
 end if;
 if jsonb_array_length(b->'r16')<>8 or exists(select 1 from jsonb_array_elements(b->'r20') q(m) where m->'sets'='null'::jsonb) or jsonb_typeof(b->'seeds')<>'object' or (select count(*) from jsonb_object_keys(b->'seeds'))<>16 then return false;end if;
 i:=0;for id in select value from jsonb_array_elements_text(ranked) limit 12 loop
  if b->'seeds'->>id is distinct from (i/4+1)::text then return false;end if;i:=i+1;
 end loop;
 for m in select value from jsonb_array_elements(b->'r20') loop
  if b->'seeds'->>public.volleyworld_full_winner(m) is distinct from '4' then return false;end if;
 end loop;
 i:=0;for m in select value from jsonb_array_elements(b->'r16') loop
  if m->>'id' is distinct from 'R'||i then return false;end if;
  if b->'seeds'->>(m->>'a') is distinct from (case when i%2=0 then '1' else '2' end) or b->'seeds'->>(m->>'b') is distinct from (case when i%2=0 then '4' else '3' end) then return false;end if;
  foreach id in array array[m->>'a',m->>'b'] loop if id=any(used) then return false;end if;used:=array_append(used,id);end loop;i:=i+1;
 end loop;
 foreach k in array array['qf','sf','bronze','final'] loop
  prior:=case k when 'qf' then 'r16' when 'sf' then 'qf' else 'sf' end;prior_ms:=b->prior;
  prefix:=case k when 'qf' then 'Q' when 'sf' then 'S' when 'bronze' then 'B' else 'F' end;
  expected:=case when jsonb_array_length(prior_ms)>0 and not exists(select 1 from jsonb_array_elements(prior_ms) q(m) where m->'sets'='null'::jsonb) then case when k='bronze' then 1 else jsonb_array_length(prior_ms)/2 end else 0 end;
  if jsonb_array_length(b->k)<>expected then return false;end if;
  i:=0;for m in select value from jsonb_array_elements(b->k) loop
   if m->>'id' is distinct from prefix||i or m->>'a' is distinct from public.volleyworld_full_winner(prior_ms->(i*2),k<>'bronze') or m->>'b' is distinct from public.volleyworld_full_winner(prior_ms->(i*2+1),k<>'bronze') then return false;end if;i:=i+1;
  end loop;
 end loop;
 if b->'final'->0->'sets' is not null and b->'final'->0->'sets'<>'null'::jsonb and (b->'bronze'->0->'sets' is null or b->'bronze'->0->'sets'='null'::jsonb or (b->'final'->0->>'resultOrder')::bigint <= (b->'bronze'->0->>'resultOrder')::bigint) then return false;end if;
 return true;
exception when others then return false;
end $$;

