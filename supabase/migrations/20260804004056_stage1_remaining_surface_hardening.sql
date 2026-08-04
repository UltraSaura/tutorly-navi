do $$
begin
  if to_regclass('public.configured_models') is not null then
    revoke select on public.configured_models from anon;
    grant select on public.configured_models to authenticated, service_role;
  end if;
end
$$;
