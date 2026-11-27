(function () {
  'use strict';

  const scenarios = [
    { id: 'standard', title: 'A complete advance payment', description: 'Declare 10,000 miles, receive a £300 request, and reconcile a confirmed payment.' },
    { id: 'correction', title: 'A declaration needs correction', description: 'An owner-reference mismatch sends the declaration back through correction and validation.' },
    { id: 'partial', title: 'Only part of the advance arrives', description: 'The confirmed receipt covers 40% of the amount due. The remaining advance stays open.' },
    { id: 'missing', title: 'No transfer has arrived', description: 'A payment request exists, but no cash is confirmed. Create an explicit follow-up.' },
    { id: 'unconfirmed', title: 'A transfer is still pending', description: 'The owner initiates a transfer. Pending bank confirmation cannot be recorded as received cash.' },
    { id: 'zero', title: 'No advance is required', description: 'A zero-mileage estimate produces a no-advance confirmation and no payment record.' },
    { id: 'hybrid', title: 'A plug-in hybrid declaration', description: 'The PHEV rate of 1.5p per mile produces a £150 advance for 10,000 miles.' }
  ];

  const actionStage = {
    submit_declaration: 'declaration', open_authority: 'submitted', validate: 'review',
    send_correction: 'correction_request', open_correction: 'correction_handoff', resubmit: 'correction',
    calculate: 'calculation', store_declaration: 'store', check_requirement: 'requirement',
    confirm_zero: 'zero_confirmation', issue_request: 'payment_request',
    open_owner_invoice: 'owner_invoice_handoff', simulate_transfer: 'owner_payment', skip_transfer: 'owner_payment',
    open_finance: 'finance_handoff', reconcile: 'reconcile', compare: 'compare',
    confirm_receipt: 'covered', send_partial_notice: 'partial', send_missing_notice: 'unpaid',
    record_followup: 'followup'
  };

  function create(scenarioId) {
    if (!scenarios.some(x => x.id === scenarioId)) scenarioId = 'standard';
    const hybrid = scenarioId === 'hybrid';
    const registry = {
      owner: 'Amelia Reed', ownerRef: 'OWN-104', registration: hybrid ? 'HY26 EVK' : 'EV26 LDN',
      vehicleType: hybrid ? 'PHEV' : 'BEV', vehicle: hybrid ? 'Northstar Plug-in Hybrid' : 'Northstar E1 Electric',
      start: '2026-01-01', end: '2026-12-31', email: 'amelia.reed@example.test'
    };
    const draft = {
      ownerRef: scenarioId === 'correction' ? 'OWN-140' : registry.ownerRef,
      registration: registry.registration, vehicleType: registry.vehicleType,
      periodStart: registry.start, periodEnd: registry.end,
      mileage: scenarioId === 'zero' ? '0' : '10000'
    };
    return {
      scenarioId, stage: 'declaration', role: 'Vehicle owner', active: ['p1_submit'], visited: ['p1_open'],
      trace: [], error: null, errorFields: [], done: false, lastNodes: ['p1_open'],
      data: { registry, draft, submitted: null, findings: [], correctionMessage: '', submissionVersion: 0,
        declarationRef: 'DEC-2026-0104', paymentRef: 'ADV-2026-0104', due: null, received: 0,
        rate: hybrid ? 1.5 : 3, recorded: false, paymentRequestSent: false, bankTransactions: [],
        allocations: [], transferAmount: '', confirmationChoice: '', followupMessage: '', coverage: null }
    };
  }

  function canon(s) {
    const r = s.data.registry;
    return { ownerRef: r.ownerRef, registration: r.registration, vehicleType: r.vehicleType,
      periodStart: r.start, periodEnd: r.end, mileage: s.scenarioId === 'zero' ? '0' : '10000' };
  }

  function paymentDefault(s) {
    const due = s.data.due || 0;
    return ((s.scenarioId === 'partial' ? Math.round(due * 0.4) : due) / 100).toFixed(2);
  }

  function cleanRegistration(value) { return String(value || '').toUpperCase().trim().replace(/\s+/g, ' '); }
  function moneyValue(value) {
    const raw = String(value == null ? '' : value).trim();
    if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null;
    const pence = Math.round(Number(raw) * 100);
    return Number.isSafeInteger(pence) && pence <= 100000000 ? pence : null;
  }
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(value + 'T00:00:00Z');
    return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === value;
  }

  function readDeclaration(s, form, h) {
    const raw = {};
    ['ownerRef', 'registration', 'vehicleType', 'periodStart', 'periodEnd', 'mileage'].forEach(k => {
      raw[k] = String(form[k] == null ? '' : form[k]).trim();
    });
    raw.ownerRef = raw.ownerRef.toUpperCase();
    raw.registration = cleanRegistration(raw.registration);
    s.data.draft = raw;
    if (!/^OWN-\d{3}$/.test(raw.ownerRef)) {
      h.fail(s, 'Enter an owner reference in the format OWN-104. The authority will check whether it matches the liable owner.', ['ownerRef']); return null;
    }
    if (!/^[A-Z0-9 ]{5,10}$/.test(raw.registration) || !/[A-Z]/.test(raw.registration) || !/\d/.test(raw.registration)) {
      h.fail(s, 'Enter a vehicle registration, for example EV26 LDN.', ['registration']); return null;
    }
    if (!['BEV', 'PHEV'].includes(raw.vehicleType)) {
      h.fail(s, 'Select a supported vehicle type: BEV or PHEV.', ['vehicleType']); return null;
    }
    if (!validDate(raw.periodStart) || !validDate(raw.periodEnd) || raw.periodEnd <= raw.periodStart) {
      h.fail(s, 'Enter valid start and end dates, with the end date after the start date.', ['periodStart', 'periodEnd']); return null;
    }
    if (!/^\d+$/.test(raw.mileage) || !Number.isSafeInteger(Number(raw.mileage)) || Number(raw.mileage) > 1000000) {
      h.fail(s, 'Enter a whole-number mileage estimate from 0 to 1,000,000. This demo accepts zero miles; it does not accept a blank, negative or fractional estimate.', ['mileage']); return null;
    }
    return { ...raw, mileage: Number(raw.mileage) };
  }

  function validateDeclaration(s) {
    const d = s.data.submitted, r = s.data.registry, errors = [];
    if (d.ownerRef !== r.ownerRef) errors.push('Owner reference ' + d.ownerRef + ' does not match the liable owner for this period (' + r.ownerRef + ').');
    if (d.registration !== r.registration) errors.push('Vehicle registration does not match the vehicle in this case (' + r.registration + ').');
    if (d.vehicleType !== r.vehicleType) errors.push('Vehicle type does not match the register (' + r.vehicleType + ').');
    if (d.periodStart !== r.start || d.periodEnd !== r.end) errors.push('Use the case billing period: ' + r.start + ' to ' + r.end + '.');
    return errors;
  }

  function declarationForm(s, h, correcting) {
    const d = s.data.draft, r = s.data.registry;
    return (correcting ? h.alert('warning', 'Correction requested', s.data.correctionMessage) : '') +
      h.card(correcting ? 'Correct your declaration' : 'Declare your estimated mileage',
        '<p class="lead">Estimate the miles you expect to drive during this billing period. Your declaration determines the advance amount.</p>' +
        h.kv([{ label: 'Owner', value: r.owner }, { label: 'Vehicle on your account', value: r.vehicle }, { label: 'Your owner reference', value: r.ownerRef }]) +
        '<div class="form-grid">' +
          h.field('ownerRef', 'Liable owner reference', d.ownerRef, { required: true, help: 'Use the owner reference that applies to this billing period.' }) +
          h.field('registration', 'Vehicle registration', d.registration, { required: true }) +
          h.select('vehicleType', 'Vehicle type', d.vehicleType, [{ value: 'BEV', label: 'BEV · Battery electric · 3p / mile' }, { value: 'PHEV', label: 'PHEV · Plug-in hybrid · 1.5p / mile' }]) +
          h.field('mileage', 'Estimated period mileage', d.mileage, { type: 'number', min: 0, max: 1000000, step: 1, required: true, help: 'Whole miles. Zero is allowed for a vehicle you do not expect to drive.' }) +
          h.field('periodStart', 'Billing period starts', d.periodStart, { type: 'date', required: true }) +
          h.field('periodEnd', 'Billing period ends', d.periodEnd, { type: 'date', required: true }) +
        '</div>' +
        h.alert('info', 'What happens next', 'The tax authority checks the declaration against the vehicle and liable-owner record. Submitting it does not create a payment.') +
        '<div class="actions">' + h.button(correcting ? 'resubmit' : 'submit_declaration', correcting ? 'Resubmit corrected declaration' : 'Submit declaration') + '</div>',
        correcting ? 'OWNER PORTAL · REVISION ' + (s.data.submissionVersion + 1) : 'OWNER PORTAL · ANNUAL DECLARATION');
  }

  function declarationDetails(s, h) {
    const d = s.data.submitted;
    return h.kv([
      { label: 'Declaration', value: s.data.declarationRef + ' · version ' + s.data.submissionVersion },
      { label: 'Vehicle', value: d.registration + ' · ' + d.vehicleType },
      { label: 'Liable owner reference', value: d.ownerRef },
      { label: 'Billing period', value: d.periodStart + ' to ' + d.periodEnd },
      { label: 'Estimated distance', value: h.num(d.mileage) + ' miles' }
    ]);
  }

  function amountCard(s, h) {
    const d = s.data;
    return '<div class="amount-hero"><span class="eyebrow">ADVANCE AMOUNT DUE</span><strong>' + h.money(d.due || 0) + '</strong><p>' +
      h.num(d.submitted.mileage) + ' miles × ' + d.rate + 'p per mile</p></div>';
  }

  function paymentPosition(s, h) {
    const d = s.data, remaining = Math.max(0, (d.due || 0) - d.received), excess = Math.max(0, d.received - (d.due || 0));
    return h.table(['Position', 'Amount'], [
      ['Advance amount due', h.money(d.due || 0)],
      ['Confirmed cash allocated', h.money(d.received)],
      ['Remaining advance', '<strong>' + h.money(remaining) + '</strong>'],
      ...(excess ? [['Excess held for final settlement', h.money(excess)]] : [])
    ]);
  }

  function invoice(s, h) {
    return '<div class="document"><div class="report-heading"><div><p class="eyebrow">ADVANCE PAYMENT REQUEST</p><h3>' + h.esc(s.data.paymentRef) + '</h3></div>' + h.badge('Advance only', 'neutral') + '</div>' +
      h.kv([{ label: 'To', value: s.data.registry.owner }, { label: 'Vehicle', value: s.data.registry.registration }, { label: 'Period', value: '2026' }]) +
      amountCard(s, h) + '<p class="small muted">Final tax will be assessed from verified mileage in Process 2. This request is not a receipt.</p></div>';
  }

  function render(s, h) {
    const d = s.data, e = h.esc;
    switch (s.stage) {
      case 'declaration': return declarationForm(s, h, false);
      case 'submitted': return h.card('Declaration submitted',
        h.alert('success', 'Submission received', 'Your declaration is waiting for the tax authority’s validation. It has not yet been accepted.') +
        declarationDetails(s, h) +
        '<div class="actions">' + h.button('open_authority', 'Open tax authority review') + '</div>' +
        '<p class="small muted">Role handoff: the next screen shows the authority’s workspace for this same case.</p>', 'OWNER PORTAL · RECEIPT');
      case 'review': {
        const sub = d.submitted, r = d.registry;
        return h.card('Review the submitted declaration',
          '<p class="lead">Check the submitted record against the liable-owner and vehicle register.</p>' +
          h.table(['Check', 'Submitted', 'Case register'], [
            ['Liable owner', e(sub.ownerRef), e(r.ownerRef)], ['Vehicle', e(sub.registration), e(r.registration)],
            ['Vehicle type', e(sub.vehicleType), e(r.vehicleType)],
            ['Billing period', e(sub.periodStart + ' to ' + sub.periodEnd), e(r.start + ' to ' + r.end)],
            ['Mileage estimate', h.num(sub.mileage) + ' miles', 'A non-negative whole-number estimate']
          ]) + '<div class="actions">' + h.button('validate', 'Validate declaration') + '</div>', 'TAX AUTHORITY · VALIDATION');
      }
      case 'correction_request': return h.card('Send a correction request',
        h.alert('warning', 'Declaration cannot be accepted', d.findings.join(' ')) +
        h.textarea('correctionMessage', 'Message to the owner', d.correctionMessage || 'Please correct the following: ' + d.findings.join(' '), 'The owner sees this explanation in the correction screen.') +
        '<div class="actions">' + h.button('send_correction', 'Send correction request') + '</div>', 'TAX AUTHORITY · ACTION REQUIRED');
      case 'correction_handoff': return h.card('Waiting for the owner’s correction',
        h.alert('info', 'Correction request delivered', 'The request is now in the owner’s inbox. The declaration remains unaccepted.') +
        '<div class="document"><p class="eyebrow">TO ' + e(d.registry.owner.toUpperCase()) + '</p><p>' + e(d.correctionMessage) + '</p></div>' +
        '<div class="actions">' + h.button('open_correction', 'Open owner correction screen') + '</div>', 'TAX AUTHORITY · HANDOFF');
      case 'correction': return declarationForm(s, h, true);
      case 'calculation': return h.card('Calculate the advance',
        h.alert('success', 'Declaration accepted', 'All submitted identity, period and vehicle checks passed.') + declarationDetails(s, h) +
        h.kv([{ label: 'Applicable case rate', value: d.rate + 'p per mile' }, { label: 'Rounding', value: 'Nearest penny; half-pennies round up' }]) +
        '<div class="actions">' + h.button('calculate', 'Calculate advance amount') + '</div>', 'TAX AUTHORITY · ASSESSMENT');
      case 'store': return h.card('Record the accepted declaration', amountCard(s, h) +
        h.alert('info', 'Calculated, ready to record', 'The amount is a liability. Recording it creates a declaration record, not a cash receipt.') +
        '<div class="actions">' + h.button('store_declaration', 'Record declaration and advance') + '</div>', 'TAX AUTHORITY · DECLARATION REGISTER');
      case 'requirement': return h.card('Check whether an advance is payable', amountCard(s, h) +
        h.kv([{ label: 'Declaration record', value: d.declarationRef }, { label: 'Record status', value: 'Accepted and stored' }, { label: 'Cash received', value: h.money(d.received) }]) +
        '<div class="actions">' + h.button('check_requirement', 'Check payment requirement') + '</div>', 'TAX AUTHORITY · PAYMENT DECISION');
      case 'zero_confirmation': return h.card('No advance payment required',
        h.alert('success', 'Zero advance due', 'The accepted mileage estimate is zero, so the calculated advance is £0.00.') +
        '<div class="document"><h3>No-advance confirmation</h3><p>' + e(d.registry.owner) + ', no advance transfer is required for declaration ' + e(d.declarationRef) + '.</p><p>Actual mileage will still be assessed in Process 2.</p></div>' +
        '<div class="actions">' + h.button('confirm_zero', 'Send no-advance confirmation') + '</div>', 'TAX AUTHORITY · CONFIRMATION');
      case 'payment_request': return h.card('Issue the advance payment request', invoice(s, h) +
        '<div class="actions">' + h.button('issue_request', 'Send payment request') + '</div>', 'TAX AUTHORITY · NOTIFICATION');
      case 'owner_invoice_handoff': return h.card('The payment request has been sent',
        h.alert('info', 'Request delivered to the owner', 'The advance remains outstanding. No receipt is recorded simply because the request was sent.') +
        invoice(s, h) + '<div class="actions">' + h.button('open_owner_invoice', 'Open owner payment screen') + '</div>', 'TAX AUTHORITY · HANDOFF');
      case 'owner_payment': return h.card('Review your advance payment', invoice(s, h) +
        '<div class="form-grid">' + h.field('transferAmount', 'Mock transfer amount (£)', d.transferAmount || paymentDefault(s), { type: 'number', min: 0.01, step: 0.01, help: 'You can change the amount to explore partial payment or overpayment.' }) +
          h.field('paymentReference', 'Payment reference', d.paymentRef, { help: 'Match the reference on the payment request.' }) +
          h.select('bankStatus', 'Mock bank outcome', d.confirmationChoice || (s.scenarioId === 'unconfirmed' ? 'pending' : 'confirmed'), [
            { value: 'confirmed', label: 'Confirmed by the bank' }, { value: 'pending', label: 'Pending bank confirmation' }
          ], 'This selector controls only the simulated evidence. No money moves.') + '</div>' +
        '<div class="actions">' + h.button('simulate_transfer', 'Simulate transfer') + h.button('skip_transfer', 'Continue without a transfer', 'secondary') + '</div>' +
        '<p class="small muted">This external owner action supplies evidence for reconciliation. The EPC stays at receipt reconciliation until finance checks it.</p>', 'OWNER PORTAL · MOCK PAYMENT');
      case 'finance_handoff': return h.card('Ready for the receipt review',
        (d.bankTransactions.length ? h.alert(d.bankTransactions[0].status === 'confirmed' ? 'success' : 'warning',
          d.bankTransactions[0].status === 'confirmed' ? 'Mock bank confirmation available' : 'Mock transfer is pending',
          h.money(d.bankTransactions[0].amount) + ' was initiated with reference ' + d.paymentRef + '. Finance has not yet posted any receipt.') :
          h.alert('warning', 'No transfer initiated', 'The advance is still requested. Finance will review the absence of confirmed receipts.')) +
        '<div class="actions">' + h.button('open_finance', 'Open finance reconciliation') + '</div>', 'OWNER PORTAL · HANDOFF');
      case 'reconcile': {
        const txRows = d.bankTransactions.map(t => [e(t.id), e(t.reference), h.money(t.amount), h.badge(t.status === 'confirmed' ? 'Bank confirmed' : 'Pending', t.status === 'confirmed' ? 'success' : 'warning')]);
        return h.card('Reconcile the bank evidence',
          h.alert('info', 'Operational review point', 'Allocate only confirmed cash to the declaration. A pending transfer or an unpaid request must not become a receipt.') +
          (txRows.length ? h.table(['Bank record', 'Reference', 'Amount', 'Evidence'], txRows) : '<div class="empty-state"><h3>No bank receipts found</h3><p>No confirmed transfer is available for this payment reference.</p></div>') +
          h.kv([{ label: 'Declaration reference', value: d.declarationRef }, { label: 'Advance due', value: h.money(d.due) }, { label: 'Already allocated receipts', value: String(d.allocations.length) }]) +
          '<div class="actions">' + h.button('reconcile', 'Match and record confirmed receipts') + '</div>', 'TAX AUTHORITY / FINANCE · RECONCILIATION');
      }
      case 'compare': return h.card('Compare cash received with the advance due', paymentPosition(s, h) +
        h.alert('info', d.allocations.length ? 'Confirmed receipt posted' : 'No cash receipt posted', d.allocations.length ? 'The ledger contains only confirmed and matched money. Now determine whether it covers the advance.' : 'The receipt total is zero. The process can still proceed to an explicit unresolved outcome.') +
        '<div class="actions">' + h.button('compare', 'Check advance coverage') + '</div>', 'TAX AUTHORITY / FINANCE · COVERAGE');
      case 'covered': return h.card('Confirm the advance receipt',
        h.alert('success', 'Advance requirement covered', 'Confirmed receipts are at least equal to the amount due. Final mileage tax is still assessed later.') +
        paymentPosition(s, h) +
        (d.received > d.due ? h.alert('info', 'Excess is preserved', 'The full received amount remains in the ledger for final settlement. It is not silently reduced to the requested amount.') : '') +
        '<div class="actions">' + h.button('confirm_receipt', 'Send receipt confirmation') + '</div>', 'TAX AUTHORITY · OWNER CONFIRMATION');
      case 'partial': return h.card('Notify the owner of the remaining advance',
        h.alert('warning', 'Only part of the advance is covered', 'The confirmed payment remains recorded. The unpaid portion requires an open follow-up.') + paymentPosition(s, h) +
        h.textarea('followupMessage', 'Message to the owner', d.followupMessage || 'We recorded ' + h.money(d.received) + ' against your advance of ' + h.money(d.due) + '. The remaining advance is ' + h.money(d.due - d.received) + '.', 'Informational follow-up only. This demo applies no penalties.') +
        '<div class="actions">' + h.button('send_partial_notice', 'Send remaining-advance notice') + '</div>', 'TAX AUTHORITY · FOLLOW-UP');
      case 'unpaid': return h.card('Notify the owner of the unresolved payment',
        h.alert('warning', 'No advance receipt is confirmed', 'Missing confirmation is not proof that no payment was attempted. Ask the owner to pay or supply confirmation evidence.') + paymentPosition(s, h) +
        h.textarea('followupMessage', 'Message to the owner', d.followupMessage || 'We cannot yet confirm a receipt for advance request ' + d.paymentRef + '. Please pay the requested amount or provide confirmation evidence if you have already paid.') +
        '<div class="actions">' + h.button('send_missing_notice', 'Send payment follow-up') + '</div>', 'TAX AUTHORITY · FOLLOW-UP');
      case 'followup': return h.card('Keep the advance follow-up open',
        '<div class="document"><p class="eyebrow">OWNER NOTICE SENT</p><p>' + e(d.followupMessage) + '</p></div>' + paymentPosition(s, h) +
        h.alert('warning', 'A notice does not settle the account', 'Record the unresolved position as an open operational item. Later evidence can start another receipt review.') +
        '<div class="actions">' + h.button('record_followup', 'Record open advance follow-up') + '</div>', 'TAX AUTHORITY · CASE REGISTER');
      case 'complete': {
        const zero = d.coverage === 'zero', open = ['partial', 'unpaid'].includes(d.coverage);
        return h.card(open ? 'Review complete. Follow-up remains open.' : zero ? 'No-advance confirmation sent' : 'Advance payment recorded and confirmed',
          h.alert(open ? 'warning' : 'success', s.completion.title, s.completion.detail) +
          '<div class="receipt"><p class="eyebrow">' + (open ? 'OPEN FOLLOW-UP RECORD' : 'OWNER CONFIRMATION') + '</p>' +
          h.kv([{ label: 'Declaration', value: d.declarationRef }, { label: 'Vehicle owner', value: d.registry.owner }, { label: 'Advance due', value: h.money(d.due) },
            { label: 'Recorded cash', value: h.money(d.received) }, { label: 'Payment records created', value: String(d.allocations.length) },
            { label: 'Outcome', value: open ? 'Unresolved advance follow-up' : zero ? 'No advance transfer required' : 'Advance requirement covered' }]) + '</div>' +
          '<p class="lead">' + (open ? 'The model makes unfinished work visible instead of silently closing the case.' : 'The next business process uses verified mileage to assess the final tax and settle any difference.') + '</p>',
          open ? 'PROCESS OUTCOME · CASE OPEN' : 'PROCESS OUTCOME · COMPLETED');
      }
      default: return h.alert('danger', 'Unknown screen', 'Reset the scenario to restart this demonstration.');
    }
  }

  function successfulNote(s, h, title, detail, tone) {
    // A valid handoff or mock-bank action resolves any previous field error.
    s.error = null;
    s.errorFields = [];
    h.note(s, title, detail, tone);
  }

  function act(s, action, form, h) {
    if (!Object.prototype.hasOwnProperty.call(actionStage, action)) return;
    if (s.stage !== actionStage[action] || s.done) {
      h.fail(s, 'This action is not available at the current step. Use the action shown in the active workspace.'); return;
    }
    form = form || {};
    const d = s.data;
    switch (action) {
      case 'submit_declaration': case 'resubmit': {
        const submitted = readDeclaration(s, form, h); if (!submitted) return;
        d.submitted = submitted; d.submissionVersion += 1; d.rate = submitted.vehicleType === 'BEV' ? 3 : 1.5;
        h.step(s, action === 'resubmit' ? ['p1_correct', 'p1_resubmitted', 'p1_submission_merge'] : ['p1_submit', 'p1_submitted', 'p1_submission_merge'], ['p1_validate'],
          action === 'resubmit' ? 'Corrected declaration resubmitted' : 'Declaration submitted',
          'Version ' + d.submissionVersion + ' is available for authority validation. Acceptance has not yet occurred.');
        s.stage = 'submitted'; s.role = 'Vehicle owner'; break;
      }
      case 'open_authority':
        successfulNote(s, h, 'Role handoff to the tax authority', 'The same declaration is opened in the validation workspace.');
        s.role = 'Tax authority'; s.stage = 'review'; break;
      case 'validate': {
        d.findings = validateDeclaration(s);
        const invalid = d.findings.length > 0;
        h.step(s, ['p1_validate', 'p1_validation_split', invalid ? 'p1_invalid' : 'p1_accepted'], [invalid ? 'p1_request_correction' : 'p1_calculate'],
          invalid ? 'Validation found a mismatch' : 'Declaration accepted',
          invalid ? d.findings.join(' ') : 'Owner, vehicle, billing period and mileage checks passed.', invalid ? 'warning' : 'success');
        s.stage = invalid ? 'correction_request' : 'calculation'; break;
      }
      case 'send_correction': {
        const message = String(form.correctionMessage || '').trim();
        if (message.length < 12) { h.fail(s, 'Explain the correction in at least 12 characters so the owner knows what to change.', ['correctionMessage']); return; }
        d.correctionMessage = message;
        h.step(s, ['p1_request_correction', 'p1_correction_requested'], ['p1_correct'], 'Correction request sent', message, 'warning');
        s.stage = 'correction_handoff'; break;
      }
      case 'open_correction':
        successfulNote(s, h, 'Role handoff to the vehicle owner', 'The owner opens the correction request. Resubmission will return to the same validation step.');
        s.role = 'Vehicle owner'; s.stage = 'correction'; break;
      case 'calculate':
        d.due = Math.round(d.submitted.mileage * d.rate);
        h.step(s, ['p1_calculate', 'p1_calculated'], ['p1_store_declaration'], 'Advance calculated', h.num(d.submitted.mileage) + ' miles × ' + d.rate + 'p = ' + h.money(d.due) + ' due. No cash receipt has been created.');
        s.stage = 'store'; break;
      case 'store_declaration':
        d.recorded = true;
        h.step(s, ['p1_store_declaration', 'p1_stored'], ['p1_check_requirement'], 'Declaration and advance recorded', 'Accepted declaration ' + d.declarationRef + ' now contains the calculated advance amount.');
        s.stage = 'requirement'; break;
      case 'check_requirement': {
        const zero = d.due === 0;
        h.step(s, ['p1_check_requirement', 'p1_requirement_split', zero ? 'p1_zero_due' : 'p1_positive_due'], [zero ? 'p1_confirm_zero' : 'p1_issue_request'],
          zero ? 'No advance transfer required' : 'Positive advance requires a payment request',
          zero ? 'The zero-amount branch avoids a payment request and a fictitious zero-value receipt.' : h.money(d.due) + ' is due; the owner must be notified.');
        s.stage = zero ? 'zero_confirmation' : 'payment_request'; break;
      }
      case 'confirm_zero':
        d.coverage = 'zero';
        h.step(s, ['p1_confirm_zero', 'p1_zero_closed'], ['p1_zero_closed'], 'No-advance confirmation sent', 'No transfer was required and no payment row was created.', 'success');
        s.stage = 'complete'; s.done = true; s.completion = { title: 'No advance required', detail: 'The declaration is recorded with £0.00 due. Final mileage will still be assessed in Process 2.', tone: 'success' }; break;
      case 'issue_request':
        d.paymentRequestSent = true;
        h.step(s, ['p1_issue_request', 'p1_payment_requested'], ['p1_reconcile'], 'Advance payment request sent', 'The owner is asked to pay ' + h.money(d.due) + ' using ' + d.paymentRef + '. This is not cash received.');
        s.stage = 'owner_invoice_handoff'; break;
      case 'open_owner_invoice':
        successfulNote(s, h, 'Role handoff to the vehicle owner', 'The owner opens the requested advance and can simulate a transfer.');
        s.role = 'Vehicle owner'; s.stage = 'owner_payment'; break;
      case 'simulate_transfer': {
        const amount = moneyValue(form.transferAmount), reference = String(form.paymentReference || '').trim().toUpperCase(), status = String(form.bankStatus || '');
        d.transferAmount = String(form.transferAmount == null ? '' : form.transferAmount); d.confirmationChoice = status;
        if (amount === null || amount <= 0) { h.fail(s, 'Enter a positive amount with at most two decimal places, up to £1,000,000 in this demo. To simulate no transfer, use Continue without a transfer.', ['transferAmount']); return; }
        if (reference !== d.paymentRef) { h.fail(s, 'Use payment reference ' + d.paymentRef + ' so this transfer can be matched to the declaration.', ['paymentReference']); return; }
        if (!['confirmed', 'pending'].includes(status)) { h.fail(s, 'Choose whether the mock bank confirms the transfer or leaves it pending.', ['bankStatus']); return; }
        d.bankTransactions = [{ id: 'BANK-000104', reference, amount, status }];
        successfulNote(s, h, status === 'confirmed' ? 'Mock transfer confirmed by the bank' : 'Mock transfer pending', h.money(amount) + ' was initiated. Finance has not yet allocated any cash to the declaration.', status === 'confirmed' ? 'info' : 'warning');
        s.stage = 'finance_handoff'; break;
      }
      case 'skip_transfer':
        d.bankTransactions = [];
        successfulNote(s, h, 'No transfer initiated', 'At the review point there is no confirmed advance receipt. The payment request remains outstanding.', 'warning');
        s.stage = 'finance_handoff'; break;
      case 'open_finance':
        successfulNote(s, h, 'Role handoff to finance', 'Finance opens the bank evidence and existing allocations for this declaration.');
        s.role = 'Tax authority / finance'; s.stage = 'reconcile'; break;
      case 'reconcile': {
        const confirmed = d.bankTransactions.filter(t => t.status === 'confirmed' && t.reference === d.paymentRef);
        for (const tx of confirmed) {
          if (!d.allocations.some(a => a.bankId === tx.id)) d.allocations.push({ bankId: tx.id, amount: tx.amount, declaration: d.declarationRef });
        }
        d.received = d.allocations.reduce((total, a) => total + a.amount, 0);
        h.step(s, ['p1_reconcile', 'p1_receipts_reviewed'], ['p1_compare_coverage'], 'Receipt position established',
          d.allocations.length ? h.money(d.received) + ' in confirmed, matched receipts is recorded. Each bank record is allocated only once.' : 'No confirmed receipt is available. No payment row was created.');
        s.stage = 'compare'; break;
      }
      case 'compare': {
        d.coverage = d.received >= d.due ? 'covered' : d.received > 0 ? 'partial' : 'unpaid';
        const event = { covered: 'p1_covered', partial: 'p1_partial', unpaid: 'p1_unpaid' }[d.coverage];
        const next = { covered: 'p1_confirm_paid', partial: 'p1_notify_partial', unpaid: 'p1_notify_missing' }[d.coverage];
        h.step(s, ['p1_compare_coverage', 'p1_coverage_split', event], [next],
          { covered: 'Advance fully covered', partial: 'Advance partly covered', unpaid: 'No advance receipt confirmed' }[d.coverage],
          'Confirmed cash: ' + h.money(d.received) + '. Assessed advance: ' + h.money(d.due) + '.', d.coverage === 'covered' ? 'success' : 'warning');
        s.stage = d.coverage; s.role = 'Tax authority'; break;
      }
      case 'confirm_receipt':
        h.step(s, ['p1_confirm_paid', 'p1_paid_closed'], ['p1_paid_closed'], 'Advance receipt confirmed to the owner', 'The actual received amount of ' + h.money(d.received) + ' is preserved for final settlement.', 'success');
        s.stage = 'complete'; s.done = true; s.completion = { title: 'Advance requirement covered', detail: 'The authority recorded ' + h.money(d.received) + ' of confirmed cash and sent the owner a receipt confirmation.', tone: 'success' }; break;
      case 'send_partial_notice': case 'send_missing_notice': {
        const message = String(form.followupMessage || '').trim();
        if (message.length < 12) { h.fail(s, 'Write a clear follow-up message of at least 12 characters.', ['followupMessage']); return; }
        d.followupMessage = message;
        const partial = action === 'send_partial_notice';
        h.step(s, [partial ? 'p1_notify_partial' : 'p1_notify_missing', partial ? 'p1_partial_notified' : 'p1_missing_notified', 'p1_followup_merge'], ['p1_record_followup'],
          partial ? 'Remaining advance communicated' : 'Payment follow-up communicated', message, 'warning');
        s.stage = 'followup'; break;
      }
      case 'record_followup':
        h.step(s, ['p1_record_followup', 'p1_followup_open'], ['p1_followup_open'], 'Unresolved advance follow-up recorded',
          'The review ends with ' + h.money(Math.max(0, d.due - d.received)) + ' of the assessed advance still uncovered.', 'warning');
        s.stage = 'complete'; s.done = true; s.completion = { title: 'Advance follow-up remains open', detail: 'The owner has been notified. Confirmed cash remains ' + h.money(d.received) + '; the unresolved amount is ' + h.money(Math.max(0, d.due - d.received)) + '.', tone: 'warning' }; break;
    }
  }

  function guide(s) {
    if (s.done) return null;
    const d = s.data, fields = canon(s);
    if (s.scenarioId === 'correction' && s.stage === 'declaration') fields.ownerRef = 'OWN-140';
    const route = {
      declaration: { action: 'submit_declaration', fields, title: 'Submit the mileage estimate', detail: s.scenarioId === 'correction' ? 'This scenario deliberately uses a valid-looking owner reference that does not match the liable owner. The authority will catch it.' : 'The estimate is submitted to the authority. No assessment or cash record exists yet.' },
      submitted: { action: 'open_authority', title: 'Switch to the authority’s workspace', detail: 'The same case moves from an owner-facing form to an officer’s review queue.' },
      review: { action: 'validate', title: 'Validate the declaration', detail: 'The authority checks the submitted data against the vehicle and liable-owner register.' },
      correction_request: { action: 'send_correction', fields: { correctionMessage: 'Please correct the following: ' + d.findings.join(' ') }, title: 'Ask the owner to correct the declaration', detail: 'A failed validation leads to a correction request, not an accepted declaration.' },
      correction_handoff: { action: 'open_correction', title: 'Open the owner’s correction screen', detail: 'The owner sees the reason for rejection and the previous submission.' },
      correction: { action: 'resubmit', fields, title: 'Correct and resubmit', detail: 'The corrected version returns through the XOR merge to validation. It is checked again.' },
      calculation: { action: 'calculate', title: 'Calculate the advance', detail: 'Accepted miles are multiplied by the case rate and rounded once to the nearest penny.' },
      store: { action: 'store_declaration', title: 'Record the declaration and amount due', detail: 'Store the accepted declaration together with its advance assessment.' },
      requirement: { action: 'check_requirement', title: 'Choose the payment-requirement branch', detail: 'A zero assessment needs a confirmation. A positive assessment needs a payment request.' },
      zero_confirmation: { action: 'confirm_zero', title: 'Confirm the zero-advance outcome', detail: 'Finish this branch without inventing a payment or cash receipt.' },
      payment_request: { action: 'issue_request', title: 'Send the payment request', detail: 'The request gives the owner an amount and a reference. It is not proof of payment.' },
      owner_invoice_handoff: { action: 'open_owner_invoice', title: 'Open the owner’s requested payment', detail: 'See how the business notification becomes a concrete portal screen.' },
      owner_payment: s.scenarioId === 'missing' ? { action: 'skip_transfer', title: 'Continue without a transfer', detail: 'This scenario tests what happens when no payment evidence reaches finance.' } : {
        action: 'simulate_transfer', fields: { transferAmount: paymentDefault(s), paymentReference: d.paymentRef, bankStatus: s.scenarioId === 'unconfirmed' ? 'pending' : 'confirmed' },
        title: s.scenarioId === 'partial' ? 'Simulate a partial transfer' : s.scenarioId === 'unconfirmed' ? 'Simulate an unconfirmed transfer' : 'Simulate the owner’s transfer',
        detail: 'Only mock bank evidence is created here. The EPC still waits for finance to reconcile it.'
      },
      finance_handoff: { action: 'open_finance', title: 'Open finance reconciliation', detail: 'The authority now reviews the actual evidence available at the operational review point.' },
      reconcile: { action: 'reconcile', title: 'Record only confirmed receipts', detail: 'Pending transfers are excluded. Bank records are matched and allocated only once.' },
      compare: { action: 'compare', title: 'Compare receipts with the amount due', detail: 'The XOR chooses covered, partially covered or unconfirmed according to the actual monetary values.' },
      covered: { action: 'confirm_receipt', title: 'Confirm the recorded advance', detail: 'The owner receives confirmation of the real receipt amount. Final tax is assessed in Process 2.' },
      partial: { action: 'send_partial_notice', fields: { followupMessage: 'We recorded ' + gbp(d.received) + ' against your advance of ' + gbp(d.due) + '. Please arrange the remaining ' + gbp(d.due - d.received) + ' or provide evidence for a further payment.' }, title: 'Notify the owner of the remaining advance', detail: 'The partial receipt is preserved. The outstanding position stays visible.' },
      unpaid: { action: 'send_missing_notice', fields: { followupMessage: 'No receipt is confirmed for request ' + d.paymentRef + '. Please pay the advance or supply confirmation evidence if you have already paid.' }, title: 'Ask for payment or confirmation evidence', detail: 'No confirmed receipt does not prove that no transfer was attempted.' },
      followup: { action: 'record_followup', title: 'Keep the unresolved case open', detail: 'The review ends explicitly with a follow-up instead of marking the advance as paid.' }
    };
    const result = route[s.stage];
    return result ? { fields: {}, ...result } : null;
  }

  function gbp(pence) { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format((pence || 0) / 100); }

  function metrics(s) {
    const d = s.data;
    return [
      { label: 'Advance due', value: d.due === null ? 'Not assessed' : gbp(d.due), detail: d.recorded ? 'Accepted declaration recorded' : 'Calculated from the mileage estimate' },
      { label: 'Confirmed cash', value: gbp(d.received), detail: d.allocations.length + ' posted receipt' + (d.allocations.length === 1 ? '' : 's'), tone: d.received > 0 ? 'success' : 'neutral' },
      { label: 'Case position', value: s.done ? d.coverage === 'zero' ? 'No advance' : d.coverage === 'covered' ? 'Covered' : 'Follow-up open' : 'In progress', detail: d.due === null ? 'Awaiting assessment' : 'Uncovered: ' + gbp(Math.max(0, d.due - d.received)), tone: s.done && ['partial', 'unpaid'].includes(d.coverage) ? 'warning' : s.done ? 'success' : 'neutral' }
    ];
  }

  function caseInfo(s) {
    return [
      { label: 'Owner', value: s.data.registry.owner },
      { label: 'Vehicle', value: s.data.registry.registration + ' · ' + s.data.registry.vehicleType },
      { label: 'Declaration', value: s.data.declarationRef },
      { label: 'Billing period', value: '1 Jan to 31 Dec 2026' },
      { label: 'Data', value: 'Fictional demonstration case' }
    ];
  }

  window.ProcessDemo = { id: 'p1', title: 'Annual declaration & advance', subtitle: 'From an owner’s mileage estimate to a confirmed receipt or an explicit follow-up.', scenarios, create, render, act, guide, metrics, caseInfo };
})();
