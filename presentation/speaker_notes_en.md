# English speaker notes

Mathis Clément · HSG · Information and Communication Technology · HS2026

Narrate slides **1–19 only**. Appendices A1–A23 are reference material. Timing is an estimate, not a timed recording. Delivery budgets include pauses and pointing at diagrams; final timing must be rehearsed again after German translation. The personal statements flagged on slides 16 and 18 are tracked separately in `author_review.md`.

**Timing budget:** 13 min 15 s across slides 1–19. Use the spare 1 min 45 s below the limit for the author's reflection, diagram pointing or slower delivery. The measured word count and pace estimate are in `verification.md`.

## 1. Designing a Mileage-Based Electric Vehicle Tax System — 15 s

This project designs a mileage-based electric vehicle tax system for Case A. The aim is to connect clear business processes with a small SQLite prototype, and show how the resulting information supports management decisions.

## 2. Tax distance travelled, without tracking journeys — 40 s

The assignment describes a tax based on distance rather than journey tracking. Battery electric vehicles pay three pence per mile; plug-in hybrids pay one and a half. These are the case assumptions. Owners estimate their mileage and pay an advance. MOT inspection centres verify odometer readings. The DVLA is the external authority for vehicle-registration data, while the tax authority calculates liability, records payments and prepares management information. The information chain runs from the estimate through verified distance to settlement. No live agency connection is implemented here.

## 3. A narrow scope makes the annual logic explainable — 25 s

The five examples cover April 2028 through March 2029. We use miles, verified boundary readings and fixed rates, rounding once to the penny. A declaration names the owner liable for its period. A handover would split the year at a verified reading. The prototype stores that distinction without automating transfers or their valuation.

## 4. Process 1 | An estimate creates an advance, not final tax — 50 s

The first process begins when the declaration period opens. The owner submits an estimate. The authority checks the vehicle, dates and liable owner and records that person on the accepted declaration. The appendix shows what happens if a correction is needed. The authority calculates the advance, the owner pays, and only then is there a receipt. The hexagons are states; the rounded boxes are activities. Bracketed roles identify who acts. The amount due belongs to the declaration and the cash received belongs to a payment. Neither is yet the final tax.

## 5. Process 2 | Assessment and cash are separate events — 60 s

The second process uses verified opening and closing readings. The full model first records the closing reading, then checks that both readings belong to the declared vehicle and match the period. Closing minus opening gives actual miles, which determine final liability. The authority compares that liability with the advance actually received. The exclusive-or connector selects exactly one outcome: an additional amount, no adjustment, or a refund. Here the additional branch ends at invoice issuance and the refund branch at authorisation. Those are not cash movements. The appendix continues both paths through payment and recording. This matters for case five: a liability exists, but the additional receipt does not. Its payment branch remains unfinished. Invoice status itself is not stored in this database.

## 6. Process 3 | Validated aggregates support planning — 45 s

Management reporting starts on a reporting date. The analyst extracts period records, controlling checks their quality, and accepted data is aggregated and reviewed before release. The complete model also withholds a report when issues are found. The two implemented outputs answer different questions. The first describes estimated advance liability by vehicle type. The second describes gross additional assessments and refunds. Management can use them to plan advances and settlement-processing capacity. This applies the course idea that decision information must be consistent, integrated and aggregated. Remaining cash balances require a separate calculation involving payments.

## 7. Six entities connect responsibility, evidence and money — 70 s

There are two lines from the owner for a reason. The vehicle tells us who is registered now. The declaration tells us who owes tax for a particular period. If the vehicle changes hands, last period's assessment still leads back to the outgoing owner. Several declarations can therefore belong to the same vehicle in one year. A declaration can have many payments but at most one assessment. An advance need not wait for assessment. Every assessment uses an opening and a closing inspection. A reading can close one segment and open the next, because the uniqueness constraint applies separately to each role. Read the range beside an entity as the number of those entities allowed for one at the opposite end. The appendix shows the full attribute view.

## 8. SQLite implements the structure, not every business rule — 40 s

Each entity maps to one SQLite table. Both owner references are mandatory, but one can change without moving past liability. Vehicle and start date must be unique on declarations. That stops two identical starts, but not overlapping periods. Similarly, a foreign key only proves an inspection exists, not that it concerns the right vehicle. The data check therefore compares vehicles, dates and mileage. Dates are text; money is integer pence. The sample stores the decisions as rows rather than running an automatic tax engine.

## 9. Five cases exercise the same settlement process — 65 s

These are five instances of the settlement process, represented by thirty-eight linked records. Cases one and four need extra tax and have paid it. Case two receives a refund. Case three needs no adjustment. Case five has an unpaid additional amount. For that plug-in hybrid, the odometer increases from ten thousand to twenty-two thousand miles, giving twelve thousand miles. At one and a half pence per mile, the final liability is eighteen thousand pence, or one hundred and eighty pounds. Its ten-thousand-mile estimate produced a one-hundred-and-fifty-pound advance, which was paid. No further receipt exists, so thirty pounds remains due. This example links the process, readings, assessment and payment history. The examples demonstrate behaviour; they do not support a national revenue forecast.

## 10. Analysis 1 | Plan the advance liability by vehicle type — 55 s

The first analysis joins declarations to vehicles so each estimate has a vehicle type. Grouping by the declaration's start year and type creates two groups. Three battery electric vehicles declared thirty thousand miles and nine hundred pounds in advances. Two plug-in hybrids declared eighteen thousand miles and two hundred and seventy pounds. The total estimated advance liability is eleven hundred and seventy pounds. Management can use this to understand the declared mileage mix and plan advances. The label matters: this is the 2028–29 billing year, grouped under its start year, 2028. It is neither calendar-year cash nor final assessed liability. The complete unchanged SQL and its output are in the appendix.

## 11. Analysis 2 | Plan the scale of settlement adjustments — 60 s

The second analysis joins declarations to their final assessments. It compares final liability with the advance due and uses conditional sums to separate positive differences from refunds. Five declarations are assessed. Three require additional tax, one requires a refund, and one needs no adjustment. Gross additional tax is one hundred and twenty pounds; gross refunds are sixty pounds. These figures help plan settlement workload and the scale of adjustments. They do not tell management what cash remains to be collected, because this query never reads payments. All advances happen to be paid in the sample, but ninety pounds of the additional tax has also already arrived. Therefore only thirty pounds remains outstanding. Treating the full one hundred and twenty pounds as unpaid would misstate the position.

## 12. From a local prototype to a proposed operating architecture — 30 s

The current implementation is a local database with scripts and two queries. The target view adds agreed interfaces, validated operational processing and a reporting snapshot. These are proposed capabilities. The transition can be gradual: establish responsibilities and contracts, strengthen operational validation, then separate heavy reporting when needed. Architecture connects business responsibilities, information and technology over time, rather than simply choosing a new product.

## 13. 1 | Protect tax processing as workloads grow — 25 s

The first risk is interference between annual declaration peaks and reporting. The principle separates workloads and protects critical processing. A reporting snapshot reduces competition, while capacity and recovery tests check resilience. If asynchronous payments are introduced, retries must not duplicate receipts. The trade-off is less immediate reporting and more operational work. These tests are proposed, not measured achievements.

## 14. 2 | Make responsibility for shared data explicit — 25 s

The second risk is inconsistent shared data. The principle assigns authoritative ownership and versioned interfaces. The proposed owners are DVLA for registration, MOT providers for readings, and the tax authority for assessments. Contracts specify identifiers, miles, dates and provenance. Duplicate and out-of-order examples test the design. Clearer contracts reduce ambiguity, but require coordination when partners change their systems.

## 15. 3 | Limit exposure of personal and financial data — 25 s

The third risk is wider exposure as users and partners increase. The principle combines data minimisation with least privilege. Odometer totals replace journey histories, and management receives aggregates. The authority would assign retention and access-review responsibilities and test access restrictions. The trade-off is reduced flexibility for investigation. Security controls are proposed; the prototype does not establish legal compliance.

## 16. AI reflection 1 | Assistance does not transfer responsibility — 45 s

AI has supported explanations and drafts for the scope, models, database, sample data and SQL, as well as this presentation. It helps generate alternatives and make a small prototype understandable. However, plausible output is not proof that the business meaning is correct. Responsibility for understanding, reviewing and defending the solution remains with the author. The final voice-over must be personally spoken, and the separate HSG declaration must acknowledge assistance. The draft does not invent a history of deliberate non-use. A concrete activity done without AI, and the reason for that choice, still requires author confirmation.

## 17. AI reflection 2 | A plausible label changed the business meaning — 55 s

The original AI-assisted reporting drawing promised outstanding amounts. The earlier presentation agent compared that label with the tables in the query. There was no payments table: the query could not know if anyone had paid. The editable model now calls this gross settlement adjustments. One hundred and twenty pounds was assessed as additional tax, but ninety pounds of that has been received. A separate check groups signed cash per declaration, then subtracts it from final liability. That leaves only thirty pounds unpaid. The distinction changes a management decision: staffing for three additional assessments is different from collecting one open balance.

## 18. AI reflection 3 | Validate with the course, then claim only your work — 45 s

The agent checks used course concepts, not just software output. In the EPC an invoice is a state before payment. In the ER model, changing vehicle five's current registration in a disposable copy left its assessed declaration with the original owner. In SQLite, matching both readings to the vehicle and recalculating the tax and signed cash checked the business meaning. Before recording, the author must identify a check personally performed and its result, and say which design choice, if any, was exclusively their own. Those claims need personal evidence.

## 19. A traceable annual workflow, with a clear prototype boundary — 20 s

The design connects estimates, verified evidence, liability, cash and management information. Three processes, six tables and five cases demonstrate that chain. The key reconciliation is twelve hundred and thirty pounds assessed, twelve hundred received net, and thirty still owed. The prototype's limits remain explicit.
