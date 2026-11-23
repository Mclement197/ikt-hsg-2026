# English speaker notes

Mathis Clément · HSG · Information and Communication Technology · HS2026

Narrate slides **1–19 only**. Appendices A1–A23 are reference material. Timing is an estimate, not a timed recording. Delivery budgets include pauses and pointing at diagrams; final timing must be rehearsed again after German translation. The personal statements flagged on slides 16 and 18 are tracked separately in `author_review.md`.

**Timing calculation:** 1,703 spoken words (headings and this introduction excluded). At 140 words/minute, speech takes about 12 min 10 s; approximately 90 s for diagram pointing and pauses gives **13 min 40 s**, matching the 820 s slide budgets below. At 130 words/minute plus the same pauses, allow about 14 min 36 s. No audio has been generated or timed.

## 1. Designing a Mileage-Based Electric Vehicle Tax System — 15 s

This project designs a mileage-based electric vehicle tax system for Case A. The aim is to connect clear business processes with a small SQLite prototype, and show how the resulting information supports management decisions.

## 2. Tax distance travelled, without tracking journeys — 40 s

The assignment describes a tax based on distance rather than journey tracking. Battery electric vehicles pay three pence per mile; plug-in hybrids pay one and a half. These are the case assumptions. Owners estimate their mileage and pay an advance. MOT inspection centres verify odometer readings. The DVLA is the external authority for vehicle-registration data, while the tax authority calculates liability, records payments and prepares management information. The information chain runs from the estimate through verified distance to settlement. No live agency connection is implemented here.

## 3. A narrow scope makes the annual logic explainable — 50 s

The prototype covers one billing year, from April 2028 through March 2029. The database stores the first of April 2029 as the exclusive end, and takes the closing reading at that boundary. Each vehicle keeps the same owner, and rates remain fixed. Verified readings exist at both boundaries, with no odometer reset. These assumptions make subtraction meaningful and avoid splitting liability. Amounts are integer pence, rounded once after multiplication, with half-pennies upwards. A declaration can exist before its assessment. Following the course's modelling concept, the scope deliberately reduces detail to explain the annual workflow. Exceptional cases and production services remain outside it.

## 4. Process 1 | An estimate creates an advance, not final tax — 50 s

The first process begins when the declaration period opens. An owner submits estimated mileage, and the authority validates the declaration and vehicle. This view follows the accepted path; the appendix also shows rejection and a correction request. The authority calculates the advance, the owner pays, and the authority records that receipt. Notice the alternation between states in hexagons and activities in rounded boxes. The bracketed roles identify responsibility, rather than adding steps to the control flow. The important data distinction is between the amount due in the declaration and cash actually received in payments. Neither is yet the final tax liability.

## 5. Process 2 | Assessment and cash are separate events — 60 s

The second process uses verified opening and closing readings. The full model first records the closing reading, then checks that both readings belong to the declared vehicle and match the period. Closing minus opening gives actual miles, which determine final liability. The authority compares that liability with the advance actually received. The exclusive-or connector selects exactly one outcome: an additional amount, no adjustment, or a refund. Here the additional branch ends at invoice issuance and the refund branch at authorisation. Those are not cash movements. The appendix continues both paths through payment and recording. This matters for case five: a liability exists, but the additional receipt does not. Its payment branch remains unfinished. Invoice status itself is not stored in this database.

## 6. Process 3 | Validated aggregates support planning — 45 s

Management reporting starts on a reporting date. The analyst extracts period records, controlling checks their quality, and accepted data is aggregated and reviewed before release. The complete model also withholds a report when issues are found. The two implemented outputs answer different questions. The first describes estimated advance liability by vehicle type. The second describes gross additional assessments and refunds. Management can use them to plan advances and settlement-processing capacity. This applies the course idea that decision information must be consistent, integrated and aggregated. Remaining cash balances require a separate calculation involving payments.

## 7. Six entities connect responsibility, evidence and money — 70 s

The conceptual model contains six entities. An owner can have several vehicles, but each vehicle has exactly one owner in this prototype. A vehicle can accumulate declarations and inspections over time. Each declaration can have many payments and zero or one final assessment. That optional assessment is important during the workflow, even though all five sample declarations are already assessed. Every assessment references one declaration and two inspection roles: opening and closing. Each inspection can be used at most once in each role. It can still close one period and open the next. Payments link to declarations because an advance arrives before final assessment. The rounded entities and attribute markers follow the lecture example; explicit endpoint ranges replace its line conventions to make multiplicities unambiguous. The appendix gives all attributes and explains this notation extension.

## 8. SQLite implements the structure, not every business rule — 40 s

Each conceptual entity maps to a SQLite table. Keys identify records, foreign keys connect them, and uniqueness prevents certain duplicates. These constraints do not establish every business rule. A valid inspection reference does not prove that the inspection concerns the declaration's vehicle. Dates, increasing mileage and allowed types also need validation. Dates and timestamps are stored as text. Due and assessed amounts are stored in integer pence as simple records of the decision. The sample contains inserted amounts, rather than demonstrating an automatic tax-calculation engine.

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

There is a concrete mismatch in the AI-assisted reporting drawing. It proposes outstanding amounts and refunds, while the implemented query calculates differences between final tax and advance due. The file identifies Codex as its agent, supporting AI-assisted provenance. During this draft's review, the presentation agent compared that label with the SQL and the payments. The correction is to call the result gross settlement adjustments and calculate remaining balances separately. Final liability of twelve hundred and thirty pounds minus net cash of twelve hundred leaves thirty outstanding. This avoids treating already collected amounts as unpaid. The course's distinction between transaction records and integrated management indicators explains why running SQL successfully was not enough.

## 18. AI reflection 3 | Validate with the course, then claim only your work — 45 s

The presentation agent checked EPC event and function rules, ER cardinalities against constraints, database integrity and foreign keys, and every sample mileage calculation and signed payment balance. The actual schema and inserts also reproduced the database in memory. These checks combine technical execution with course concepts. Referential integrity cannot prove the readings concern the correct vehicle, and aggregation requires a precise business definition. Personally repeated checks and exclusively personal system-design decisions still require confirmation. The documented preferences for simple code and an English-first draft are genuine preferences, but they do not establish independent ownership of substantive design decisions.

## 19. A traceable annual workflow, with a clear prototype boundary — 20 s

The design connects estimates, verified evidence, liability, cash and management information. Three processes, six tables and five cases demonstrate that chain. The key reconciliation is twelve hundred and thirty pounds assessed, twelve hundred received net, and thirty still owed. The prototype's limits remain explicit.
