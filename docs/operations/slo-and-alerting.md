# SLO and Alerting

## SLO

- API availability: 99.9%
- dashboard API p95: < 500ms
- search API p95: < 600ms
- import review creation p95: < 2s
- background import completion p95: < 120s for medium file
- notification delivery success: > 99%

## Alert thresholds

- 5xx rate > 2% for 5 min
- p95 latency > 2x baseline for 10 min
- celery queue lag > 300 jobs for 10 min
- failed imports > 5% over 15 min
- sync conflicts spike > 3x daily baseline
- login success rate drop > 20% from baseline

## Required dashboards

- API throughput, latency, error rate
- DB connections and slow queries
- Redis memory and eviction
- Celery queue depth / retries / failures
- frontend JS errors by route
- product analytics funnel for login -> dashboard -> first action
