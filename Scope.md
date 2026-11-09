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

1. **Annual declaration and advance payment:** record estimated mileage, calculate the advance tax amount, and record payment.
2. **MOT verification and final settlement:** record verified readings, calculate actual mileage and tax liability, and determine any additional payment or refund.
3. **Management reporting:** aggregate mileage, assessed tax, payments and outstanding balances to support revenue planning.

The database represents vehicle owners, vehicles, declarations, inspections, payments and tax assessments.

Five example settlements demonstrate the second process. Two SQL analyses provide management information.

## 4. Out of scope

The prototype does not implement:

- A public website, mobile app or user authentication.
- Live connections to DVLA, MOT centres, banks or tax authorities.
- GPS tracking or individual journey histories.
- Ownership changes, vehicle imports or exports during a billing period.
- Newly registered vehicles that are not yet subject to MOT inspections.
- Fraud investigations, appeals, penalties or debt collection.
- Production infrastructure or deployment.

Privacy, integration and scalability are discussed in the architecture section, without implementing a complete production system.

## 5. Design assumptions

| Assumption | Reason and consequence |
|---|---|
| The demonstration covers one complete billing year, from 1 April 2028 to 31 March 2029. | Provides a common period for declarations, readings and settlements. |
| Each vehicle has one unchanged registered owner throughout the year. | Avoids splitting liability between owners. |
| Valid opening and closing odometer readings are available at the billing-period boundaries. | Allows annual mileage to be calculated directly. |
| Odometers do not reset or get replaced during the year. | The closing reading minus the opening reading represents distance travelled. |
| Mileage is recorded in miles. | Keeps calculations consistent with the case’s tax rates. |
| Tax rates remain unchanged during the billing year. | Avoids dividing mileage between different rate periods. |
| Each vehicle has one declaration and one final assessment for the year. | Keeps the prototype focused on the standard annual workflow. |
| Tax amounts are rounded to the nearest penny after calculation, with half-pennies rounded upwards. | Establishes consistent treatment of the PHEV rate. |
| All demonstration data is fictional. | Enables testing without using real personal information. |

These assumptions simplify the prototype. A production system would need additional rules for exceptions.

## 6. Consistency checks

- Each assessment concerns a specific vehicle and billing period.
- Closing odometer readings cannot be lower than opening readings.
- Actual mileage is calculated from the difference between readings.
- Final settlement compares the assessed tax with advance payments actually received.
- Additional amounts due and refunds are distinguished from payments already completed.
- Process diagrams, the ER model, database tables and SQL queries use consistent definitions.

