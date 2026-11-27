(function () {
  'use strict';
  const scenarios = [
    {id:'clean', title:'4 April · Final assessments', description:'Forecast all five segments, compare the issued tax with original advances and plan settlement capacity.'},
    {id:'january', title:'3 January · Midyear forecast', description:'Alice has an issued assessment; four open segments have matching accepted estimates.'},
    {id:'data-quality', title:'3 January · Missing buyer case', description:'Ben is registered, but his tax case is missing. Inspect the incomplete forecast, correct the source and revalidate.'},
    {id:'report-revision', title:'Management requests a revision', description:'The figures are valid, but management asks for a clearer coverage statement before release.'},
    {id:'source-defect', title:'A defect discovered during review', description:'New MOT evidence changes an assessment. Return to the source and rerun both analyses.'}
  ];
  const F=window.P3Forecast, summarize=F.summarize;
  const pounds=n=>n===null?'Incomplete':new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(n/100);
  const coverage=a=>`${a.assessed} assessed · ${a.estimated} estimated · ${a.incomplete} incomplete`;
  const reportName=F.year.label+' final tax forecast and gross adjustments';
  function currentRows(s) {return s.data.snapshot || F.segments(s.data.source,F.year,s.data.cutoff);}
  function standardInterpretation(s) {
    const a=summarize(currentRows(s));
    return `${F.year.label} expected final tax: ${pounds(a.expected)} (${coverage(a)}). Gross additions of ${pounds(a.additional)} and refunds of ${pounds(a.refunds)} compare issued tax with the original advance due. Neither analysis measures cash received.`;
  }
  function create(id) {
    const scenario=scenarios.some(x=>x.id===id)?id:'clean',source=F.seed();
    const cutoff=['january','data-quality','report-revision'].includes(scenario)?F.january:F.april;
    if(cutoff===F.january)for(const c of source.cases)if(c.assessment.assessedAt>cutoff)c.assessment=null;
    if(scenario==='data-quality')source.cases=source.cases.filter(c=>c.ownershipId!==2);
    if(scenario==='source-defect') {
      const a=source.cases.find(c=>c.ownershipId===2).assessment;
      a.closing=31500;a.finalTax=F.tax(a.closing-a.opening,'BEV');
    }
    return {
      scenarioId:scenario,stage:'extract',role:'Reporting analyst',active:['p3_extract'],
      visited:['p3_start','p3_extract_merge'],trace:[],error:null,errorFields:[],done:false,
      data:{source,cutoff,snapshot:null,snapshotNumber:0,year:F.year.label,validation:null,issues:[],
        jobs:{forecast:false,adjustments:false},analysis:null,reportVersion:0,reviewCount:0,
        reportTitle:reportName,interpretation:'',reviewComment:'',
        revisionText:'',correctionValue:'',correctionNote:'',issue:null,corrections:0,
        finding:scenario==='report-revision'?'revision':scenario==='source-defect'?'source':null,
        findingResolved:false,approved:false,released:false,
        planSlots:'',planFollowups:'',planNote:'',plan:null}
    };
  }
  function dataTable(s,h) {
    return h.table(['Ownership / vehicle','Type','Source at cutoff','Miles','Expected final tax','Original advance due'],currentRows(s).map(r=>[
      `<strong>${h.esc(r.owner)}</strong><br>${h.esc(r.vehicle)}`,h.badge(r.type),
      h.badge(r.caseId===null?'No tax case':r.basis,r.amount===null?'danger':'neutral'),
      r.miles===null?'—':h.num(r.miles),pounds(r.amount),r.originalDue===null?'—':h.money(r.originalDue)
    ]));
  }
  function forecastTable(a,h) {
    return h.table(['Billing year','Type','Distinct vehicles','Assessed or estimated miles','Expected final tax (GBP)','Incomplete segments'],
      a.groups.map(g=>[h.esc(g.year),h.esc(g.type),g.vehicles,g.miles===null?'—':h.num(g.miles),pounds(g.amount),g.incomplete]))+
      h.alert(a.incomplete?'warning':'info',`Grand total: ${pounds(a.expected)}`,coverage(a));
  }
  function dataset(s,h) {
    return h.card(s.data.snapshot?`Snapshot S${String(s.data.snapshotNumber).padStart(2,'0')}`:'Source-record preview',
      `<p class="muted">Registered ownership segments for ${F.year.label}, as of ${h.esc(s.data.cutoff)}. Alice and Ben share one vehicle and the 26,000-mile handover reading.</p>${dataTable(s,h)}`,'DATA WORKSPACE');
  }
  function qualityIssues(rows) {
    const errors=[],ids=new Set();
    rows.forEach(r=>{
      const issue=text=>errors.push({record:r.id,text});
      if(ids.has(r.id))issue('Duplicate ownership segment.');
      ids.add(r.id);
      if(r.caseId===null)issue(`${r.owner} has a registered ownership but no tax case at the cutoff.`);
      else if(r.amount===null)issue(`${r.owner} has neither an issued assessment nor a usable estimate.`);
      else if(!Number.isInteger(r.miles)||r.miles<0||r.amount!==F.tax(r.miles,r.type))issue('Mileage and tax are inconsistent.');
      if(!['BEV','PHEV'].includes(r.type))issue('Vehicle type is not recognised.');
      if(r.basis==='Issued assessment'&&r.originalDue===null)issue('Original advance missing for the gross adjustment comparison.');
    });
    return errors;
  }
  function report(s,h) {
    const a=s.data.analysis || summarize(currentRows(s));
    return h.card(s.data.reportTitle,
      `<div class="report-heading">${h.badge(s.data.released?'Released':s.data.approved?'Approved':'Draft',s.data.released?'success':'neutral')} ${h.badge('Version '+s.data.reportVersion)} ${h.badge('Snapshot S'+String(s.data.snapshotNumber).padStart(2,'0'))}</div>
      <div class="grid-3"><div class="inline-stat"><span>Original advance demands</span><strong>${pounds(a.originalDue)}</strong></div><div class="inline-stat"><span>Gross additional tax</span><strong>${pounds(a.additional)}</strong></div><div class="inline-stat"><span>Gross refunds</span><strong>${pounds(a.refunds)}</strong></div></div>
      <p class="lead">${h.esc(s.data.interpretation)}</p>
      ${forecastTable(a,h)}`,'MANAGEMENT REPORT');
  }
  function analyses(s,h) {
    const a=summarize(currentRows(s)),both=s.data.jobs.forecast&&s.data.jobs.adjustments;
    const card=(key,title,description,action,result)=>`<section class="job-card"><div class="job-status">${h.badge(s.data.jobs[key]?'Complete':'Ready',s.data.jobs[key]?'success':'neutral')}</div><h3>${title}</h3><p>${description}</p>${s.data.jobs[key]?result:h.button(action,'Run analysis','primary')}</section>`;
    return h.card('Run the two required analyses',
      `<p class="muted">Both jobs use snapshot S${String(s.data.snapshotNumber).padStart(2,'0')}. You may run either one first. The AND join opens only when both finish.</p>
      <div class="parallel-grid">
      ${card('forecast','Forecast final tax by vehicle type','Use issued assessments and eligible open estimates for registered segments.','runForecast',`<strong>${pounds(a.expected)} expected final tax</strong><p>${coverage(a)}</p>`)}
      ${card('adjustments','Gross assessed adjustments','Compare issued tax with the original advance due for each assessed case.','runAdjustments',`${h.chart([{label:'Additional tax',value:a.additional},{label:'Refunds',value:a.refunds}],'money')}<p>${a.additionalCases} additional-tax cases · ${a.refundCases} refund cases</p>`)}
      </div>
      ${s.data.jobs.forecast?forecastTable(a,h):''}
      ${h.alert(both?'success':'info',both?'AND join satisfied':'Waiting at the AND join',both?'Both outputs are ready. Compile a report using their shared definitions and population coverage.':`${Number(s.data.jobs.forecast)+Number(s.data.jobs.adjustments)} of 2 analyses complete. A single successful query is not a complete management report.`)}
      ${!both?'<div class="actions">'+h.button('compile','Compile report','secondary',{disabled:true,title:'Complete both analyses first.'})+'</div>':''}`,'PARALLEL ANALYSIS');
  }
  function render(s,h) {
    const d=s.data;
    if(s.stage==='extract')return h.card('Prepare a reporting snapshot',
      `<p class="lead">What final tax do we expect for this billing year, by vehicle type, and is the forecast complete?</p>
      <div class="form-grid">${h.select('year','April–March billing year',d.year,[{value:F.year.label,label:F.year.label},{value:'2029/30',label:'2029/30 · no demo records'}],'The label comes from the tax year, including for a January buyer.')}${h.field('snapshotDate','Reporting cutoff (UTC)',d.cutoff,{readonly:true})}</div>
      ${d.corrections?h.alert('info','Source records have changed','Extract a new snapshot at the updated cutoff. Validate it and rerun both analyses.'):h.alert('info','Start with the register','Include each ownership that overlaps the year and has started by the cutoff, even if its case is missing.')}
      <div class="actions">${h.button('extract','Extract reporting records')}</div>`,'REPORTING ANALYST')+dataset(s,h);
    if(s.stage==='validate')return h.card('Check the reporting dataset',
      `<p class="lead">Check every registered segment before releasing the two analyses.</p><ul class="check-list"><li>Distinct ownership segments and recognised vehicle types</li><li>Case for this ownership and tax year, created by the cutoff</li><li>Issued assessment or, only while open, an accepted estimate covering the exact segment</li><li>Consistent miles and tax; an original advance for each assessed comparison</li></ul>
      <div class="actions">${h.button('validate','Run data-quality checks')}</div>`,'CONTROLLING')+dataset(s,h);
    if(s.stage==='logIssue')return h.card('Create a source-correction request',
      `${h.alert('danger','Report blocked',d.issue.message)}
      ${h.kv([{label:'Affected record',value:d.issue.record},{label:'Discovered during',value:d.issue.origin==='review'?'Management review':'Data-quality validation'},{label:'Responsible team',value:'Source-data owner / tax operations'}])}
      ${h.textarea('issueNote','Correction request',d.reviewComment||d.issue.message,'State the source error. The reporting analyst must not quietly edit an aggregate.')}
      <div class="actions">${h.button('logIssue','Send correction request')}</div>`,'CONTROLLING')+
      h.card('Forecast and coverage at the rejected cutoff',forecastTable(summarize(currentRows(s)),h))+dataset(s,h);
    if(s.stage==='correct') {
      const issue=d.issue;
      return h.card('Correct the originating record',
        `${h.alert('warning','Report withheld until correction',issue.message)}
        <div class="document"><p class="eyebrow">VERIFIED SUPPORTING EVIDENCE</p><h3>${h.esc(issue.record)}</h3><p>${h.esc(issue.evidence)}</p></div>
         <div class="form-grid">${h.field('correctionValue',issue.kind==='buyer'?'Remaining miles for the new case':'Correct assessed actual mileage',d.correctionValue,{type:'number',min:0,max:1000000,step:1,required:true,help:'Use the mileage in the verified evidence above.'})}${h.field('recordId','Source record',issue.record,{readonly:true})}</div>
        ${h.textarea('correctionNote','Correction completion note',d.correctionNote,'Describe the evidence checked and the change made.')}
        ${h.alert('info','Correct the source, then start a fresh snapshot','The affected tax amount will be recalculated using the record’s vehicle type. Both reporting analyses must be run again.')}
        <div class="actions">${h.button('saveCorrection','Save verified correction')}</div>`,'SOURCE-DATA OWNER / TAX OPERATIONS');
    }
    if(s.stage==='analyses')return analyses(s,h);
    if(s.stage==='compile')return analyses(s,h)+h.card('Build the management report',
      `<div class="form-grid">${h.field('reportTitle','Report title',d.reportTitle,{required:true})}${h.field('coverage','Forecast coverage',coverage(d.analysis),{readonly:true})}</div>
      ${h.textarea('interpretation','Interpretation and coverage',d.interpretation||standardInterpretation(s),'Explain what the numbers measure and which records are covered.')}
      <div class="actions">${h.button('compile','Compile draft report')}</div>`,'REPORTING ANALYST');
    if(s.stage==='review') {
      const finding=d.finding&&!d.findingResolved;
      const msg=d.finding==='source'?sourceIssue().message:'Management asks which segments use assessments, which use estimates, and how expected final tax differs from cash received.';
      return h.card('Review before release',
        `${finding?h.alert('warning','A review finding needs resolution',msg):h.alert('success','Draft ready for a review decision','Check the figures, assessment coverage and interpretation. Approval makes this exact version eligible for release.')}
        ${h.textarea('reviewComment','Review comment',d.reviewComment||'Please make the assessment coverage and liability-versus-cash distinction explicit.','Required when requesting a revision or reporting a source defect.')}
         <div class="actions">${h.button('approve','Approve report','primary',{disabled:!!finding,title:finding?'Resolve the known review finding before approval.':''})}${h.button('requestRevision','Request report revision','secondary')}${h.button('flagSource','Flag source-data defect','secondary',{disabled:d.finding!=='source'||!finding,title:'Requires conflicting source evidence.'})}</div>
        <p class="small muted">A report revision keeps the accepted data. A source defect invalidates the snapshot and restarts extraction and both analyses.</p>`,'AUTHORITY MANAGEMENT')+report(s,h);
    }
    if(s.stage==='revise')return h.card('Revise the explanation',
      `${h.alert('warning','Management’s revision request',d.reviewComment)}
       ${h.textarea('revisionText','Revised interpretation',d.revisionText||d.interpretation,'State forecast coverage and distinguish expected final tax from cash.')}
      <p class="muted">The accepted snapshot and query results remain unchanged. Only the report explanation is revised, then management reviews the new version.</p>
      <div class="actions">${h.button('submitRevision','Submit revised report')}</div>`,'REPORTING ANALYST')+report(s,h);
    if(s.stage==='release')return h.card('Release the approved version',
      `${h.alert('success','Management approval recorded','The exact version shown below has passed review. Release it to make it available for planning.')}
       ${h.kv([{label:'Version',value:'Report v'+d.reportVersion},{label:'Source snapshot',value:'S'+String(d.snapshotNumber).padStart(2,'0')},{label:'Audience',value:'Authority management'},{label:'Billing year / cutoff',value:d.year+' / '+d.cutoff}])}
      <div class="actions">${h.button('release','Release approved report')}</div>`,'CONTROLLING / REPORTING ANALYST')+report(s,h);
    if(s.stage==='plan') {
      const a=d.analysis,work=a.additionalCases+a.refundCases;
      return h.card('Turn the report into a planning decision',
        `<p class="lead">Use expected final tax for revenue planning and adjustment case counts to schedule settlement reviews.</p>
         ${h.alert('info','What the report supports',`${a.additionalCases} additional-tax cases and ${a.refundCases} refund cases require ${work} review slots. ${a.estimated} segments still rely on estimates.`)}
         <div class="form-grid">${h.field('planSlots','Settlement review slots',d.planSlots,{type:'number',min:work,max:10000,step:1,required:true,help:'Cover the additional-tax and refund cases, with any chosen buffer.'})}${h.field('planFollowups','Unassessed segments to follow up',d.planFollowups,{type:'number',min:a.estimated,max:10000,step:1,required:true})}</div>
         ${h.textarea('planNote','Decision and rationale',d.planNote||planningNote(a), 'Record how the measures inform a concrete action.')}
        <div class="actions">${h.button('savePlan','Save planning decision')}</div>`,'AUTHORITY MANAGEMENT')+report(s,h);
    }
    if(s.stage==='done')return h.card('Planning decision recorded',
      `${h.alert('success','Reporting cycle complete','Validated records became two independent analyses, a reviewed report and a documented management action.')}
       <div class="receipt"><p class="eyebrow">DECISION RECORD · ${d.year}</p><h3>${h.esc(d.reportTitle)}</h3>${h.kv([{label:'Approved report',value:'Version '+d.reportVersion+' / snapshot S'+String(d.snapshotNumber).padStart(2,'0')},{label:'Settlement review slots',value:d.plan.slots},{label:'Unassessed records to follow up',value:d.plan.followups},{label:'Recorded by',value:'Authority management'}])}<p>${h.esc(d.plan.note)}</p></div>
      ${h.alert('info','Why the process matters','The AND join prevents incomplete reporting. Review controls separate wording changes from source corrections. The final step turns information into an accountable decision.')}`,'COMPLETED')+report(s,h);
    return h.alert('danger','Unknown state','Reset this scenario to continue.');
  }
  function requireStage(s,allowed,h) {
    if(allowed.includes(s.stage))return true;
    h.fail(s,'That action is not available at this point in the process. Use the action shown in the current workspace.');return false;
  }
  function sourceIssue() {
    return {record:'Ben · DEMO001',kind:'actual',expected:6000,origin:'review',message:'Ben’s assessment uses 5,500 miles. The verified readings are 26,000 and 32,000 miles: a 6,000-mile segment.',
      evidence:'The corrected closing reading is 32,000 miles. At 3p per mile the issued tax should be £180.00.'};
  }
  function planningNote(a) {
    return `Reserve ${a.additionalCases+a.refundCases+1} settlement review slots and follow up on ${a.estimated} unassessed segments. Use ${pounds(a.expected)} as expected final tax, not cash received.`;
  }
  function resetAnalysis(d) {d.jobs={forecast:false,adjustments:false};d.analysis=null;d.approved=false;d.released=false;}
  function act(s,action,form,h) {
    const d=s.data;form=form||{};
    if(action==='extract') {
      if(!requireStage(s,['extract'],h))return;
      if((form.year??d.year)!==F.year.label)return h.fail(s,'Select '+F.year.label+' to extract the demo records.',['year']);
      d.snapshot=F.segments(d.source,F.year,d.cutoff);d.snapshotNumber++;d.validation=null;resetAnalysis(d);
      h.step(s,['p3_extract','p3_available'],['p3_check'],'Reporting snapshot extracted',`${d.snapshot.length} registered segments at ${d.cutoff}: ${coverage(summarize(d.snapshot))}.`);
      s.stage='validate';s.role='Controlling';return;
    }
    if(action==='validate') {
      if(!requireStage(s,['validate'],h))return;
      d.issues=qualityIssues(d.snapshot);d.validation=d.issues.length?'failed':'passed';
      if(d.issues.length) {
        const row=d.snapshot.find(r=>r.id===d.issues[0].record),buyer=row.id===2&&row.caseId===null;
        d.issue={record:row.owner+' · '+row.vehicle,kind:buyer?'buyer':'unknown',origin:'validation',
          message:d.issues.map(x=>x.text).join(' '),expected:buyer?5000:null,
          evidence:buyer?'The register shows Ben took over on 1 January at 26,000 miles. His signed estimate is 5,000 miles through 31 March. Open the missing case and accept the estimate on 4 January.':'No verified correction is supplied for this record.'};
        d.correctionValue='';d.correctionNote='';d.reviewComment='';
        h.step(s,['p3_check','p3_quality_split','p3_issues','p3_correction_merge'],['p3_log'],'Data-quality check failed',d.issue.message,'warning');
        s.stage='logIssue';return;
      }
      h.step(s,['p3_check','p3_quality_split','p3_accepted','p3_analysis_split'],['p3_advance_query','p3_adjustment_query'],'Dataset accepted; both analyses released',`${coverage(summarize(d.snapshot))}. Both analyses use this validated snapshot.`,'success');
      s.stage='analyses';s.role='Reporting analyst';return;
    }
    if(action==='logIssue') {
      if(!requireStage(s,['logIssue'],h))return;
      d.reviewComment=String(form.issueNote===undefined?d.issue.message:form.issueNote).trim();
      if(d.reviewComment.length<15)return h.fail(s,'Describe the source issue in at least 15 characters before sending the correction request.',['issueNote']);
      h.step(s,['p3_log','p3_withheld'],['p3_correct'],'Source correction requested',`The report is withheld. Tax operations receives a correction request for ${d.issue.record}.`,'warning');
      s.stage='correct';s.role='Source-data owner / tax operations';return;
    }
    if(action==='saveCorrection') {
      if(!requireStage(s,['correct'],h))return;
      d.correctionValue=String(form.correctionValue===undefined?d.correctionValue:form.correctionValue).trim();d.correctionNote=String(form.correctionNote===undefined?d.correctionNote:form.correctionNote).trim();
      const n=Number(d.correctionValue);
      if(d.issue.expected===null)return h.fail(s,'Verified source evidence is required before this report can progress.');
      if(d.correctionValue===''||!Number.isInteger(n)||n<0||n>1000000)return h.fail(s,'Enter a whole mileage value between 0 and 1,000,000.',['correctionValue']);
      if(n!==d.issue.expected)return h.fail(s,`The verified evidence states ${d.issue.expected.toLocaleString('en-GB')} miles. Use that value to correct the source record.`,['correctionValue']);
      if(d.correctionNote.length<15)return h.fail(s,'Add a correction note of at least 15 characters identifying the evidence checked.',['correctionNote']);
      const buyer=d.snapshot.find(r=>r.id===2);
      if(d.issue.kind==='buyer'){
        d.source.cases.push({id:2,ownershipId:buyer.id,yearId:F.year.id,createdAt:'2029-01-04T08:00:00Z',assessment:null,
          declarations:[{revision:1,status:'ACCEPTED',start:buyer.start,end:buyer.end,miles:n,due:F.tax(n,buyer.type),submittedAt:'2029-01-04T10:00:00Z'}]});
        d.cutoff='2029-01-05T00:00:00Z'; // The new case cannot complete the 3 January snapshot.
      } else {
        const a=d.source.cases.find(c=>c.id===buyer.caseId).assessment;
        a.closing=a.opening+n;a.finalTax=F.tax(n,buyer.type);a.assessedAt='2029-04-04T12:00:00Z';
        d.cutoff='2029-04-05T00:00:00Z';d.findingResolved=true;
      }
      d.corrections++;d.snapshot=null;resetAnalysis(d);d.interpretation='';d.reviewComment='';
      h.step(s,['p3_correct','p3_refreshed','p3_extract_merge'],['p3_extract'],'Source record corrected',`${d.issue.record} was corrected from verified evidence. Extract again at ${d.cutoff} and revalidate; the earlier cutoff is unchanged.`,'success');
      s.stage='extract';s.role='Reporting analyst';return;
    }
    if(action==='runForecast'||action==='runAdjustments') {
      if(!requireStage(s,['analyses'],h))return;
      const key=action==='runForecast'?'forecast':'adjustments';
      if(d.jobs[key])return h.fail(s,'This analysis is already complete for the current snapshot.');
      d.jobs[key]=true;const both=d.jobs.forecast&&d.jobs.adjustments;
      const fn=key==='forecast'?'p3_advance_query':'p3_adjustment_query',event=key==='forecast'?'p3_advance_ready':'p3_adjustment_ready';
      const a=summarize(d.snapshot);
      const title=key==='forecast'?'Forecast and coverage results available':'Gross adjustment analysis completed';
      const explanation=key==='forecast'?`Expected final tax: ${pounds(a.expected)}; ${coverage(a)}.`:`${a.assessed} issued assessments: ${pounds(a.additional)} additions and ${pounds(a.refunds)} refunds versus original advance due.`;
      const path=[fn,event];if(both)path.push('p3_analysis_join');
      const next=both?['p3_compile']:[key==='forecast'?'p3_adjustment_query':'p3_advance_query',event];
      h.step(s,path,next,title,explanation+(both?' Both outputs are ready, so the AND join opens.':' The AND join still waits for the other analysis.'),'success');
      if(both){d.analysis=a;s.stage='compile';}return;
    }
    if(action==='compile') {
      if(!requireStage(s,['analyses','compile'],h))return;
      if(!d.jobs.forecast||!d.jobs.adjustments)return h.fail(s,'Both analyses must complete before you can compile the report. The AND join is still waiting.');
      d.reportTitle=String(form.reportTitle===undefined?d.reportTitle:form.reportTitle).trim();
      d.interpretation=String(form.interpretation===undefined?(d.interpretation||standardInterpretation(s)):form.interpretation).trim();
      if(d.reportTitle.length<8||d.reportTitle.length>140)return h.fail(s,'Use a report title between 8 and 140 characters.',['reportTitle']);
      if(d.interpretation.length<30)return h.fail(s,'Add at least 30 characters explaining the measures and assessment coverage.',['interpretation']);
      d.reportVersion++;d.approved=false;
      h.step(s,['p3_compile','p3_compiled','p3_review_merge'],['p3_review'],'Draft management report compiled',`Version ${d.reportVersion} combines both analyses from snapshot S${String(d.snapshotNumber).padStart(2,'0')}. Management must review it before release.`);
      s.stage='review';s.role='Authority management';return;
    }
    if(['approve','requestRevision','flagSource'].includes(action)) {
      if(!requireStage(s,['review'],h))return;
      if(action==='approve') {
        if(d.finding&&!d.findingResolved)return h.fail(s,'The known review finding must be resolved before this version can be approved.');
        d.approved=true;d.reviewCount++;
        h.step(s,['p3_review','p3_review_split','p3_approved'],['p3_release'],'Management approved the report',`Report version ${d.reportVersion} is approved. Release remains a separate controlled action.`,'success');
        s.stage='release';s.role='Controlling / reporting analyst';return;
      }
      d.reviewComment=String(form.reviewComment===undefined?'Please clarify the coverage and financial meaning of this report.':form.reviewComment).trim();
      if(d.reviewComment.length<15)return h.fail(s,'Add a review comment of at least 15 characters.',['reviewComment']);
      d.reviewCount++;d.approved=false;
      if(action==='requestRevision') {
        h.step(s,['p3_review','p3_review_split','p3_revision_needed'],['p3_revise'],'Management requested a report revision',d.reviewComment,'warning');
        s.stage='revise';s.role='Reporting analyst';return;
      }
      if(d.finding!=='source'||d.findingResolved)return h.fail(s,'No conflicting source evidence has been identified for this snapshot.');
      d.issue=sourceIssue();d.correctionValue='5500';d.correctionNote='';resetAnalysis(d);
      h.step(s,['p3_review','p3_review_split','p3_review_source_issue','p3_correction_merge'],['p3_log'],'Source defect identified during review',d.issue.message+' The report cannot be released.','warning');
      s.stage='logIssue';s.role='Controlling';return;
    }
    if(action==='submitRevision') {
      if(!requireStage(s,['revise'],h))return;
      d.revisionText=String(form.revisionText===undefined?d.revisionText:form.revisionText).trim();
      if(d.revisionText.length<40)return h.fail(s,'Add a substantive revised interpretation of at least 40 characters.',['revisionText']);
      if(!/cash/i.test(d.revisionText)||!/(assess|coverage)/i.test(d.revisionText))return h.fail(s,'Address management’s request: mention assessment coverage and distinguish the measures from cash.',['revisionText']);
      d.interpretation=d.revisionText;d.reportVersion++;if(d.finding==='revision')d.findingResolved=true;d.approved=false;
      h.step(s,['p3_revise','p3_revised','p3_review_merge'],['p3_review'],'Revised report submitted',`Version ${d.reportVersion} changes the explanation, not the accepted data. Management must review it again.`);
      s.stage='review';s.role='Authority management';return;
    }
    if(action==='release') {
      if(!requireStage(s,['release'],h))return;
      if(!d.approved||d.analysis.incomplete)return h.fail(s,'Release requires approval and zero incomplete segments.');
      d.released=true;
      h.step(s,['p3_release','p3_released'],['p3_plan'],'Approved report released',`Version ${d.reportVersion} is now available to authority management for planning.`,'success');
      s.stage='plan';s.role='Authority management';return;
    }
    if(action==='savePlan') {
      if(!requireStage(s,['plan'],h))return;
      if(!d.released)return h.fail(s,'Release the approved report before recording a management plan.');
      d.planSlots=String(form.planSlots===undefined?d.planSlots:form.planSlots).trim();d.planFollowups=String(form.planFollowups===undefined?d.planFollowups:form.planFollowups).trim();d.planNote=String(form.planNote===undefined?d.planNote:form.planNote).trim();
      const slots=Number(d.planSlots),followups=Number(d.planFollowups),a=d.analysis,work=a.additionalCases+a.refundCases;
      if(d.planSlots===''||!Number.isInteger(slots)||slots<work||slots>10000)return h.fail(s,`Reserve at least ${work} whole settlement review slots for the sample’s additional-tax and refund cases.`,['planSlots']);
      if(d.planFollowups===''||!Number.isInteger(followups)||followups<a.estimated||followups>10000)return h.fail(s,`Plan follow-up for at least ${a.estimated} unassessed segments.`,['planFollowups']);
      if(d.planNote.length<20)return h.fail(s,'Record a decision and rationale of at least 20 characters.',['planNote']);
      d.plan={slots,followups,note:d.planNote};
      h.step(s,['p3_plan','p3_end'],['p3_end'],'Management planning decision recorded',`${slots} settlement review slots and ${followups} assessment follow-ups recorded against report v${d.reportVersion}.`,'success');
      s.stage='done';s.done=true;s.completion={title:'Information became a management decision',detail:'The released report supports a documented capacity plan, with its coverage and financial meaning preserved.',tone:'success'};return;
    }
    h.fail(s,'This control is not available. Use one of the actions in the current workspace.');
  }
  function guide(s) {
    const d=s.data;
    const g=(action,title,detail,fields={})=>({action,title,detail,fields});
    switch(s.stage) {
      case 'extract':return g('extract',d.corrections?'Extract the corrected source again':'Create the reporting snapshot','Freeze the registered segments and the evidence available at the displayed cutoff.',{year:d.year});
      case 'validate':return g('validate','Check coverage before analysis','An eligible estimate covers an open segment. A missing case or unusable evidence withholds the complete report.');
      case 'logIssue':return g('logIssue','Request correction from the source owner','The reporting team sends a traceable issue instead of silently repairing the total.',{issueNote:d.issue.message});
      case 'correct':return g('saveCorrection','Apply the verified source correction','Use the supporting evidence, then return through fresh extraction and validation.',{correctionValue:String(d.issue.expected),correctionNote:'Checked the verified supporting evidence and corrected the originating record.'});
      case 'analyses':return !d.jobs.forecast?g('runForecast','Forecast final tax by vehicle type','Show distinct vehicles, assessed or estimated miles, expected final tax and incomplete segments.'):g('runAdjustments','Run the adjustment analysis','Compare issued tax with the original advance due. Both outputs are required.');
      case 'compile': {
        const enteredTitle=String(d.reportTitle||'').trim();
        const reportTitle=enteredTitle.length>=8&&enteredTitle.length<=140?enteredTitle:reportName;
        return g('compile','Compile a draft report','Bring the two outputs together with an explicit coverage statement.',{reportTitle,interpretation:standardInterpretation(s)});
      }
      case 'review':
        if(d.finding==='source'&&!d.findingResolved)return g('flagSource','Flag the conflicting source evidence','A source defect restarts correction, extraction, validation and both analyses.',{reviewComment:sourceIssue().message});
        if(d.finding==='revision'&&!d.findingResolved)return g('requestRevision','Request a clearer interpretation','A wording revision uses the accepted data and then returns to review.',{reviewComment:'Distinguish assessed and estimated segments, and expected final tax from cash collected.'});
        return g('approve','Approve the reviewed report','Approval and release remain separate actions.');
      case 'revise':return g('submitRevision','Submit the revised explanation','The same validated source figures will be reviewed again.',{revisionText:standardInterpretation(s)});
      case 'release':return g('release','Release the approved version','Make this version available to management for planning.');
      case 'plan': {
        const a=d.analysis,n=a.additionalCases+a.refundCases;
        return g('savePlan','Record the management action','The process ends with a decision, not merely a dashboard.',{planSlots:String(n+1),planFollowups:String(a.estimated),planNote:planningNote(a)});
      }
      default:return null;
    }
  }
  function metrics(s) {
    const rows=currentRows(s),a=summarize(rows);
    return [{label:'Registered segments',value:String(rows.length),detail:'April–March '+s.data.year},
      {label:'Incomplete segments',value:String(a.incomplete),detail:coverage(a)},
      {label:'Expected final tax',value:pounds(a.expected),detail:a.incomplete?'Grand total withheld':'Assessments and eligible estimates'},
      {label:'Analyses complete',value:(Number(s.data.jobs.forecast)+Number(s.data.jobs.adjustments))+' / 2',detail:'Both required by the AND join'}];
  }
  function caseInfo(s) {return [{label:'Billing year',value:s.data.year+' · April–March'},{label:'Cutoff (UTC)',value:s.data.cutoff.slice(0,10)},{label:'Snapshot',value:s.data.snapshotNumber?'S'+String(s.data.snapshotNumber).padStart(2,'0'):'Not extracted'},{label:'Report version',value:s.data.reportVersion?'v'+s.data.reportVersion:'Not compiled'}];}
  window.ProcessDemo={id:'p3',title:'Management reporting',subtitle:'From validated source records to an accountable planning decision.',scenarios,create,render,act,guide,metrics,caseInfo};
})();
