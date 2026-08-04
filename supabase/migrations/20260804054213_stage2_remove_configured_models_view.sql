do $$
begin
  if to_regclass('public.configured_models') is not null then
    revoke all privileges on public.configured_models from PUBLIC, anon, authenticated, service_role;
    drop view public.configured_models;
  end if;
end
$$;
