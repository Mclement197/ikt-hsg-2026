# Scope and assumptions

## 1. Objective

This project designs a simplified information system for the mileage-based electric vehicle tax described in Case A.

The system supports annual mileage declarations, advance payments, settlement based on verified mileage, and management reporting.

The deliverable is a conceptual design supported by a working SQLite prototype.

## 2. Requirements taken from the case

- Fully electric vehicles (BEV) are taxed at 3 pence per mile.
- Plug-in hybrid vehicles (PHEV) are taxed at 1.5 pence per mile.
- Vehicle owners declare their expected annual mileage and make an advance payment.
- MOT inspections provide verified odometer readings.
- Actual mileage determines the final tax liability.
- Differences between the liability and advance payments result in an additional amount due or a refund.
- The design coordinates vehicle owners, MOT centres, the DVLA and tax authorities.
- Mileage collection does not require GPS tracking.

## 3. In scope

The project covers three business processes:

1. **Declaration and advance payment:** identify the liable owner, vehicle and period; record the estimate and advance due. Record a payment only on receipt.
2. **MOT verification and final settlement:** validate the boundary readings, calculate miles and assess final tax. Compare with the advance received, invoice or authorise a refund if needed, then record any actual cash movement.
3. **Management reporting:** group declared miles and estimated advance liability by vehicle type and period start year; group gross additional tax and refunds assessed against advance due by period start year. These support advance planning and settlement staffing.

The database represents vehicle owners, vehicles, declarations, inspections, payments and tax assessments.

The EPCs describe human and agency tasks. The prototype stores five examples of the second process and executes both reporting queries. A separate check reconciles cash to each assessment.

## 4. Out of scope

The prototype does not implement:

- A public website, mobile app or user authentication.
- Live connections to DVLA, MOT centres, banks or tax authorities.
- GPS tracking or individual journey histories.
- Automatic transfer processing, transfer-specific valuation, or vehicle imports/exports.
- Newly registered vehicles that are not yet subject to MOT inspections.
- Fraud investigations, appeals, penalties or debt collection.
- Production infrastructure or deployment.

Privacy, integration and scalability are discussed in the architecture section, without implementing a complete production system.

## 5. Design assumptions

| Assumption | Reason and consequence |
|---|---|
| The demonstration covers one complete billing year, from 1 April 2028 to 31 March 2029. | Provides a common period for declarations, readings and settlements. |
| A declaration has one liable owner for its period. | `vehicles.owner_id` is the current registration. `declarations.owner_id` identifies the person liable for that declaration and its assessment, even if the registration changes later. |
| Valid opening and closing odometer readings are available at the period boundaries. | Subtract the opening reading from the reading at the exclusive end date. |
| Odometers do not reset or get replaced during the year. | The closing reading minus the opening reading represents distance travelled. |
| Mileage is recorded in miles. | Keeps calculations consistent with the case’s tax rates. |
| Tax rates remain unchanged during the billing year. | Avoids dividing mileage between different rate periods. |
| Each of the five examples follows the normal annual cycle without a transfer. | Each has one declaration and one final assessment. In the model a vehicle can have several segments within a year; each declaration has at most one assessment. |
| Tax amounts are rounded to the nearest penny after calculation, with half-pennies rounded upwards. | Establishes consistent treatment of the PHEV rate. |
| All demonstration data is fictional. | Enables testing without using real personal information. |

**If the registration changes mid-year:** a verified reading at the handover would close the outgoing owner's `[start, handover)` segment and open the incoming owner's `[handover, end)` segment. The new declaration would name the incoming owner; updating the vehicle must not rewrite the earlier declaration. `UNIQUE(vehicle_id, period_start)` prevents two declarations starting on the same date, but does not prevent overlapping periods. Checking the boundaries and valuing the two segments are workflow responsibilities, not automated features.

## 6. Consistency checks

- Each assessment concerns a specific vehicle and billing period.
- Closing odometer readings cannot be lower than opening readings.
- Actual mileage is calculated from the difference between readings.
- The settlement process compares the assessed tax with advance payments actually received. The gross-adjustment **query** compares it with advance **due**. The two advance figures coincide in these five cases only.
- For a remaining balance, sum payments per declaration (advances + additional receipts − refunds paid), then subtract that net cash from final assessed tax.
- Additional amounts due and refunds are distinguished from payments already completed.
- Process diagrams, the ER model, database tables and SQL queries use consistent definitions.

