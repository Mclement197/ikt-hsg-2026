# Scope and assumptions · Case A

The objective is to tax distance without collecting journey histories. These are modelling choices for the assignment, not statements of UK tax law.

## Three business processes

1. **Declaration and advance.** An annual owner declares expected miles; an incoming owner declares only for the remaining period. The authority checks registration, dates, existing segments and estimate, requests corrections if needed, calculates the demand and records cash only on receipt.
2. **Verification and settlement.** At an annual boundary, use verified MOT readings. At a handover, check outgoing and incoming identities, current registration, vehicle, date and authorised-centre evidence. Conflicts go to correction/manual review. On acceptance, close the outgoing period and initiate the buyer's declaration independently of the seller's invoice or refund. Assess each owner on the difference between their own boundary readings.
3. **Management reporting.** Select the April billing cycle. Check coverage, evidence and totals, withhold inconsistent reports, then run the expected-final-tax and gross-adjustment analyses. Management releases the report and records its revenue and staffing decisions.

## Periods, evidence and money

- The fictional billing year is **[2028-04-01, 2029-04-01)**, labelled **2028/29**. Effective periods on one vehicle cannot overlap. The fixture uses midnight boundaries and demonstrates no same-day successive transfers.
- Each ownership period records the liable owner. Its intersection with a tax year defines a case, even after the period ends. The declaration keeps its submitted coverage, estimate, rate and demand; the sale closes the ownership period rather than rewriting the declaration. Payments remain with their owner and allocations with their original case.
- An accepted transfer uses one dated reading from an authorised verification centre, not necessarily a statutory MOT inspection. The same reading closes the seller's assessment and opens the buyer's. Only current accepted evidence can support a new decision. Pending and corrected observations may be retained. No allocation by days or months and no odometer resets or replacements.
- Vehicle type and rates are fixed: BEV **3p/mile**, PHEV **1.5p/mile**. Store integer pence; round half up once per advance or assessment. Two one-mile PHEV settlements cost 2p + 2p, while a single two-mile settlement costs 3p.
- The example has five paid advances. Gross adjustments compare final tax with **advance due**. A cash balance compares it with **net payments** (receipts less refunds). An authorised but unpaid amount is not cash.

## Prototype boundary

The 13-table SQLite fixture demonstrates an accepted January handover and five settlements. Boundaries in the sample fall at midnight UTC; stored timestamps include seconds. SQL records the decisions; Python validates the complete batch before commit. Human review, registration verification and planning are modelled responsibilities. There is no production transfer service, public application, live DVLA/centre/bank connection, GPS history, import/export processing, fraud investigation, appeals, debt collection or production deployment.
