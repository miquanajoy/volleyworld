-- Separate Swiss storage; all existing modes and user rows remain unchanged.
create or replace function public.volleyworld_challenger_state_valid(s jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare
 roster jsonb := s->'roster';
 sizes integer[] := array[16,16,16,12,6];
 slots integer[] := array[1,16,8,9,4,13,5,12,2,15,7,10,3,14,6,11];
 regions jsonb := '{"POL":"CEV","ITA":"CEV","RUS":"CEV","USA":"NORCECA","JPN":"AVC","BRA":"CSV","SLO":"CEV","FRA":"CEV","BUL":"CEV","FIN":"CEV","GER":"CEV","UKR":"CEV","CUB":"NORCECA","ARG":"CSV","BEL":"CEV","CAN":"NORCECA","TUR":"CEV","SRB":"CEV","IRI":"AVC","CZE":"CEV","GRE":"CEV","ROU":"CEV","NED":"CEV","MEX":"NORCECA","KOR":"AVC","PUR":"NORCECA","DEN":"CEV","CHI":"CSV","EGY":"CAVB","EST":"CEV","TUN":"CAVB","POR":"CEV","SUI":"CEV","CHN":"AVC","ISR":"CEV","ESP":"CEV","SWE":"CEV","BLR":"CEV","PAK":"AVC","CRO":"CEV","AUS":"AVC","COL":"CSV","QAT":"AVC","BRN":"AVC","LAT":"CEV","INA":"AVC","HUN":"CEV","IND":"AVC","CMR":"CAVB","DOM":"NORCECA","SVK":"CEV","THA":"AVC","MKD":"CEV","TPE":"AVC","AUT":"CEV","VEN":"CSV","SMR":"CEV","VIE":"AVC","DMA":"NORCECA","SCO":"CEV","OMA":"AVC","MNE":"CEV","LCA":"NORCECA","BIZ":"NORCECA","BAR":"NORCECA","KEN":"CAVB","CYP":"CEV","NGR":"CAVB","JAM":"NORCECA","ALG":"CAVB","TKM":"AVC","KGZ":"AVC","ALB":"CEV","KAZ":"AVC","NCA":"NORCECA","UAE":"AVC","BOL":"CSV","GHA":"CAVB","RWA":"CAVB","BAN":"AVC","KSA":"AVC","ANT":"NORCECA","NOR":"CEV","BIH":"CEV","NIR":"CEV","LBA":"CAVB","NIG":"CAVB","GUA":"NORCECA","UGA":"CAVB","SRI":"AVC","SEN":"CAVB","PHI":"AVC","CUW":"NORCECA","FRO":"CEV","GRN":"NORCECA","ESA":"NORCECA","IRQ":"AVC","KUW":"AVC","MAR":"CAVB","BAH":"NORCECA"}'::jsonb;
 ranks jsonb := '{"POL":1,"ITA":2,"RUS":3,"USA":4,"JPN":5,"BRA":6,"SLO":7,"FRA":8,"BUL":9,"FIN":10,"GER":11,"UKR":12,"CUB":13,"ARG":14,"BEL":15,"CAN":16,"TUR":17,"SRB":18,"IRI":19,"CZE":20,"GRE":21,"ROU":22,"NED":23,"MEX":24,"KOR":25,"PUR":26,"DEN":27,"CHI":28,"EGY":29,"EST":30,"TUN":31,"POR":32,"SUI":33,"CHN":34,"ISR":35,"ESP":36,"SWE":37,"BLR":38,"PAK":39,"CRO":40,"AUS":41,"COL":42,"QAT":43,"BRN":44,"LAT":45,"INA":46,"HUN":47,"IND":48,"CMR":49,"DOM":50,"SVK":51,"THA":52,"MKD":53,"TPE":54,"AUT":55,"VEN":56,"SMR":57,"VIE":58,"DMA":59,"SCO":60,"OMA":61,"MNE":62,"LCA":63,"BIZ":64,"BAR":65,"KEN":66,"CYP":67,"NGR":68,"JAM":69,"ALG":70,"TKM":71,"KGZ":72,"ALB":73,"KAZ":74,"NCA":75,"UAE":76,"BOL":77,"GHA":78,"RWA":79,"BAN":80,"KSA":81,"ANT":82,"NOR":83,"BIH":84,"NIR":85,"LBA":86,"NIG":87,"GUA":88,"UGA":89,"SRI":90,"SEN":91,"PHI":92,"CUW":93,"FRO":94,"GRN":95,"ESA":96,"IRQ":97,"KUW":98,"MAR":99,"BAH":100}'::jsonb;
 caps jsonb := '{"CEV":16,"AVC":12,"NORCECA":12,"CAVB":8,"CSV":6}'::jsonb;
 reg text; previous_rank integer:=0;
 records jsonb := '{}'; round_data jsonb; m jsonb; b jsonb; prior_ms jsonb;
 ri integer:=0; mi integer; prior_max bigint:=0; current_max bigint; ord bigint;
 a text; c text; id text; pair_key text; k text; prior text; prefix text;
 w text; l text; players text[]; all_pairs text[]:='{}'; orders bigint[]:='{}';
 match_ids text[]:='{}'; active text[]; all_matches jsonb; expected integer; seed integer; pos integer;
 entrants text[]:='{}'; qualified text[]; stamp timestamptz;
begin
 if s is null or jsonb_typeof(s) is distinct from 'object' or octet_length(s::text)>1000000
 or s->>'mode' is distinct from 'challenger' or s->'version' is distinct from '1'::jsonb
 or coalesce(s->>'seasonId','') !~ '^[a-zA-Z0-9-]{1,100}$'
 or jsonb_typeof(s->'seasonNumber') is distinct from 'number' or (s->>'seasonNumber')::numeric not between 1 and 2147483647 or (s->>'seasonNumber')::numeric<>trunc((s->>'seasonNumber')::numeric)
 or jsonb_typeof(s->'createdAt') is distinct from 'string' or coalesce(s->>'createdAt','')='' then return false; end if;
 stamp:=(s->>'createdAt')::timestamptz;
 if not isfinite(stamp) or jsonb_typeof(roster) is distinct from 'array' or jsonb_array_length(roster)<>32 or jsonb_typeof(s->'tie') is distinct from 'array' or jsonb_array_length(s->'tie')<>32 or not (s->'tie' @> roster and roster @> (s->'tie'))
 or jsonb_typeof(s->'rounds') is distinct from 'array' or jsonb_array_length(s->'rounds') not between 1 and 5 then return false; end if;
 if (select count(distinct value) from jsonb_array_elements(s->'tie'))<>32 then return false;end if;
 if (select count(distinct value) from jsonb_array_elements(roster))<>32 then return false;end if;
 for id in select value from jsonb_array_elements_text(roster) loop
  if id is null or not(regions ? id) or (ranks->>id)::int<=previous_rank then return false;end if;
  previous_rank:=(ranks->>id)::int;
 end loop;
 for reg in select jsonb_object_keys(caps) loop
  select count(*) into expected from jsonb_array_elements_text(roster) q(value) where (regions->>q.value)=reg;
  if expected<2 or expected>(caps->>reg)::int then return false;end if;
 end loop;
 for id in select value from jsonb_array_elements_text(roster) loop records:=jsonb_set(records,array[id],jsonb_build_object('w',0,'l',0)); end loop;
 all_matches:=(select coalesce(jsonb_agg(value),'[]') from jsonb_path_query(s,'$.rounds[*][*]') q(value)) || (select coalesce(jsonb_agg(value),'[]') from jsonb_path_query(s,'$.bracket.*[*]') q(value));
 for m in select value from jsonb_array_elements(all_matches) loop
  if jsonb_typeof(m) is distinct from 'object' or coalesce(m->>'id','')='' or m->>'id'=any(match_ids) or not(roster ? (m->>'a')) or not(roster ? (m->>'b')) or m->>'a'=m->>'b' or not coalesce(public.volleyworld_full_score_valid(m->'sets'),false) then return false;end if;
  match_ids:=array_append(match_ids,m->>'id');
  if m->'sets'<>'null'::jsonb then
   if jsonb_typeof(m->'resultOrder') is distinct from 'number' or (m->>'resultOrder')::numeric<>trunc((m->>'resultOrder')::numeric) or (m->>'resultOrder')::numeric not between 1 and 9007199254740991 then return false;end if;
   ord:=(m->>'resultOrder')::bigint;if ord=any(orders) then return false;end if;orders:=array_append(orders,ord);
  elsif m ? 'resultOrder' then return false;end if;
 end loop;
 for round_data in select value from jsonb_array_elements(s->'rounds') loop
  if jsonb_typeof(round_data) is distinct from 'array' or jsonb_array_length(round_data)<>sizes[ri+1] then return false;end if;
  if ri>0 and exists(select 1 from jsonb_array_elements(s->'rounds'->(ri-1)) q where q->'sets'='null'::jsonb) then return false;end if;
  select array_agg(key order by key) into active from jsonb_each(records) where (value->>'w')::int<3 and (value->>'l')::int<3;
  players:='{}';mi:=0;current_max:=prior_max;
  for m in select value from jsonb_array_elements(round_data) loop
   a:=m->>'a';c:=m->>'b';pair_key:=least(a,c)||':'||greatest(a,c);
   if m->>'id' is distinct from 'C'||ri||'-'||mi or not(a=any(active) and c=any(active)) or a=any(players) or c=any(players) or records->a is distinct from records->c or pair_key=any(all_pairs) then return false;end if;
   if ri=0 and (regions->>a=regions->>c) then return false;end if;
   if ri=0 and ((select ordinality from jsonb_array_elements_text(roster) with ordinality t(value,ordinality) where value=a)>16 or (select ordinality from jsonb_array_elements_text(roster) with ordinality t(value,ordinality) where value=c)<=16) then return false;end if;
   if m->'sets'<>'null'::jsonb and (m->>'resultOrder')::bigint<=prior_max then return false;end if;
   current_max:=greatest(current_max,coalesce((m->>'resultOrder')::bigint,0));
   players:=players||array[a,c];all_pairs:=array_append(all_pairs,pair_key);mi:=mi+1;
  end loop;
  if cardinality(players)<>cardinality(active) then return false;end if;
  for m in select value from jsonb_array_elements(round_data) loop
   if m->'sets'<>'null'::jsonb then
    w:=public.volleyworld_full_winner(m);l:=public.volleyworld_full_winner(m,false);
    records:=jsonb_set(records,array[w,'w'],to_jsonb((records->w->>'w')::int+1));records:=jsonb_set(records,array[l,'l'],to_jsonb((records->l->>'l')::int+1));
   end if;
  end loop;
  prior_max:=current_max;ri:=ri+1;
 end loop;
 b:=s->'bracket';if b='null'::jsonb then return true;end if;
 if jsonb_typeof(b) is distinct from 'object' or (select count(*) from jsonb_object_keys(b))<>5 or not(b ?& array['r16','qf','sf','bronze','final']) or ri<>5 or exists(select 1 from jsonb_array_elements(s->'rounds'->4) q where q->'sets'='null'::jsonb) then return false;end if;
 for k in select unnest(array['r16','qf','sf','bronze','final']) loop if jsonb_typeof(b->k) is distinct from 'array' then return false;end if;end loop;
 if jsonb_array_length(b->'r16')<>8 then return false;end if;
 select array_agg(key) into qualified from jsonb_each(records) where (value->>'w')::int=3;
 mi:=0;pos:=0;
 for m in select value from jsonb_array_elements(b->'r16') loop
  if m->>'id' is distinct from 'CR'||mi or m->'sets'<>'null'::jsonb and (m->>'resultOrder')::bigint<=prior_max then return false;end if;
  foreach id in array array[m->>'a',m->>'b'] loop
   pos:=pos+1;seed:=slots[pos];
   if not(id=any(qualified)) or id=any(entrants) or (records->id->>'l')::int<>(case when seed<=4 then 0 when seed<=10 then 1 else 2 end) then return false;end if;
   entrants:=array_append(entrants,id);
  end loop;mi:=mi+1;
 end loop;
 if cardinality(entrants)<>16 or cardinality(qualified)<>16 then return false;end if;
 for k in select unnest(array['qf','sf','final','bronze']) loop
  prior:=case k when 'qf' then 'r16' when 'sf' then 'qf' else 'sf' end;
  prefix:=case k when 'qf' then 'CQ' when 'sf' then 'CS' when 'final' then 'CF' else 'CB' end;
  prior_ms:=b->prior;
  expected:=case when jsonb_array_length(prior_ms)>0 and not exists(select 1 from jsonb_array_elements(prior_ms) q where q->'sets'='null'::jsonb) then case when k='bronze' then 1 else jsonb_array_length(prior_ms)/2 end else 0 end;
  if jsonb_array_length(b->k)<>expected then return false;end if;
  select coalesce(max((value->>'resultOrder')::bigint),0) into current_max from jsonb_array_elements(prior_ms);
  mi:=0;
  for m in select value from jsonb_array_elements(b->k) loop
   if m->>'id' is distinct from prefix||mi or m->>'a' is distinct from public.volleyworld_full_winner(prior_ms->(mi*2),k<>'bronze') or m->>'b' is distinct from public.volleyworld_full_winner(prior_ms->(mi*2+1),k<>'bronze') or m->'sets'<>'null'::jsonb and (m->>'resultOrder')::bigint<=current_max then return false;end if;
   mi:=mi+1;
  end loop;
 end loop;
 if b->'final'->0->'sets' is not null and b->'final'->0->'sets'<>'null'::jsonb and (b->'bronze'->0->'sets' is null or b->'bronze'->0->'sets'='null'::jsonb or (b->'final'->0->>'resultOrder')::bigint <= (b->'bronze'->0->>'resultOrder')::bigint) then return false;end if;
 return true;
exception when others then return false;
end $$;

create or replace function public.volleyworld_challenger_derive() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if not coalesce(public.volleyworld_challenger_state_valid(new.state),false) then raise exception 'INVALID_CHALLENGER';end if;
 if tg_op='UPDATE' then
  if old.user_id<>new.user_id or old.season_id<>new.state->>'seasonId' or old.season_number<>(new.state->>'seasonNumber')::integer or old.created_at<>(new.state->>'createdAt')::timestamptz then raise exception 'IMMUTABLE_CHALLENGER_METADATA';end if;
  if old.played>0 and old.state->'roster' is distinct from new.state->'roster' then raise exception 'IMMUTABLE_CHALLENGER_ROSTER';end if;
  if old.status='completed' and old.state is distinct from new.state then raise exception 'SAVE_CONFLICT: completed Challenger is immutable';end if;
  if new.revision<>old.revision+1 then raise exception 'SAVE_CONFLICT: invalid revision';end if;
 elsif new.revision<>1 then raise exception 'SAVE_CONFLICT: invalid initial revision';end if;
 new.season_id:=new.state->>'seasonId';new.season_number:=(new.state->>'seasonNumber')::integer;new.created_at:=(new.state->>'createdAt')::timestamptz;new.updated_at:=now();
 select count(*) into new.played from (select value from jsonb_path_query(new.state,'$.rounds[*][*]') q(value) union all select value from jsonb_path_query(new.state,'$.bracket.*[*]') q(value)) q where value->'sets'<>'null'::jsonb;
 new.status:='active';new.podium:='[]'::jsonb;
 if new.state->'bracket'->'final'->0->'sets' is not null and new.state->'bracket'->'final'->0->'sets'<>'null'::jsonb then
  new.status:='completed';new.podium:=jsonb_build_array(public.volleyworld_full_winner(new.state->'bracket'->'final'->0),public.volleyworld_full_winner(new.state->'bracket'->'final'->0,false),public.volleyworld_full_winner(new.state->'bracket'->'bronze'->0));
 end if;
 return new;
end $$;
