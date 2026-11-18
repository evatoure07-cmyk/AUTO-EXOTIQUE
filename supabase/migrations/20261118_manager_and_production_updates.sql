-- Auto Exotique — role Manager, automatic employee logins, production summaries
-- Applied directly to project gkljzpwfmthzjgfzzeoy on 2026-11-18.
-- This migration preserves every existing account, expense note, partner declaration and production declaration.

alter table public.ae_accounts drop constraint if exists ae_accounts_role_check;
alter table public.ae_accounts add constraint ae_accounts_role_check
check (role = any (array['client','mecano_novice','mecano_intermediaire','mecano_experimente','chef_equipe','manager','rh','drh','assistant_direction','copatron','patron']::text[]));

alter table public.ae_profiles drop constraint if exists ae_profiles_role_check;
alter table public.ae_profiles add constraint ae_profiles_role_check
check (role = any (array['client','mecano_novice','mecano_intermediaire','mecano_experimente','chef_equipe','manager','rh','drh','assistant_direction','copatron','patron']::text[]));

create or replace function private.ae_require_direction(p_token text)
returns uuid language plpgsql security definer
set search_path to 'public', 'private'
as $function$
declare aid uuid; r text;
begin
  aid:=private.ae_session_account(p_token);
  if aid is null then raise exception 'Connexion requise'; end if;
  select role into r from public.ae_accounts where id=aid and active=true;
  if r not in ('rh','drh','manager','assistant_direction','copatron','patron') then
    raise exception 'Accès administration requis';
  end if;
  return aid;
end
$function$;

create or replace function private.ae_can_assign_role(p_actor uuid, p_role text)
returns boolean language plpgsql security definer
set search_path to 'public'
as $function$
declare actor_role text;
begin
  select role into actor_role from public.ae_accounts where id=p_actor and active=true;
  if p_role not in ('mecano_novice','mecano_intermediaire','mecano_experimente','chef_equipe','manager','rh','drh','assistant_direction','copatron','patron') then
    return false;
  end if;
  if actor_role in ('assistant_direction','copatron','patron') then return true; end if;
  if actor_role='manager' and p_role in ('mecano_novice','mecano_intermediaire','mecano_experimente','chef_equipe') then return true; end if;
  if actor_role='drh' and p_role in ('mecano_novice','mecano_intermediaire','mecano_experimente','chef_equipe','rh') then return true; end if;
  if actor_role='rh' and p_role in ('mecano_novice','mecano_intermediaire','mecano_experimente','chef_equipe') then return true; end if;
  return false;
end
$function$;

create or replace function private.ae_require_manager(p_token text, p_allow_rh boolean default true)
returns uuid language plpgsql security definer
set search_path to 'public', 'private'
as $function$
declare aid uuid; r text;
begin
  aid:=private.ae_session_account(p_token);
  if aid is null then raise exception 'Connexion requise'; end if;
  select role into r from public.ae_accounts where id=aid and active=true;
  if not (r in ('assistant_direction','copatron','patron','drh','manager') or (p_allow_rh and r='rh')) then
    raise exception 'Accès refusé';
  end if;
  return aid;
end
$function$;

create or replace function public.ae_manager_create_employee(
  p_token text, p_first_name text, p_last_name text, p_login text, p_role text
)
returns jsonb language plpgsql security definer
set search_path to 'public', 'private', 'extensions'
as $function$
declare actor uuid; aid uuid; tmp text; clean_login text; base_login text; suffix text; suffix_n integer := 2;
begin
  actor:=private.ae_require_direction(p_token);
  if not private.ae_can_assign_role(actor,p_role) then raise exception 'Vous ne pouvez pas attribuer ce rôle'; end if;
  if length(trim(coalesce(p_first_name,'')))<1 or length(trim(coalesce(p_last_name,'')))<1 then
    raise exception 'Prénom et nom obligatoires';
  end if;
  clean_login:=lower(trim(p_first_name))||'.'||lower(trim(p_last_name));
  clean_login:=translate(clean_login,'àáâäãåçèéêëìíîïñòóôöõùúûüýÿ','aaaaaaceeeeiiiinooooouuuuyy');
  clean_login:=replace(replace(clean_login,'œ','oe'),'æ','ae');
  clean_login:=regexp_replace(clean_login,'[^a-z0-9]+','.','g');
  clean_login:=trim(both '.' from clean_login);
  if length(clean_login)<3 then raise exception 'Impossible de générer un identifiant valide'; end if;
  base_login:=left(clean_login,40); clean_login:=base_login;
  while exists(select 1 from public.ae_accounts where login=clean_login) loop
    suffix:='.'||suffix_n::text;
    clean_login:=left(base_login,40-length(suffix))||suffix;
    suffix_n:=suffix_n+1;
  end loop;
  tmp:='AE-'||upper(substr(encode(gen_random_bytes(12),'hex'),1,4))||'-'||substr(encode(gen_random_bytes(12),'hex'),1,8);
  insert into public.ae_accounts(login,password_hash,first_name,last_name,role,active,must_change_password,created_by,updated_at)
  values(clean_login,crypt(tmp,gen_salt('bf')),trim(p_first_name),trim(p_last_name),p_role,true,true,actor,now()) returning id into aid;
  insert into public.ae_staff_profiles(account_id,joined_at,interventions_count,on_duty)
  values(aid,current_date,0,false) on conflict(account_id) do nothing;
  insert into public.ae_role_history(account_id,changed_by,old_role,new_role,reason)
  values(aid,actor,null,p_role,'Création du compte');
  perform private.ae_notify_account(aid,'Bienvenue chez Auto Exotic',
    'Votre compte employé a été créé. Utilisez votre mot de passe temporaire puis choisissez votre mot de passe définitif.','account');
  perform private.ae_admin_log(actor,aid,'employee_created',jsonb_build_object('role',p_role,'login',clean_login));
  return jsonb_build_object('account_id',aid,'login',clean_login,'temporary_password',tmp,'role',p_role);
end
$function$;

create or replace function public.ae_manager_production_declarations(p_token text, p_limit integer default 250)
returns jsonb language plpgsql security definer
set search_path to 'public', 'private'
as $function$
declare actor uuid; result jsonb;
begin
  actor:=private.ae_require_manager(p_token,true);
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',x.id,'account_id',x.account_id,'employee',x.employee,'role',x.role,
    'product_id',x.product_id,'product_name',x.product_name,'quantity',x.quantity,
    'sale_price',x.sale_price,'created_at',x.created_at
  ) order by x.created_at desc),'[]'::jsonb)
  into result
  from (
    select d.id,d.account_id,a.first_name||' '||a.last_name as employee,a.role,
           d.product_id,p.name as product_name,d.quantity,p.sale_price,d.created_at
    from public.ae_production_declarations d
    join public.ae_accounts a on a.id=d.account_id
    join public.ae_products p on p.id=d.product_id
    order by d.created_at desc
    limit greatest(1,least(coalesce(p_limit,10000),10000))
  ) x;
  return result;
end
$function$;

create or replace function public.ae_manager_production_top_three(p_token text)
returns jsonb language plpgsql security definer
set search_path to 'public', 'private'
as $function$
declare actor uuid; result jsonb;
begin
  actor:=private.ae_require_manager(p_token,true);
  select coalesce(jsonb_agg(to_jsonb(x) order by x.total_quantity desc,x.employee asc),'[]'::jsonb)
  into result
  from (
    select d.account_id,trim(coalesce(a.first_name,'')||' '||coalesce(a.last_name,'')) as employee,
           a.role,sum(d.quantity)::bigint as total_quantity,count(*)::bigint as declaration_count
    from public.ae_production_declarations d
    join public.ae_accounts a on a.id=d.account_id
    group by d.account_id,a.first_name,a.last_name,a.role
    order by sum(d.quantity) desc,employee asc
    limit 3
  ) x;
  return result;
end
$function$;

revoke all on function public.ae_manager_production_top_three(text) from public;
grant execute on function public.ae_manager_production_top_three(text) to anon, authenticated;


create or replace function public.ae_manager_update_employee_role(
 p_token text,p_account_id uuid,p_new_role text,p_reason text default null
)
returns boolean language plpgsql security definer
set search_path to 'public','private'
as $function$
declare actor uuid; old text;
begin
 actor:=private.ae_require_direction(p_token);
 if actor=p_account_id then raise exception 'Vous ne pouvez pas modifier votre propre rôle'; end if;
 select role into old from public.ae_accounts where id=p_account_id and active=true;
 if old is null or old='client' then raise exception 'Compte employé introuvable'; end if;
 if not private.ae_can_assign_role(actor,old) or not private.ae_can_assign_role(actor,p_new_role) then
  raise exception 'Vous ne pouvez pas effectuer cette modification';
 end if;
 if old=p_new_role then return true; end if;
 update public.ae_accounts set role=p_new_role,updated_at=now() where id=p_account_id;
 insert into public.ae_role_history(account_id,changed_by,old_role,new_role,reason)
 values(p_account_id,actor,old,p_new_role,nullif(trim(coalesce(p_reason,'')), ''));
 perform private.ae_notify_account(
  p_account_id,
  case when
   (case p_new_role when 'patron' then 10 when 'copatron' then 9 when 'assistant_direction' then 8
    when 'drh' then 7 when 'rh' then 6 when 'manager' then 5 when 'chef_equipe' then 4
    when 'mecano_experimente' then 3 when 'mecano_intermediaire' then 2 else 1 end)
   >
   (case old when 'patron' then 10 when 'copatron' then 9 when 'assistant_direction' then 8
    when 'drh' then 7 when 'rh' then 6 when 'manager' then 5 when 'chef_equipe' then 4
    when 'mecano_experimente' then 3 when 'mecano_intermediaire' then 2 else 1 end)
   then 'Promotion' else 'Changement de grade' end,
  'Votre grade Auto Exotic est passé de '||old||' à '||p_new_role||'.','team'
 );
 perform private.ae_admin_log(actor,p_account_id,'role_changed',
  jsonb_build_object('old_role',old,'new_role',p_new_role,'reason',nullif(trim(coalesce(p_reason,'')), '')));
 return true;
end
$function$;
