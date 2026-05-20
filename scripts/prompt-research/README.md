# prompt-research

Offline eval harness for the CloudGreet agent-prompt pipeline.

The whole point: every time we touch `lib/agent-builder/*` (the prompt
generator, the universal layer, the few-shot examples), we want to
know — before any contractor's phone rings — whether we just made the
generated agents better or worse. This harness runs a battery of
synthetic call scenarios end-to-end and produces a scored report.

## How it works

1. **Banks** — pre-authored test inputs:
   - `banks/businesses/*.json` — synthetic `BusinessContext` objects
     spanning industries, sizes, and tones.
   - `banks/scenarios/*.json` — caller scenarios: a persona, an
     opening line, tool-call expectations, and what "passing" looks
     like for this scenario.
   - `banks/rubric.md` — the scoring rubric Claude uses as a judge.

2. **Eval loop** — for each (business, scenario) pair selected by the
   matrix:
   1. Feed the business context to the real `generateAgentPrompt()`
      from `lib/agent-builder/generate.ts` → get a Retell agent prompt.
   2. Append the universal layer via `composeFinalPrompt()`.
   3. Run a Claude-vs-Claude conversation: one Claude plays the
      caller persona, the other plays the receptionist using the
      generated prompt + the three custom tools (book_appointment,
      send_booking_sms, lookup_availability) + the two built-ins
      (transfer_call, end_call). Tool calls are mocked per scenario.
   4. Hand the transcript + rubric to Claude-as-judge → score 0-3 per
      category with justification.

3. **Report** — `runs/<timestamp>/report.md` with overall pass-rate,
   per-category scores, and the worst-performing transcripts inline
   so failures are easy to read.

## Running it

You need `ANTHROPIC_API_KEY` in env. Pull it from Vercel:

```bash
vercel env pull .env.local
npx tsx --env-file=.env.local scripts/prompt-research/eval.ts
# When done:
rm .env.local
```

Optional flags:
- `--only=<scenario-id>` — single scenario across all businesses
- `--business=<id>` — single business across all scenarios
- `--limit=N` — first N pairs only (smoke test)
- `--concurrency=N` — default 4

## Costs

Each (business, scenario) pair is roughly:
- 1 generation call (~$0.02 with cache hits)
- 1 simulated conversation (~$0.10, 20-turn typical)
- 1 scoring call (~$0.02)

About **$0.15 per pair**. The default matrix runs ~30 pairs so a full
sweep is **$5 or so**. Bumping `--limit=5` for a smoke test is **~$1**.

## What this is NOT

- It does not run real Retell voice. Voice/timing artifacts (TTS
  rhythm, barge-in, latency) are invisible here. We catch those in
  prod monitoring + manual test calls.
- It does not auto-merge changes. The eval produces a report; you
  read it; you decide whether to ship the prompt-generator change.

## Adding new test cases

- New business: copy any file in `banks/businesses/`, edit, ensure
  the `id` is unique. The schema is `BusinessContext` from
  `lib/agent-builder/build-context.ts`.
- New scenario: copy any file in `banks/scenarios/`, edit. Scoring
  weights live in the scenario's `expectations` block.
- New rubric category: edit `banks/rubric.md` and the
  `RubricScore` type in `lib/types.ts`.
