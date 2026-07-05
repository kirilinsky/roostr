-- One-time backfill after adding users.eggs_bought (run once, after `db:push`).
-- Seeds the new authoritative counter from the historical ledger so existing
-- buyers keep their escalating price instead of resetting to the base price.
-- Safe to re-run: it recomputes from the ledger each time (idempotent).
UPDATE users u
SET eggs_bought = COALESCE((
  SELECT count(*)
  FROM resource_txns t
  WHERE t.user_id = u.id
    AND t.resource = 'egg'
    AND t.kind = 'egg_shop'
    AND t.amount > 0
), 0);
