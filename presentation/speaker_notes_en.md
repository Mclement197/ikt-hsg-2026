# English speaker notes

Mathis Clément · HSG · Information and Communication Technology · HS2026

Narrate slides **1–19 only**. Appendices A1–A24 are reference material. Timing is an estimate, not a timed recording. Delivery budgets include pauses and pointing at diagrams; final timing must be rehearsed again after German translation. The personal statements flagged on slides 16 and 18 are tracked separately in `author_review.md`.

**Timing budget:** 13 min 15 s across slides 1–19. Use the spare 1 min 45 s below the limit for the author's reflection, diagram pointing or slower delivery. The measured word count and pace estimate are in `verification.md`.

## 1. Designing a Mileage-Based Electric Vehicle Tax System — 15 s

This project designs a mileage-based electric vehicle tax system for Case A. The aim is to connect clear business processes with a small SQLite prototype, and show how the resulting information supports management decisions.

## 2. Tax distance travelled, without tracking journeys — 40 s

The assignment describes a tax based on distance rather than journey tracking. Battery electric vehicles pay three pence per mile; plug-in hybrids pay one and a half. These are the case assumptions. Owners estimate their mileage and pay an advance. Odometer reading centres verify odometer readings. The DVLA is the external authority for vehicle-registration data, while the tax authority calculates liability, records payments and prepares management information. The information chain runs from the estimate through verified distance to settlement. No live agency connection is implemented here.

## 3. A narrow scope makes the annual logic explainable — 25 s

We use the April-to-March billing year and exclusive end dates. One car changes hands on New Year's Day. Its handover reading divides actual mileage between two liable owners. The original annual estimate survives early closure. We round each advance and final assessment separately, once, half-pennies upwards.

## 4. Process 1 | An estimate creates an advance, not final tax — 50 s

An annual declaration and a buyer’s remaining-period declaration follow the same process. Check the registration, vehicle, dates, existing segments and estimate. A rejected submission goes back for correction. Record the liable owner and calculate the advance on acceptance; record a payment only when cash arrives.

## 5. Process 2 | Assessment and cash are separate events — 60 s

At year end we use a verified closing reading. At a transfer the authority checks the seller against registration, the two identities, date and centre evidence. Incomplete evidence goes to manual review. Acceptance closes the seller's period and starts the buyer's declaration; neither waits for settlement cash. Subtract opening miles from closing miles, value that distance and compare with the paid advance. Invoice, refund or confirm a zero balance. An invoice is not a receipt. Emma’s unpaid £30 therefore has no payment row.

## 6. Process 3 | Validated aggregates support planning — 45 s

Select a billing cycle and check segment coverage, shared readings and totals. Withhold an inconsistent report for correction. On accepted data, forecast final tax and measure gross settlement adjustments. Management releases the report and documents its planning decision. A separate cash check tells us what remains unpaid.

## 7. Six entities connect responsibility, evidence and money — 70 s

There are two lines from the owner for a reason. The vehicle tells us who is registered now. The declaration tells us who owes tax for a particular period. If the vehicle changes hands, last period's assessment still leads back to the outgoing owner. Several declarations can therefore belong to the same vehicle in one year. A declaration can have many payments but at most one assessment. An advance need not wait for assessment. Every assessment uses an opening and a closing reading. A reading can close one segment and open the next, because the uniqueness constraint applies separately to each role. Read the range beside an entity as the number of those entities allowed for one at the opposite end. The appendix shows the full attribute view.

## 8. SQLite implements the structure, not every business rule — 40 s

Each entity maps to one SQLite table. Both owner references are mandatory, but one can change without moving past liability. Vehicle and start date must be unique on declarations. That stops two identical starts, but not overlapping periods. Similarly, a foreign key only proves a reading exists, not that it concerns the right vehicle. The data check therefore compares vehicles, dates and mileage. Dates are text; money is integer pence. The sample stores the decisions as rows rather than running an automatic tax engine.

## 9. Five cases exercise the same settlement process — 65 s

Alice paid £300 for an estimate of 10,000 miles. On 1 January the authorised centre verified 26,000 miles, up from 20,000. Her 6,000 miles cost £180, so her £120 refund stays with her after registration changes. Ben estimated another 5,000 miles and paid £150. The same reading opens his period. At 32,000 miles he too owes £180 and pays the £30 difference. Two settlements, one car, no mileage divided by months. Clara breaks even, Daniel pays £30 extra, and Emma still owes £30.

## 10. Analysis 1 | Forecast final tax by vehicle type — 55 s

On 3 January, use Alice's assessed £180 instead of her original £300 demand. Ben's still-open estimate contributes £150, and Clara contributes £300: £630 for two battery electrics. With £270 for hybrids the forecast is £900. At final close use all five assessments: £660 plus £330, or £990. Moving January back three months before extracting the year puts Ben in the same billing cycle as Alice. Count the car only once. A closed but unassessed period makes its group incomplete.

## 11. Analysis 2 | Plan the scale of settlement adjustments — 60 s

Compare each final liability with the original advance due. Three £30 extras make £90; Alice's refund is £120. These figures measure assessment work. Two £30 extras were received, leaving only Emma's £30 unpaid. To reconcile cash, first aggregate receipts and refunds by declaration. Joining raw receipts would repeat assessments.

## 12. From a local prototype to a proposed operating architecture — 30 s

The current implementation is a local database with scripts and two queries. The target view adds agreed interfaces, validated operational processing and a reporting snapshot. These are proposed capabilities. The transition can be gradual: establish responsibilities and contracts, strengthen operational validation, then separate heavy reporting when needed. Architecture connects business responsibilities, information and technology over time, rather than simply choosing a new product.

## 13. 1 | Protect tax processing as workloads grow — 25 s

The first risk is interference between annual declaration peaks and reporting. The principle separates workloads and protects critical processing. A reporting snapshot reduces competition, while capacity and recovery tests check resilience. If asynchronous payments are introduced, retries must not duplicate receipts. The trade-off is less immediate reporting and more operational work. These tests are proposed, not measured achievements.

## 14. 2 | Make responsibility for shared data explicit — 25 s

At handover, a registration feed can be newer than an assessment. Validate the seller, dated centre evidence and vehicle together. Update current registration while preserving the original declaration owner. Shared identifiers and versioned contracts reduce ambiguity but require coordination.

## 15. 3 | Limit exposure of personal and financial data — 25 s

The third risk is wider exposure as users and partners increase. The principle combines data minimisation with least privilege. Odometer totals replace journey histories, and management receives aggregates. The authority would assign retention and access-review responsibilities and test access restrictions. The trade-off is reduced flexibility for investigation. Security controls are proposed; the prototype does not establish legal compliance.

## 16. AI reflection 1 | Assistance does not transfer responsibility — 45 s

AI has supported explanations and drafts for the scope, models, database, sample data and SQL, as well as this presentation. It helps generate alternatives and make a small prototype understandable. However, plausible output is not proof that the business meaning is correct. Responsibility for understanding, reviewing and defending the solution remains with the author. The final voice-over must be personally spoken, and the separate HSG declaration must acknowledge assistance. The draft does not invent a history of deliberate non-use. A concrete activity done without AI, and the reason for that choice, still requires author confirmation.

## 17. AI reflection 2 | A plausible label changed the business meaning — 55 s

The original AI-assisted reporting drawing promised outstanding amounts. The earlier presentation agent compared that label with the tables in the query. There was no payments table: the query could not know if anyone had paid. The editable model now calls this gross settlement adjustments. Ninety pounds was assessed as additional tax, but sixty pounds of that has been received. A separate check groups signed cash per declaration, then subtracts it from final liability. That leaves only thirty pounds unpaid. The distinction changes a management decision: staffing for three additional assessments is different from collecting one open balance.

## 18. AI reflection 3 | Validate with the course, then claim only your work — 45 s

The agent checks used course concepts, not just software output. In the EPC an invoice is a state before payment. In the ER model, Ben’s new registration did not move Alice’s refund. In SQLite, matching both readings to the vehicle and recalculating the tax and signed cash checked the business meaning. Before recording, the author must identify a check personally performed and its result, and say which design choice, if any, was exclusively their own. Those claims need personal evidence.

## 19. A traceable annual workflow, with a clear prototype boundary — 20 s

Four cars and five settlements reconcile: £990 assessed equals £960 net received plus £30 still owed. The shared January reading keeps both mileage and responsibility traceable without tracking journeys.
