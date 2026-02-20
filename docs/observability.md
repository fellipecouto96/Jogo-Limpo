# Observability Playbook

This guide defines the minimum logging, dashboard queries, and alerting rules
for the onboarding + draw flow.

## Dashboards (SQL)

Onboarding success vs failure (last 24h):
```sql
SELECT
  date_trunc('hour', "timestamp") AS hour,
  SUM(CASE WHEN level = 'INFO' THEN 1 ELSE 0 END) AS success_count,
  SUM(CASE WHEN level = 'WARN' THEN 1 ELSE 0 END) AS validation_count,
  SUM(CASE WHEN level = 'ERROR' THEN 1 ELSE 0 END) AS error_count
FROM system_logs
WHERE journey = 'onboarding'
  AND "timestamp" >= NOW() - INTERVAL '24 hours'
GROUP BY 1
ORDER BY 1 DESC;
```

Top onboarding errors (last 7d):
```sql
SELECT message, COUNT(*) AS total
FROM system_logs
WHERE journey = 'onboarding'
  AND level IN ('WARN', 'ERROR')
  AND "timestamp" >= NOW() - INTERVAL '7 days'
GROUP BY message
ORDER BY total DESC
LIMIT 20;
```

Average onboarding latency (if request time is available in APM):
Use Vercel request metrics + filter route `/onboarding/setup`.

## Alerts (recommended)

1. **Onboarding error spike**
   Trigger when `ERROR` logs for `journey='onboarding'` >= 5 in 10 minutes.

2. **Validation error spike**
   Trigger when `WARN` logs for `journey='onboarding'` >= 20 in 10 minutes.
   This usually signals UI regression or confusing copy.

3. **No success logs**
   Trigger when `INFO` logs for `journey='onboarding'` is zero for 30 minutes
   during business hours.

## Notes

- The backend logs are persisted in `system_logs`.
- Make sure the `system_logs` table exists before enabling alerts.
