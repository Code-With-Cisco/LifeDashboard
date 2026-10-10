import {configurationIssues} from '../supabase/functions/dashboard-connectors/configuration.mjs';
const issues=configurationIssues(process.env);
for(const issue of issues)console.error(issue);
if(issues.length)process.exitCode=1;
else console.log('PASS: broker configuration shape; provider login and live acceptance still required');
