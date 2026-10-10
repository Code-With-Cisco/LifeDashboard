-- Read-only schema inventory. Contains no application rows or Auth credentials.
-- Keep the result private and outside Git; review before using as a test baseline.
BEGIN READ ONLY;
SELECT jsonb_build_object(
 'tables',(SELECT jsonb_agg(jsonb_build_object('name',c.relname,'kind',c.relkind,'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'owner',pg_get_userbyid(c.relowner)) ORDER BY c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','S')),
 'columns',(SELECT jsonb_agg(jsonb_build_object('table',c.relname,'name',a.attname,'position',a.attnum,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid),'identity',a.attidentity,'generated',a.attgenerated) ORDER BY c.relname,a.attnum) FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE n.nspname='public' AND c.relkind IN ('r','p') AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT jsonb_agg(jsonb_build_object('table',c.relname,'name',con.conname,'type',con.contype,'definition',pg_get_constraintdef(con.oid,true)) ORDER BY c.relname,con.conname) FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'),
 'indexes',(SELECT jsonb_agg(jsonb_build_object('table',tablename,'name',indexname,'definition',indexdef) ORDER BY tablename,indexname) FROM pg_indexes WHERE schemaname='public'),
 'functions',(SELECT jsonb_agg(jsonb_build_object('name',p.proname,'arguments',pg_get_function_identity_arguments(p.oid),'definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl) ORDER BY p.proname,p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind IN ('f','p')),
 'policies',(SELECT jsonb_agg(to_jsonb(p) ORDER BY tablename,policyname) FROM pg_policies p WHERE schemaname='public'),
 'triggers',(SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'table',c.relname,'name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid,true)) ORDER BY n.nspname,c.relname,t.tgname) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_proc f ON f.oid=t.tgfoid JOIN pg_namespace fn ON fn.oid=f.pronamespace WHERE NOT t.tgisinternal AND (n.nspname='public' OR (n.nspname='auth' AND fn.nspname='public'))),
 'table_grants',(SELECT jsonb_agg(to_jsonb(g) ORDER BY table_name,grantee,privilege_type) FROM information_schema.table_privileges g WHERE table_schema='public'),
 'column_grants',(SELECT jsonb_agg(to_jsonb(g) ORDER BY table_name,column_name,grantee,privilege_type) FROM information_schema.column_privileges g WHERE table_schema='public'),
 'routine_grants',(SELECT jsonb_agg(to_jsonb(g) ORDER BY routine_name,grantee) FROM information_schema.routine_privileges g WHERE routine_schema='public'),
 'default_acl',(SELECT jsonb_agg(jsonb_build_object('owner',pg_get_userbyid(d.defaclrole),'schema',n.nspname,'type',d.defaclobjtype,'acl',d.defaclacl)) FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace WHERE n.nspname='public' OR d.defaclnamespace=0),
 'extensions',(SELECT jsonb_agg(jsonb_build_object('name',e.extname,'schema',n.nspname,'version',e.extversion) ORDER BY e.extname) FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace),
 'custom_types',(SELECT jsonb_agg(jsonb_build_object('name',t.typname,'type',t.typtype)) FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typtype IN ('e','d'))
) AS schema_inventory;
COMMIT;
