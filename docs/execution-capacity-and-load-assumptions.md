# Execution Capacity and Load Assumptions

## Purpose

These are closed-beta planning assumptions, not observed production metrics and not authorizing spend.

## Baseline assumptions

| Metric                  | Assumption |
| ----------------------- | ---------- |
| Registered users        | 1,000      |
| Daily active users      | 300        |
| Peak concurrent users   | 100        |
| AI turns per day        | 6,000      |
| AI tokens per day       | 10,000,000 |
| Audio minutes per day   | 500        |
| Sync operations per day | 100,000    |
| Storage footprint       | 50 GB      |

## Safety caps

| Surface                             | Cap                           |
| ----------------------------------- | ----------------------------- |
| Staging AI spend                    | USD 50 per month              |
| Closed-beta variable AI/media spend | USD 250 per month             |
| AI availability                     | Disabled until owner approval |

## Operating rules

- Treat the caps as non-authorizing guardrails.
- Recheck the assumptions before widening beta access.
- If any assumption is exceeded, slow release rather than silently increasing spend.
- In-process auth guardrails now rate-limit email OTP at 5 requests per email and 30 requests per network identity per 15 minutes, with 10,000 hashed buckets max; the shared network identity only applies when ingress overwrites the proxy IP headers.
- Auth return-path cookies are capped to one generic cookie or one flow-specific
  cookie per callback, with at most four pending flow cookies and a 256
  raw-character / 768 encoded-character return-target budget.

## Known uncertainties

- Actual AI turn length and token mix
- Audio usage distribution across tutor, reading, and speaking flows
- Storage growth once user-generated content or transcripts are enabled
