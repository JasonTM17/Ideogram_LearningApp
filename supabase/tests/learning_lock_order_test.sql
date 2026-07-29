begin;

select plan(7);

select ok(
  position(
    'for update' in lower(pg_get_functiondef('private.lock_content_release(text)'::regprocedure))
  ) > 0
  and position(
    'pg_advisory_xact_lock' in lower(pg_get_functiondef('private.lock_content_release(text)'::regprocedure))
  ) > 0
  and position(
    'for update' in lower(pg_get_functiondef('private.lock_content_release(text)'::regprocedure))
  ) < position(
    'pg_advisory_xact_lock' in lower(pg_get_functiondef('private.lock_content_release(text)'::regprocedure))
  ),
  'content release helper locks the row before its lifecycle advisory lock'
);
select ok(
  position(
    'private.lock_content_release' in lower(pg_get_functiondef('private.require_visible_learning_release(text)'::regprocedure))
  ) > 0
  and position(
    'pg_advisory_xact_lock' in lower(pg_get_functiondef('private.require_visible_learning_release(text)'::regprocedure))
  ) = 0,
  'learner release validation delegates lifecycle locking to the ordered helper'
);
select ok(
  position(
    'private.lock_content_release' in lower(pg_get_functiondef('private.enforce_content_item_publication()'::regprocedure))
  ) < position(
    'private.require_reviewed_content_provenance' in lower(pg_get_functiondef('private.enforce_content_item_publication()'::regprocedure))
  ),
  'content publication takes the release lock before provenance validation'
);
select ok(
  position(
    'for update' in lower(pg_get_functiondef('private.lock_placement_question_set(uuid)'::regprocedure))
  ) > 0
  and position(
    'pg_advisory_xact_lock' in lower(pg_get_functiondef('private.lock_placement_question_set(uuid)'::regprocedure))
  ) > 0
  and position(
    'for update' in lower(pg_get_functiondef('private.lock_placement_question_set(uuid)'::regprocedure))
  ) < position(
    'pg_advisory_xact_lock' in lower(pg_get_functiondef('private.lock_placement_question_set(uuid)'::regprocedure))
  ),
  'placement question-set helper locks the row before its lifecycle advisory lock'
);
select ok(
  position(
    'private.lock_placement_question_set' in lower(pg_get_functiondef('private.require_visible_placement_question_set(uuid)'::regprocedure))
  ) > 0
  and position(
    'pg_advisory_xact_lock' in lower(pg_get_functiondef('private.require_visible_placement_question_set(uuid)'::regprocedure))
  ) = 0,
  'learner placement validation delegates lifecycle locking to the ordered helper'
);
select ok(
  position(
    'private.lock_placement_question_set' in lower(pg_get_functiondef('private.enforce_placement_question_lifecycle()'::regprocedure))
  ) < position(
    'private.require_reviewed_content_provenance' in lower(pg_get_functiondef('private.enforce_placement_question_lifecycle()'::regprocedure))
  ),
  'placement question publication takes the set lock before provenance validation'
);
select ok(
  exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.placement_question_sets'::regclass
      and tgname = 'abandon_draft_placement_sessions_after_question_set_archive'
      and not tgisinternal
  ),
  'placement-set archive installs the draft-session cleanup trigger'
);

select * from finish();
rollback;
