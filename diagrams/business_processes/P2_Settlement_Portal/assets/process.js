(function () {
  'use strict';
  const scenarios = [
    {id:'additional',title:'Additional payment',description:'13,000 miles create a £390 assessment. £300 has already been received, so £90 is collected and reconciled.'},
    {id:'refund',title:'Refund to the owner',description:'8,000 miles create a £240 assessment against £300 received. Authorise, confirm and post a £60 refund.'},
    {id:'balanced',title:'No adjustment needed',description:'A PHEV assessment exactly matches the £300 advance received. Confirm the balance without inventing a transfer.'},
    {id:'correction',title:'Correct an odometer reading',description:'The submitted closing reading is below the opening reading. Request evidence, correct it and validate again.'},
    {id:'missing',title:'Evidence unavailable',description:'A closing boundary reading cannot be established. Withhold the assessment and leave the case open.'},
    {id:'payment_pending',title:'Payment not received',description:'An additional invoice exists but no bank receipt is confirmed. Keep the amount outstanding.'},
    {id:'refund_pending',title:'Refund confirmation missing',description:'The refund is authorised but the transfer is unconfirmed. Keep it pending without posting or retrying it.'},
    {id:'residual',title:'Partial payment leaves a balance',description:'Only £30 of a £90 invoice is received. Post the real receipt, then detect the £60 residual at reconciliation.'}
  ];
  const isRefund = id => id === 'refund' || id === 'refund_pending';
  const cash = p => (p / 100).toLocaleString('en-GB', {style:'currency',currency:'GBP'});
  const num = n => Number(n).toLocaleString('en-GB');
  const roleTax = 'Tax authority officer';
  const roleMot = 'MOT centre inspector';
  const roleOwner = 'Vehicle owner';
  const rolePayments = 'Payments team';
  const safe = x => String(x == null ? '' : x);
  const clone = x => JSON.parse(JSON.stringify(x));
  function create(id) {
    if (!scenarios.some(x => x.id === id)) id = 'additional';
    const closing = isRefund(id) ? 48000 : id === 'balanced' ? 60000 : 53000;
    const submitted = id === 'correction' ? 39000 : closing;
    return {
      scenarioId:id,stage:'record',role:roleMot,active:['record'],visited:['start'],trace:[],error:null,errorFields:[],done:false,lastNodes:['start'],
      data:{
        caseId:'SET-2026-084',declarationId:'DEC-2026-084',owner:'Alex Morgan',plate:'EV26 MCK',vehicle:id === 'balanced' ? 'Kia Niro PHEV' : 'Nissan Leaf',vehicleType:id === 'balanced' ? 'PHEV' : 'BEV',ratePence:id === 'balanced' ? 1.5 : 3,
        periodStart:'2026-01-01',periodEnd:'2026-12-31',opening:40000,actualSupportedClosing:id === 'missing' ? null : closing,
        openingReference:'MOT-OPEN-084',inspectionReference:'MOT-CLOSE-084',station:'Riverside MOT Centre',
        draft:{vehicle:'EV26 MCK',inspectionDate:'2026-12-31',closingReading:id === 'missing' ? '' : String(submitted),availability:id === 'missing' ? 'missing' : 'provided'},
        evidence:null,findings:[],correctionReason:'',holdReason:'The required verified closing boundary reading could not be established from the inspection archive.',
        advanceDue:30000,advanceReceived:30000,miles:null,finalTax:null,initialDifference:null,remaining:null,
        ledger:[{type:'ADVANCE',reference:'BANK-ADV-084',amount:30000}],postedRefs:['BANK-ADV-084'],
        invoice:null,receipt:null,paymentAttempt:null,receiptPosted:false,refundAuthorisation:null,refundTransfer:null,refundPosted:false,
        paymentDraft:id === 'residual' ? '30.00' : '90.00',clarifications:0,statement:null,status:'Awaiting inspection evidence'
      }
    };
  }
  function ledgerNet(d) { return d.ledger.reduce((sum,r) => sum + (r.type === 'REFUND' ? -r.amount : r.amount),0); }
  function amountInput(raw) {
    const v=safe(raw).trim();
    if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(v)) return null;
    const p=Math.round(Number(v)*100);
    return Number.isSafeInteger(p) && p>0 && p<=100000000 ? p : null;
  }
  function validDate(v) {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;
    const dt=new Date(v+'T00:00:00Z');
    return !Number.isNaN(dt.getTime()) && dt.toISOString().slice(0,10)===v;
  }
  function captureEvidence(s,f,h) {
    const d=s.data;
    d.draft={vehicle:safe(f.vehicle).trim().toUpperCase(),inspectionDate:safe(f.inspectionDate).trim(),closingReading:safe(f.closingReading).trim(),availability:safe(f.availability)};
    if(!d.draft.vehicle || !/^[A-Z0-9 -]{4,12}$/.test(d.draft.vehicle)) {h.fail(s,'Enter the vehicle registration shown on the inspection record.',['vehicle']);return null;}
    if(!validDate(d.draft.inspectionDate)) {h.fail(s,'Enter a valid inspection date.',['inspectionDate']);return null;}
    if(!['provided','missing'].includes(d.draft.availability)) {h.fail(s,'Choose whether verified reading evidence is available.',['availability']);return null;}
    let reading=null;
    if(d.draft.availability==='provided') {
      if(!/^\d+$/.test(d.draft.closingReading) || !Number.isSafeInteger(Number(d.draft.closingReading)) || Number(d.draft.closingReading)>9999999) {h.fail(s,'Enter a whole, non-negative odometer reading. If evidence is missing, select “Reading unavailable”.',['closingReading']);return null;}
      reading=Number(d.draft.closingReading);
    }
    return {vehicle:d.draft.vehicle,date:d.draft.inspectionDate,reading,availability:d.draft.availability,reference:d.inspectionReference};
  }
  function validateEvidence(d) {
    const e=d.evidence,issues=[];
    if(!e || e.reading===null)issues.push('The verified closing boundary reading is missing.');
    if(e && e.vehicle.replace(/\s+/g,'')!==d.plate.replace(/\s+/g,''))issues.push('The inspection vehicle does not match the declaration vehicle.');
    if(e && e.date!==d.periodEnd)issues.push('The closing evidence date does not match the billing-period boundary.');
    if(e && e.reading!==null && e.reading<d.opening)issues.push('The closing odometer is below the opening odometer of '+num(d.opening)+' miles.');
    return issues;
  }
  function move(s,h,path,next,stage,title,detail,tone) {
    h.step(s,path,next,title,detail,tone||'info');s.stage=stage;
  }
  function handoff(s,h,stage,role,title,detail) {
    h.note(s,title,detail);s.role=role;s.stage=stage;s.error=null;s.errorFields=[];
  }
  function finish(s,h,path,end,title,detail,success) {
    move(s,h,path,[end],'done',title,detail,success?'success':'warning');
    s.done=true;s.data.status=success?'Closed':'Open for follow-up';s.completion={title,detail,tone:success?'success':'warning'};
  }
  function act(s,action,f,h) {
    if(s.done){h.fail(s,'This run has reached its final outcome. Reset or choose another scenario to explore another path.');return;}
    const d=s.data;
    const stages={
      record_evidence:'record',open_validation:'validation_handoff',validate_readings:'validate',request_clarification:'request_clarification',open_mot:'correction_handoff',submit_clarification:'correct',open_hold:'hold_handoff',save_hold:'hold',calculate_assessment:'assess',compare_advance:'compare',issue_invoice:'invoice',open_owner_invoice:'owner_handoff',make_payment:'owner_payment',leave_unpaid:'owner_payment',open_receipts:'payment_handoff',check_receipt:'payment_check',post_receipt:'post_payment',save_payment_pending:'payment_pending',confirm_zero:'zero',approve_refund:'approve_refund',open_payments:'refund_handoff',execute_refund:'transfer_refund',open_refund_ledger:'refund_ledger_handoff',post_refund:'post_refund',save_refund_pending:'refund_pending',reconcile_ledger:'reconcile',close_case:'close',save_residual:'residual'
    };
    if(stages[action]!==s.stage){h.fail(s,'That action is not available at this stage. Use the action shown in the current workspace.');return;}
    switch(action) {
      case 'record_evidence': {
        const ev=captureEvidence(s,f,h);if(!ev)return;
        d.evidence=ev;d.status='Inspection recorded; awaiting validation';
        move(s,h,['record','verified','reading_merge'],['validate_pair'],'validation_handoff','Inspection result recorded',ev.reading===null?'A missing-evidence notice was recorded. No mileage value was invented.':'Closing reading '+num(ev.reading)+' miles recorded for '+ev.vehicle+'. The tax authority must still validate the pair.');break;
      }
      case 'open_validation':handoff(s,h,'validate',roleTax,'Tax authority workspace opened','Responsibility moves from the MOT centre to the officer who checks the period and vehicle.');break;
      case 'validate_readings': {
        d.findings=validateEvidence(d);
        if(d.findings.length) {
          d.status='Reading clarification required';
          move(s,h,['validate_pair','validation_split','needs_clarification'],['request_clarification'],'request_clarification','Reading validation failed',d.findings.join(' '),'warning');
        } else {
          d.status='Readings accepted';
          move(s,h,['validate_pair','validation_split','pair_accepted'],['calculate'],'assess','Reading pair accepted','Both records belong to '+d.plate+', match the billing period and have non-decreasing odometers.','success');
        }break;
      }
      case 'request_clarification': {
        const reason=safe(f.clarificationReason).trim();
        if(!reason){h.fail(s,'Describe the evidence or correction the MOT centre needs to provide.',['clarificationReason']);return;}
        d.correctionReason=reason;d.clarifications++;
        move(s,h,['request_clarification','clarification_requested'],['resolve_issue'],'correction_handoff','Clarification request sent to the MOT centre',reason,'warning');break;
      }
      case 'open_mot':
        d.draft={vehicle:d.plate,inspectionDate:d.periodEnd,closingReading:d.actualSupportedClosing===null?'':String(d.actualSupportedClosing),availability:d.actualSupportedClosing===null?'missing':'provided'};
        d.reviewResolution=d.actualSupportedClosing===null?'unavailable':'corrected';
        handoff(s,h,'correct',roleMot,'MOT correction task opened','The inspector reviews the original evidence. A supplied correction returns to the same validation step.');break;
      case 'submit_clarification': {
        const resolution=safe(f.resolution);d.reviewResolution=resolution;
        if(!['corrected','unavailable'].includes(resolution)){h.fail(s,'Choose an evidence-review outcome.',['resolution']);return;}
        if(resolution==='unavailable') {
          const reason=safe(f.evidenceNote).trim();if(!reason){h.fail(s,'Record why the required evidence cannot be established.',['evidenceNote']);return;}
          d.holdReason=reason;d.status='Evidence unresolved';
          move(s,h,['resolve_issue','clarification_split','unavailable'],['hold'],'hold_handoff','Required evidence remains unavailable',reason,'warning');
        } else {
          if(d.actualSupportedClosing===null){h.fail(s,'No verified closing record exists in this scenario. Record that the required evidence cannot be established.',['resolution']);return;}
          const ev=captureEvidence(s,f,h);if(!ev)return;
          if(ev.reading===null){h.fail(s,'Provide the verified corrected reading, or choose “Evidence cannot be established”.',['closingReading','resolution']);return;}
          d.evidence=ev;d.status='Corrected evidence awaiting revalidation';
          move(s,h,['resolve_issue','clarification_split','corrected','reading_merge'],['validate_pair'],'validation_handoff','Corrected evidence resubmitted','The revised reading is '+num(ev.reading)+' miles. It must pass validation again.');
        }break;
      }
      case 'open_hold':handoff(s,h,'hold',roleTax,'Assessment-hold task opened','The tax authority records an unresolved evidence case, not a zero-tax assessment.');break;
      case 'save_hold': {
        const reason=safe(f.holdReason).trim();if(!reason){h.fail(s,'Add a reason for withholding the assessment.',['holdReason']);return;}
        d.holdReason=reason;
        finish(s,h,['hold','withheld'],'withheld','Assessment withheld; case stays open','No final tax was calculated. The '+cash(d.advanceReceived)+' advance remains recorded, and verified reading evidence is still required.',false);break;
      }
      case 'calculate_assessment': {
        const issues=validateEvidence(d);if(issues.length){h.fail(s,'An assessment needs an accepted reading pair. '+issues.join(' '));return;}
        d.miles=d.evidence.reading-d.opening;d.finalTax=Math.round(d.miles*d.ratePence);d.status='Final liability recorded';
        move(s,h,['calculate','assessed'],['compare'],'compare','Final tax assessment recorded',num(d.miles)+' miles × '+d.ratePence+'p per mile = '+cash(d.finalTax)+'. This creates a liability, not a cash receipt.','success');break;
      }
      case 'compare_advance': {
        d.initialDifference=d.finalTax-d.advanceReceived;
        const branch=d.initialDifference>0?'due':d.initialDifference<0?'refund':'zero';
        const next={due:'dueaction',refund:'refundaction',zero:'zeroaction'}[branch];
        const stage={due:'invoice',refund:'approve_refund',zero:'zero'}[branch];
        d.status=d.initialDifference>0?'Additional payment required':d.initialDifference<0?'Refund required':'No adjustment required';
        move(s,h,['compare','decision',branch],[next],stage,'Settlement route selected',cash(d.finalTax)+' final tax minus '+cash(d.advanceReceived)+' advance actually received = '+cash(d.initialDifference)+'. Exactly one XOR branch is taken.');break;
      }
      case 'issue_invoice': {
        d.invoice={reference:'INV-084-ADD',amount:d.initialDifference};d.status='Additional invoice issued';d.paymentDraft=(s.scenarioId==='residual'?Math.min(3000,d.initialDifference):d.initialDifference)/100;d.paymentDraft=Number(d.paymentDraft).toFixed(2);
        move(s,h,['dueaction','duestate'],['check_payment'],'owner_handoff','Additional invoice issued',cash(d.invoice.amount)+' requested from '+d.owner+'. No receipt has been posted.');break;
      }
      case 'open_owner_invoice':handoff(s,h,'owner_payment',roleOwner,'Owner invoice portal opened','The owner can submit a mock transfer or leave the invoice unpaid. The next EPC activity is still receipt confirmation.');break;
      case 'make_payment': {
        d.paymentDraft=safe(f.paymentAmount);const p=amountInput(f.paymentAmount);
        if(p===null){h.fail(s,'Enter a positive payment in pounds, with at most two decimal places.',['paymentAmount']);return;}
        d.paymentAttempt={amount:p,reference:'BANK-ADD-084',status:s.scenarioId==='payment_pending'?'unconfirmed':'confirmed'};
        h.note(s,'Mock payment submitted',cash(p)+' submitted by the owner. '+(d.paymentAttempt.status==='confirmed'?'A fictional bank confirmation is available for the officer to check.':'This scenario has no bank confirmation. Submission alone does not establish receipt.'));
        s.stage='payment_handoff';s.error=null;s.errorFields=[];break;
      }
      case 'leave_unpaid':d.paymentAttempt=null;h.note(s,'Invoice left unpaid','The owner has not made a transfer. The officer must find no confirmed receipt.','warning');s.stage='payment_handoff';break;
      case 'open_receipts':handoff(s,h,'payment_check',roleTax,'Payment review workspace opened','The officer reads the mock bank feed before deciding whether a receipt can be posted.');break;
      case 'check_receipt': {
        const confirmed=d.paymentAttempt && d.paymentAttempt.status==='confirmed';
        if(confirmed){d.status='Receipt confirmed; awaiting posting';d.receipt=clone(d.paymentAttempt);move(s,h,['check_payment','payment_split','payment_confirmed'],['duepay'],'post_payment','Additional receipt confirmed',cash(d.receipt.amount)+' with reference '+d.receipt.reference+' is confirmed by the mock bank feed. It is not posted to the tax ledger yet.','success');}
        else {d.status='Payment confirmation missing';d.receipt=null;move(s,h,['check_payment','payment_split','payment_unconfirmed'],['document_payment_pending'],'payment_pending','No additional receipt confirmed','An invoice or payment submission cannot be recorded as received cash.','warning');}
        break;
      }
      case 'post_receipt': {
        if(!d.receipt || d.receipt.status!=='confirmed'){h.fail(s,'A confirmed bank receipt is required before posting.');return;}
        if(d.postedRefs.includes(d.receipt.reference)){h.fail(s,'This bank reference has already been posted. A duplicate receipt is blocked.');return;}
        d.ledger.push({type:'ADDITIONAL',reference:d.receipt.reference,amount:d.receipt.amount});d.postedRefs.push(d.receipt.reference);d.receiptPosted=true;d.status='Receipt posted; awaiting reconciliation';
        move(s,h,['duepay','dueend','completed_merge'],['reconcile'],'reconcile','Confirmed receipt posted',cash(d.receipt.amount)+' added to the ledger. Reconciliation must still check whether the whole balance is cleared.','success');break;
      }
      case 'save_payment_pending':finish(s,h,['document_payment_pending','payment_pending'],'payment_pending','Payment outstanding; case stays open',cash(d.initialDifference)+' remains due. The invoice is retained for follow-up, and no unconfirmed receipt is posted.',false);break;
      case 'confirm_zero':d.status='Initial balance confirmed';move(s,h,['zeroaction','zerostate','completed_merge'],['reconcile'],'reconcile','Zero-balance confirmation issued','The advance actually received equals final assessed tax. No additional payment or refund was created.','success');break;
      case 'approve_refund': {
        d.refundAuthorisation={reference:'AUTH-REF-084',amount:-d.initialDifference,payee:d.owner};d.status='Refund authorised';
        move(s,h,['refundaction','refundstate'],['refundpay'],'refund_handoff','Refund authorised',cash(d.refundAuthorisation.amount)+' approved for '+d.owner+'. Approval has not moved any cash.');break;
      }
      case 'open_payments':handoff(s,h,'transfer_refund',rolePayments,'Payments workspace opened','The payments team executes the authorised refund and checks the returned status.');break;
      case 'execute_refund': {
        if(!d.refundAuthorisation || d.refundTransfer){h.fail(s,'This transfer cannot be initiated again. Check its existing reference before any retry.');return;}
        d.refundTransfer={reference:'BANK-REF-084',amount:d.refundAuthorisation.amount,status:s.scenarioId==='refund_pending'?'unconfirmed':'confirmed'};
        d.status=d.refundTransfer.status==='confirmed'?'Refund transfer confirmed; awaiting posting':'Refund transfer unconfirmed';
        if(d.refundTransfer.status==='confirmed')move(s,h,['refundpay','refund_split','refund_confirmed'],['record_refund'],'refund_ledger_handoff','Refund transfer confirmed',cash(d.refundTransfer.amount)+' transferred in the mock bank feed. Post that confirmed transfer to reduce net cash.','success');
        else move(s,h,['refundpay','refund_split','refund_unconfirmed'],['document_refund_pending'],'refund_pending','Refund transfer is unconfirmed','Reference BANK-REF-084 requires investigation. No refund can be posted and no automatic retry is offered.','warning');break;
      }
      case 'open_refund_ledger':handoff(s,h,'post_refund',roleTax,'Refund ledger task opened','A confirmed transfer must be posted exactly once against the declaration.');break;
      case 'post_refund': {
        if(!d.refundTransfer || d.refundTransfer.status!=='confirmed'){h.fail(s,'Only a confirmed refund transfer can be posted.');return;}
        if(d.postedRefs.includes(d.refundTransfer.reference)){h.fail(s,'This refund reference has already been posted. A duplicate is blocked.');return;}
        d.ledger.push({type:'REFUND',reference:d.refundTransfer.reference,amount:d.refundTransfer.amount});d.postedRefs.push(d.refundTransfer.reference);d.refundPosted=true;d.status='Refund posted; awaiting reconciliation';
        move(s,h,['record_refund','refundend','completed_merge'],['reconcile'],'reconcile','Confirmed refund posted',cash(d.refundTransfer.amount)+' recorded as a REFUND. Net cash retained is now '+cash(ledgerNet(d))+'.','success');break;
      }
      case 'save_refund_pending':finish(s,h,['document_refund_pending','refund_pending'],'refund_pending','Refund pending; case stays open','Refund authorisation '+cash(d.refundAuthorisation.amount)+' remains unresolved. The transfer reference is retained and cash is unchanged until confirmation.',false);break;
      case 'reconcile_ledger': {
        d.remaining=d.finalTax-ledgerNet(d);d.status=d.remaining===0?'Balance cleared; ready to close':'Residual balance requires follow-up';
        if(d.remaining===0)move(s,h,['reconcile','balance_split','balance_zero'],['close'],'close','Final settlement balance is zero',cash(d.finalTax)+' assessed tax equals '+cash(ledgerNet(d))+' net recorded cash. Closure is now available.','success');
        else move(s,h,['reconcile','balance_split','residual'],['document_residual'],'residual','A settlement balance remains',cash(d.finalTax)+' assessed tax minus '+cash(ledgerNet(d))+' net cash leaves '+cash(d.remaining)+'. Closure is blocked.','warning');break;
      }
      case 'close_case': {
        if(d.remaining!==0 || d.finalTax-ledgerNet(d)!==0){h.fail(s,'The recorded settlement balance must be exactly zero before closure.');return;}
        d.statement={reference:'STMT-084-FINAL',assessment:d.finalTax,netCash:ledgerNet(d),balance:0};
        finish(s,h,['close','closed'],'closed','Settlement closed and owner notified','The final statement links the assessment, verified readings and real posted cash. '+d.owner+' is shown as notified in this simulation.',true);break;
      }
      case 'save_residual': {
        const note=safe(f.followupNote).trim();if(!note){h.fail(s,'Record the action needed to resolve the remaining balance.',['followupNote']);return;}
        d.followupNote=note;
        finish(s,h,['document_residual','balance_open'],'balance_open','Residual balance recorded; case stays open',(d.remaining>0?cash(d.remaining)+' is still owed. ':cash(-d.remaining)+' remains overpaid. ')+note,false);break;
      }
    }
  }
  function inspectionForm(s,h,correction) {
    const d=s.data,v=d.draft;
    let body=h.kv([{label:'Opening reading',value:num(d.opening)+' miles'},{label:'Opening date',value:d.periodStart},{label:'Declared vehicle',value:d.plate},{label:'Required closing boundary',value:d.periodEnd}]);
    if(correction)body+=h.alert('warning','Clarification request',d.correctionReason)+h.select('resolution','Evidence-review outcome',d.reviewResolution||'corrected',[{value:'corrected',label:'Corrected evidence available'},{value:'unavailable',label:'Evidence cannot be established'}]);
    body+='<div class="form-grid">'+h.field('vehicle','Vehicle registration',v.vehicle,{required:true})+h.field('inspectionDate','Closing evidence date',v.inspectionDate,{type:'date',required:true})+h.field('closingReading','Closing odometer · miles',v.closingReading,{type:'number',min:0,max:9999999,step:1,help:'Enter the verified observation. A lower value will be flagged by the authority.'})+h.select('availability','Reading evidence',v.availability,[{value:'provided',label:'Verified reading available'},{value:'missing',label:'Reading unavailable'}],'Missing evidence is recorded explicitly, not replaced with an estimate.')+'</div>';
    if(correction)body+=h.textarea('evidenceNote','Evidence-review note',d.holdReason,'Required when evidence cannot be established.');
    body+='<div class="actions">'+h.button(correction?'submit_clarification':'record_evidence',correction?'Submit evidence review':'Record inspection result')+'</div>';
    return h.card(correction?'Review the inspection evidence':'Record the closing inspection',body,d.station);
  }
  function ledgerCard(s,h,withAction) {
    const d=s.data;
    let body=h.table(['Type','Confirmed reference','Cash effect'],d.ledger.map(r=>[h.badge(r.type,r.type==='REFUND'?'warning':'success'),h.esc(r.reference),h.esc((r.type==='REFUND'?'−':'+')+h.money(r.amount))]));
    body+='<div class="divider"></div>'+h.kv([{label:'Final tax liability',value:d.finalTax===null?'Not assessed':h.money(d.finalTax)},{label:'Net cash retained',value:h.money(ledgerNet(d))},{label:'Remaining balance',value:d.finalTax===null?'Not calculated':h.money(d.finalTax-ledgerNet(d))}]);
    body+='<p class="muted">Remaining balance = final tax − (advances + additional receipts − confirmed refunds).</p>';
    if(withAction)body+='<div class="actions">'+h.button('reconcile_ledger','Reconcile the ledger')+'</div>';
    return h.card('Recorded cash and final reconciliation',body,'Tax ledger · '+d.declarationId);
  }
  function handoffCard(h,title,text,label,action,role) {
    return h.card(title,h.alert('info','Next responsible person: '+role,text)+'<div class="actions">'+h.button(action,label)+'</div>','Responsibility handover');
  }
  function render(s,h) {
    const d=s.data,e=h.esc;
    switch(s.stage) {
      case 'record':return inspectionForm(s,h,false)+h.alert('info','Try an exception','You can enter a different registration, a wrong boundary date or a reading below '+num(d.opening)+' miles. The authority will route inconsistent evidence into clarification.');
      case 'validation_handoff':return handoffCard(h,'Evidence ready for the tax authority','Recording an inspection does not establish that it is suitable for this declaration. The next person validates the pair.','Open tax authority workspace','open_validation',roleTax);
      case 'validate':return h.card('Validate the two boundary readings',h.table(['Check','Declaration / opening record','Closing evidence'],[
        ['Vehicle',e(d.plate),e(d.evidence.vehicle)],['Boundary date',e(d.periodEnd),e(d.evidence.date)],['Odometer',num(d.opening)+' miles',d.evidence.reading===null?h.badge('Unavailable','warning'):num(d.evidence.reading)+' miles']
      ])+h.alert('info','Validation rules','Both readings must refer to the declared vehicle and exact period boundaries. The closing odometer cannot be lower than the opening value.')+'<div class="actions">'+h.button('validate_readings','Validate reading pair')+'</div>','Evidence control');
      case 'request_clarification':return h.card('Request a reading correction',h.alert('danger','Assessment is blocked',d.findings.join(' '))+h.textarea('clarificationReason','Request to the MOT centre',d.findings.join(' ')+' Please review the original inspection evidence and supply a verified correction or an unavailable-evidence finding.')+'<div class="actions">'+h.button('request_clarification','Send clarification request')+'</div>','Exception handling');
      case 'correction_handoff':return handoffCard(h,'A clarification task is waiting',d.correctionReason,'Open MOT correction task','open_mot',roleMot);
      case 'correct':return inspectionForm(s,h,true)+h.alert('info','Evidence available in this mock case',s.scenarioId==='missing'?'The original closing record is unavailable. Select “Evidence cannot be established” to keep the assessment on hold.':'The original inspection record supports '+num(d.actualSupportedClosing)+' miles for '+d.plate+' on '+d.periodEnd+'.');
      case 'hold_handoff':return handoffCard(h,'The evidence issue remains unresolved',d.holdReason,'Open assessment-hold task','open_hold',roleTax);
      case 'hold':return h.card('Withhold the final assessment',h.alert('warning','No reliable mileage difference','There is no accepted reading pair. The case cannot be treated as zero tax or settled.')+h.textarea('holdReason','Reason for the hold',d.holdReason)+'<div class="actions">'+h.button('save_hold','Save assessment hold')+'</div>','Open-case outcome');
      case 'assess':return h.card('Calculate and record the final tax',h.kv([{label:'Verified opening odometer',value:num(d.opening)+' miles'},{label:'Verified closing odometer',value:num(d.evidence.reading)+' miles'},{label:'Actual distance',value:num(d.evidence.reading-d.opening)+' miles'},{label:'Vehicle rate',value:d.vehicleType+' · '+d.ratePence+' pence per mile'}])+'<div class="amount-hero">'+h.money(Math.round((d.evidence.reading-d.opening)*d.ratePence))+'</div><p class="muted">Assessment preview. Round once to the nearest penny, with half-pennies rounded upwards.</p><div class="actions">'+h.button('calculate_assessment','Record final tax assessment')+'</div>','Assessment · '+d.declarationId);
      case 'compare':return h.card('Choose the settlement route',h.chart([{label:'Final tax liability',value:d.finalTax},{label:'Advance actually received',value:d.advanceReceived}],'money')+h.kv([{label:'Final assessed tax',value:h.money(d.finalTax)},{label:'Advance due originally',value:h.money(d.advanceDue)},{label:'Advance actually received',value:h.money(d.advanceReceived)}])+h.alert('info','Cash determines the route','The comparison uses the confirmed advance received. An amount that was merely requested would not count.')+'<div class="actions">'+h.button('compare_advance','Compare with advance received')+'</div>','XOR decision · one outcome');
      case 'invoice':return h.card('Prepare the additional invoice','<div class="document"><p class="eyebrow">Additional tax · '+e(d.caseId)+'</p><div class="amount-hero">'+h.money(d.initialDifference)+'</div>'+h.kv([{label:'Bill to',value:d.owner},{label:'Vehicle',value:d.plate},{label:'Final tax',value:h.money(d.finalTax)},{label:'Advance received',value:h.money(d.advanceReceived)}])+'</div><div class="actions">'+h.button('issue_invoice','Issue additional invoice')+'</div>','Billing');
      case 'owner_handoff':return handoffCard(h,'The invoice is available in the owner portal',h.money(d.invoice.amount)+' is requested. Issuing this document has not created a bank receipt.','Open owner invoice','open_owner_invoice',roleOwner);
      case 'owner_payment':return h.card('Pay your additional tax','<div class="document"><p class="eyebrow">Invoice '+e(d.invoice.reference)+'</p><div class="amount-hero">'+h.money(d.invoice.amount)+'</div><p>'+e(d.owner)+' · '+e(d.plate)+'</p></div>'+h.field('paymentAmount','Mock transfer amount · GBP',d.paymentDraft,{type:'number',min:'0.01',step:'0.01',help:'Try a partial amount to see why posting a payment is not enough to close the case.'})+h.alert('info','Simulation','This button creates a fictional transfer in this demo. No bank account or real payment is involved.')+'<div class="actions">'+h.button('make_payment','Submit mock payment')+h.button('leave_unpaid','Leave invoice unpaid','secondary')+'</div>','Vehicle owner portal');
      case 'payment_handoff':return handoffCard(h,'Return to the payment review',d.paymentAttempt?'The owner submitted '+h.money(d.paymentAttempt.amount)+'. The officer must verify the bank evidence.':'No payment was submitted. The invoice remains due.','Open bank confirmation review','open_receipts',roleTax);
      case 'payment_check':return h.card('Check the mock bank feed',h.table(['Reference','Amount','Bank confirmation'],d.paymentAttempt?[[e(d.paymentAttempt.reference),h.money(d.paymentAttempt.amount),h.badge(d.paymentAttempt.status==='confirmed'?'Confirmed':'Not confirmed',d.paymentAttempt.status==='confirmed'?'success':'warning')]]:[['No matching receipt','£0.00',h.badge('Not received','warning')]])+h.alert('info','Posting control','A payment submission and an invoice are not proof of receipt. Only a confirmed bank amount may enter the ledger.')+'<div class="actions">'+h.button('check_receipt','Check receipt confirmation')+'</div>','Payments review');
      case 'post_payment':return h.card('Post the confirmed receipt','<div class="receipt">'+h.badge('Bank confirmed','success')+'<div class="amount-hero">'+h.money(d.receipt.amount)+'</div>'+h.kv([{label:'Bank reference',value:d.receipt.reference},{label:'Allocation',value:d.declarationId},{label:'Payment type',value:'ADDITIONAL'}])+'</div>'+h.alert('info','Duplicate protection','The ledger checks the bank reference before posting. A partial receipt is recorded at its actual amount.')+'<div class="actions">'+h.button('post_receipt','Post receipt to ledger')+'</div>','Confirmed cash only');
      case 'payment_pending':return h.card('Keep the unpaid invoice visible',h.alert('warning','Payment remains outstanding',h.money(d.initialDifference)+' is due, with no confirmed additional receipt.')+h.kv([{label:'Invoice',value:d.invoice.reference},{label:'Cash posted for this invoice',value:'£0.00'},{label:'Next responsibility',value:'Tax authority follow-up'}])+'<div class="actions">'+h.button('save_payment_pending','Record outstanding payment')+'</div>','Open-case outcome');
      case 'zero':return h.card('Confirm no adjustment is required',h.alert('success','Advance equals final tax',h.money(d.finalTax)+' assessed tax is fully covered by the advance actually received.')+h.kv([{label:'Additional payment',value:'£0.00'},{label:'Refund',value:'£0.00'},{label:'New cash records needed',value:'None'}])+'<div class="actions">'+h.button('confirm_zero','Issue zero-balance confirmation')+'</div>','No-transfer route');
      case 'approve_refund':return h.card('Review and approve the refund','<div class="amount-hero">'+h.money(-d.initialDifference)+'</div>'+h.kv([{label:'Payee',value:d.owner},{label:'Advance received',value:h.money(d.advanceReceived)},{label:'Final tax',value:h.money(d.finalTax)},{label:'Destination',value:'Registered owner account · DEMO-084'}])+h.alert('info','Approval is separate from transfer','Authorising repayment does not reduce recorded cash. Transfer confirmation and ledger posting come next.')+'<div class="actions">'+h.button('approve_refund','Approve refund')+'</div>','Refund approval');
      case 'refund_handoff':return handoffCard(h,'An authorised refund is ready',h.money(d.refundAuthorisation.amount)+' is authorised under '+d.refundAuthorisation.reference+'. The payments team will request the transfer.','Open payments workspace','open_payments',rolePayments);
      case 'transfer_refund':return h.card('Execute the authorised refund','<div class="document">'+h.kv([{label:'Authorisation',value:d.refundAuthorisation.reference},{label:'Payee',value:d.owner},{label:'Refund amount',value:h.money(d.refundAuthorisation.amount)},{label:'Destination',value:'Fictional registered account · DEMO-084'}])+'</div>'+h.alert('info','Mock bank interaction','The demo returns a confirmed or unconfirmed result. An uncertain transfer is never automatically retried.')+'<div class="actions">'+h.button('execute_refund','Execute mock refund transfer')+'</div>','Payments team');
      case 'refund_ledger_handoff':return handoffCard(h,'The bank confirms the refund',h.money(d.refundTransfer.amount)+' is confirmed under '+d.refundTransfer.reference+'. The tax authority must post the completed refund.','Open refund ledger task','open_refund_ledger',roleTax);
      case 'post_refund':return h.card('Post the completed refund','<div class="receipt">'+h.badge('Transfer confirmed','success')+'<div class="amount-hero">'+h.money(d.refundTransfer.amount)+'</div>'+h.kv([{label:'Transfer reference',value:d.refundTransfer.reference},{label:'Payment type',value:'REFUND'},{label:'Effect on net retained cash',value:'Decrease by '+h.money(d.refundTransfer.amount)}])+'</div><div class="actions">'+h.button('post_refund','Post confirmed refund')+'</div>','Cash ledger');
      case 'refund_pending':return h.card('Record an unresolved refund',h.alert('warning','Transfer is not confirmed','Do not post a refund and do not initiate a duplicate transfer. Investigate the existing reference first.')+h.kv([{label:'Transfer reference',value:d.refundTransfer.reference},{label:'Authorised amount',value:h.money(d.refundAuthorisation.amount)},{label:'Refund cash posted',value:'£0.00'},{label:'Next responsibility',value:'Payments team confirmation follow-up'}])+'<div class="actions">'+h.button('save_refund_pending','Record refund pending')+'</div>','Open-case outcome');
      case 'reconcile':return ledgerCard(s,h,true);
      case 'close':return h.card('Close the settled case',h.alert('success','Closure condition met','The recorded balance is exactly £0.00. Every cash entry is backed by a confirmed reference.')+h.kv([{label:'Final assessment',value:h.money(d.finalTax)},{label:'Net cash retained',value:h.money(ledgerNet(d))},{label:'Owner to notify',value:d.owner}])+'<div class="actions">'+h.button('close_case','Close settlement and notify owner')+'</div>','Final control');
      case 'residual':return h.card('Assign the remaining balance for follow-up',h.alert('warning','This case cannot be closed',(d.remaining>0?h.money(d.remaining)+' is still owed.':h.money(-d.remaining)+' remains overpaid.')+' A recorded payment does not automatically mean settlement.')+h.textarea('followupNote','Required follow-up',d.remaining>0?'Request confirmation of the remaining payment and review the case when it is received.':'Review the excess cash and determine the additional refund required.')+'<div class="actions">'+h.button('save_residual','Save unresolved-balance case')+'</div>','Reconciliation exception')+ledgerCard(s,h,false);
      case 'done':return h.card(s.completion.title,h.alert(s.completion.tone,'Run outcome',s.completion.detail)+(d.statement?'<div class="document"><p class="eyebrow">Final statement '+e(d.statement.reference)+'</p>'+h.kv([{label:'Owner',value:d.owner},{label:'Vehicle / period',value:d.plate+' · 2026'},{label:'Final tax',value:h.money(d.finalTax)},{label:'Net recorded cash',value:h.money(ledgerNet(d))},{label:'Closing balance',value:'£0.00'}])+'</div>':h.kv([{label:'Case status',value:'Open for follow-up'},{label:'Final tax',value:d.finalTax===null?'Withheld, not zero':h.money(d.finalTax)},{label:'Net cash recorded',value:h.money(ledgerNet(d))}]))+'<p class="muted">Use Reset or choose another scenario to explore a different route through the same EPC.</p>','End of this process run');
      default:return h.card('Workspace unavailable','<p>Reset the demo to start a new run.</p>');
    }
  }
  function guide(s) {
    if(s.done)return null;
    const d=s.data;
    const g=(action,title,detail,fields)=>({action,title,detail,fields:fields||{}});
    switch(s.stage) {
      case 'record':return g('record_evidence','Record the inspection','Save the observation. Business validation occurs in the tax-authority workspace.',clone(d.draft));
      case 'validation_handoff':return g('open_validation','Hand over to the tax authority','The next task belongs to the officer who validates the readings.');
      case 'validate':return g('validate_readings','Run the evidence checks','The XOR decision routes valid evidence toward assessment and inconsistent evidence toward clarification.');
      case 'request_clarification':return g('request_clarification','Request a correction','Document the findings so the MOT centre can resolve the specific issue.',{clarificationReason:d.findings.join(' ')+' Please review the original inspection evidence.'});
      case 'correction_handoff':return g('open_mot','Open the inspector task','The responsibility returns to the MOT centre.');
      case 'correct':return g('submit_clarification',s.scenarioId==='missing'?'Record unavailable evidence':'Submit the supported correction',s.scenarioId==='missing'?'No invented reading is allowed. The case must stay unresolved.':'The corrected reading loops back through the same validation task.',{resolution:s.scenarioId==='missing'?'unavailable':'corrected',vehicle:d.plate,inspectionDate:d.periodEnd,closingReading:d.actualSupportedClosing===null?'':String(d.actualSupportedClosing),availability:d.actualSupportedClosing===null?'missing':'provided',evidenceNote:d.holdReason});
      case 'hold_handoff':return g('open_hold','Open the authority hold task','The authority records why assessment cannot proceed.');
      case 'hold':return g('save_hold','Save an assessment hold','This is an explicit open outcome, not zero tax.',{holdReason:d.holdReason});
      case 'assess':return g('calculate_assessment','Record the assessment','Calculate actual miles, apply the project rate and record a liability.');
      case 'compare':return g('compare_advance','Choose the financial route','Subtract actual advance receipts from the final assessment.');
      case 'invoice':return g('issue_invoice','Issue the additional invoice','An invoice requests payment but does not record received cash.');
      case 'owner_handoff':return g('open_owner_invoice','Open the owner invoice','The owner sees the exact additional amount.');
      case 'owner_payment':return s.scenarioId==='payment_pending'?g('leave_unpaid','Leave the invoice unpaid','Explore the route where no receipt can be confirmed.'):g('make_payment',s.scenarioId==='residual'?'Submit a partial payment':'Submit the mock payment','This creates a fictional bank-feed entry. The officer still needs to confirm and post it.',{paymentAmount:String(d.paymentDraft)});
      case 'payment_handoff':return g('open_receipts','Return to receipt review','The authority checks bank evidence, not just the owner submission.');
      case 'payment_check':return g('check_receipt','Check receipt confirmation','Only a confirmed receipt can move to posting.');
      case 'post_payment':return g('post_receipt','Post the actual receipt','Record only the amount received, with a unique reference.');
      case 'payment_pending':return g('save_payment_pending','Keep the unpaid case open','Retain the invoice for follow-up without inventing cash.');
      case 'zero':return g('confirm_zero','Confirm the zero adjustment','No cash transfer is required, but final reconciliation still is.');
      case 'approve_refund':return g('approve_refund','Approve the overpayment refund','Authorisation and bank transfer remain separate steps.');
      case 'refund_handoff':return g('open_payments','Open the payments workspace','The payments team now owns the transfer task.');
      case 'transfer_refund':return g('execute_refund','Execute a mock transfer','The returned confirmation status determines whether posting is permitted.');
      case 'refund_ledger_handoff':return g('open_refund_ledger','Open the confirmed-refund task','Move to the ledger after bank confirmation.');
      case 'post_refund':return g('post_refund','Post the confirmed refund','A REFUND decreases net cash retained.');
      case 'refund_pending':return g('save_refund_pending','Keep the unconfirmed refund pending','Do not post cash or retry an uncertain transfer.');
      case 'reconcile':return g('reconcile_ledger','Reconcile every recorded cash movement','Final tax minus advances and additional receipts, plus completed refunds, determines the remaining balance.');
      case 'close':return g('close_case','Close and issue the final statement','Closure is available only after a zero-balance reconciliation.');
      case 'residual':return g('save_residual','Record the remaining balance','Partial payment or excess cash prevents closure.',{followupNote:d.remaining>0?'Follow up the remaining payment and reconcile again once confirmed.':'Review excess cash and arrange any further required refund.'});
      default:return null;
    }
  }
  window.ProcessDemo={
    id:'p2',title:'Inspection & settlement',subtitle:'Turn verified mileage into a reconciled final tax statement.',scenarios,create,render,act,guide,
    metrics(s){const d=s.data;return [
      {label:'Final assessed tax',value:d.finalTax===null?'Not assessed':cash(d.finalTax),detail:d.miles===null?'Requires accepted evidence':num(d.miles)+' miles · '+d.ratePence+'p / mile'},
      {label:'Advance received',value:cash(d.advanceReceived),detail:'Confirmed cash already allocated'},
      {label:'Net cash retained',value:cash(ledgerNet(d)),detail:'Advances + receipts − refunds'},
      {label:'Settlement balance',value:d.finalTax===null?'Not calculated':cash(d.finalTax-ledgerNet(d)),detail:d.finalTax===null?'No liability yet':d.finalTax-ledgerNet(d)===0?'Balanced':'Needs settlement',tone:d.finalTax!==null&&d.finalTax-ledgerNet(d)===0?'success':'neutral'}
    ];},
    caseInfo(s){const d=s.data;return [{label:'Case',value:d.caseId},{label:'Vehicle owner',value:d.owner},{label:'Vehicle',value:d.plate+' · '+d.vehicleType},{label:'Billing period',value:'1 Jan to 31 Dec 2026'},{label:'Current case status',value:d.status}];}
  };
})();
