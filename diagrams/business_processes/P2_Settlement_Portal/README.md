# P2 · MOT verification and final settlement

Explore how inspection evidence becomes a final tax assessment, an additional payment or refund, and a reconciled settlement.

## Open and operate

Extract the ZIP completely, then double-click `index.html`. Keep its accompanying files together. No installation, server, account or internet connection is needed. Each ZIP is an independent mock case.

- Use the portal’s forms and action buttons. **You are acting as** identifies the responsible person or team.
- **Perform suggested action** fills the example values and presses the corresponding portal button once.
- **Play example** advances automatically; **Pause example** lets you discuss a decision.
- **Change scenario** starts another case. Invalid input blocks progression; business exceptions may enter correction or unresolved-outcome paths.

## Read the live EPC / EPK

Amber marks the current activity or event; teal marks completed work.

- **Follow** keeps the active position visible. **Current step** recentres and resumes following.
- **Overview** shows the whole diagram and turns following off. Zoom, drag or expand the map to inspect it.
- Select a shape for its meaning and activity details, including responsibilities and data.
- **Show roles, systems and data** reveals the supporting objects.

## Available scenarios

| Scenario | What it demonstrates |
|---|---|
| Additional payment | 13,000 miles produces a £390 assessment. Against £300 received, £90 remains to collect. |
| Refund to the owner | A £240 assessment against £300 received requires a £60 refund. |
| No adjustment needed | A PHEV assessment matches the £300 advance received; no new transfer is invented. |
| Correct an odometer reading | A closing reading below the opening reading triggers evidence clarification and revalidation. |
| Evidence unavailable | Required boundary evidence cannot be established, so assessment is withheld and the case remains open. |
| Payment not received | An additional invoice exists, but no receipt is confirmed. The payment remains outstanding. |
| Refund confirmation missing | A refund is authorised but unconfirmed. It remains pending without posting or a blind retry. |
| Partial payment leaves a balance | A £30 receipt against a £90 invoice leaves a £60 residual that prevents closure. |

## Suggested 2–3 minute presentation

1. Start with **Additional payment**. Show the opening and closing odometers. Use **Play example**, pausing at the £390 assessment and £90 additional invoice.
2. Explain the distinction between an invoice, a confirmed receipt and a reconciled balance. Continue to the closed settlement.
3. Select **Correct an odometer reading**. Advance to the validation failure, point to the clarification loop, then show how corrected evidence is validated again.
4. Select **Partial payment leaves a balance** and run the example. Show why recording a real receipt does not automatically mean the case can close.

The financial control to emphasise: initial settlement compares final tax with advance actually received; final reconciliation compares liability with all net recorded cash, including completed refunds.

## Replay and export

**Undo action** restores the preceding state. **Restart scenario**, changing scenario or reloading starts a fresh run. State is held in memory and is not restored after closing the browser.

**Activity log** explains each action. **Download run log** exports the mock data, history and outcome as JSON for inspection; it does not provide a saved-game import.

## Scope

All people, vehicles, records, evidence and transactions are fictional. No real authentication, submissions, payments or external connections occur. The case assumes BEV 3p/mile and PHEV 1.5p/mile, with calculated money rounded to the nearest penny.

EPC means *Event-driven Process Chain*; EPK is *Ereignisgesteuerte Prozesskette*. Events describe states, functions describe work, XOR selects one alternative, and AND requires all parallel branches.
