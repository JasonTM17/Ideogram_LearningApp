# Content rights ledger

## Japanese N5 pilot

| Field                         | Current record                                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Release                       | `ja-n5-vietnamese-first-pilot` v1.0.0                                                                                    |
| Scope                         | 2 units, 12 lessons, 156 vocabulary/review entries, 40 transcripted listening scripts, 25 learner-safe placement prompts |
| Source kind                   | Original Vietnamese-first instructional text authored in this repository                                                 |
| Canonical source              | `content/japanese/v1/source/` and generated `content/japanese/v1/manifest.json`                                          |
| Release state                 | `review`; all activities remain `draft` and must not reach learners yet                                                  |
| Audio state                   | 40 stable media keys are planned; no recording, checksum, or publish claim exists in this repository                     |
| Recorded media registry       | `content/media/recorded-audio-assets.json`; a recorded item must map to a local checked asset and matching SHA-256       |
| Machine-readable rights state | `content/licenses/release-rights-status.json`                                                                            |

## Rights decision

The product owner must record the final rights decision before importing a
release as `published`. Until then, every rights flag in the authored manifest
is deliberately `false`; the draft cannot be used for adaptation, retrieval,
AI-provider processing, or redistribution. The intended future policy applies
only to the authored text and does not grant rights to third-party JLPT, HSK,
TOPIK, textbook, audio, image, or exam material.

| Permission             | Draft policy             | Publish gate                         |
| ---------------------- | ------------------------ | ------------------------------------ |
| Adaptation             | `false` pending approval | Owner confirms source ownership      |
| Embedding/retrieval    | `false` pending approval | AI retrieval scope approved          |
| AI-provider processing | `false` pending approval | Provider/privacy review approved     |
| Redistribution         | `false` pending approval | Product distribution review approved |

## Review ownership

Before a release may become `published`, assign and record a real accountable
content editor, Japanese-language reviewer, Vietnamese pedagogy reviewer, and
audio producer. Each activity must receive a reviewer name, a final status,
and—when listening is published—a recorded file and SHA-256 checksum. The
repository intentionally does not invent approvals, identities, or recording
evidence for this draft corpus.

## Import guard

Run `pnpm generate:ja-n5-content` followed by `pnpm content:lint`. The lint
gate rejects missing provenance, malformed learner-safe placement prompts,
unpublished media claims, rights-ledger mismatches, and promotion of the
Chinese/Korean contract fixtures.
