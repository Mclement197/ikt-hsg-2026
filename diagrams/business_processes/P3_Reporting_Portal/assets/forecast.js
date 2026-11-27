// Offline Case A snapshot. Keep the ownership register independent of the case
// file: an absent buyer case must not remove the buyer from the population.
(function () {
  'use strict';
  const start='2028-04-01T00:00:00Z', handover='2029-01-01T00:00:00Z', end='2029-04-01T00:00:00Z';
  const year={id:1,label:'2028/29',start,end};
  const january='2029-01-03T00:00:00Z', april='2029-04-04T00:00:00Z';
  const tax=(miles,type)=>Math.floor((miles*(type==='BEV'?6:3)+1)/2); // half-pennies, rounded once
  function seed() {
    const ownerships=[
      {id:1,owner:'Alice',vehicle:'DEMO001',type:'BEV', start:'2027-06-01T00:00:00Z',end:handover},
      {id:2,owner:'Ben',  vehicle:'DEMO001',type:'BEV', start:handover,end:null},
      {id:3,owner:'Clara',vehicle:'DEMO002',type:'BEV', start:'2027-08-01T00:00:00Z',end:null},
      {id:4,owner:'Daniel',vehicle:'DEMO003',type:'PHEV',start:'2028-01-01T00:00:00Z',end:null},
      {id:5,owner:'Emma', vehicle:'DEMO004',type:'PHEV',start:'2028-03-01T00:00:00Z',end:null}
    ];
    function taxCase(id,miles,opening,closing) {
      const type=ownerships.find(o=>o.id===id).type, buyer=id===2;
      const estimateStart=buyer?handover:start;
      return {id,ownershipId:id,yearId:year.id,createdAt:buyer?'2029-01-01T08:00:00Z':'2028-04-01T08:00:00Z',
        declarations:[{revision:1,status:'ACCEPTED',submittedAt:buyer?'2029-01-01T10:00:00Z':'2028-04-01T09:00:00Z',
          start:estimateStart,end,miles,due:tax(miles,type)}],
        assessment:{status:'ISSUED',assessedAt:id===1?'2029-01-01T09:00:00Z':'2029-04-02T09:00:00Z',
          opening,closing,finalTax:tax(closing-opening,type)}};
    }
    return {ownerships,cases:[taxCase(1,10000,20000,26000),taxCase(2,5000,26000,32000),
      taxCase(3,10000,15000,25000),taxCase(4,8000,30000,40000),taxCase(5,10000,10000,22000)]};
  }

  function segments(source,year,cutoff) {
    const rows=[];
    for(const o of source.ownerships) {
      const start=o.start>year.start?o.start:year.start, end=o.end&&o.end<year.end?o.end:year.end;
      if(start>=end||start>cutoff)continue;
      const c=source.cases.find(c=>c.ownershipId===o.id&&c.yearId===year.id&&c.createdAt<=cutoff);
      const declarations=(c?.declarations||[]).filter(d=>d.submittedAt<=cutoff);
      const original=declarations.filter(d=>['ACCEPTED','SUPERSEDED'].includes(d.status)).sort((a,b)=>a.revision-b.revision)[0];
      const estimate=declarations.find(d=>d.status==='ACCEPTED'&&start===d.start&&end===d.end&&cutoff<end);
      const a=c?.assessment;
      const issued=a?.status==='ISSUED'&&a.assessedAt<=cutoff;
      rows.push({id:o.id,owner:o.owner,vehicle:o.vehicle,type:o.type,year:year.label,start,end,caseId:c?.id??null,
        originalDue:original?.due??null, basis:issued?'Issued assessment':estimate?'Accepted estimate':'Incomplete',
        miles:issued?a.closing-a.opening:estimate?.miles??null, amount:issued?a.finalTax:estimate?.due??null});
    }
    return rows;
  }

  // Match the SQL groups and withhold the grand total across any incomplete group.
  // All monetary values stay in pence until display.
  function summarize(rows) {
    const sum=(items,fn)=>items.reduce((n,item)=>n+fn(item),0);
    const buckets=new Map();
    for(const row of rows) {
      const key=row.year+':'+row.type;
      if(!buckets.has(key))buckets.set(key,[]);
      buckets.get(key).push(row);
    }
    const groups=[...buckets.keys()].sort().map(key=>{
      const x=buckets.get(key), incomplete=x.filter(r=>r.amount===null).length;
      return {year:x[0].year,type:x[0].type,vehicles:new Set(x.map(r=>r.vehicle)).size,incomplete,
        miles:incomplete?null:sum(x,r=>r.miles), amount:incomplete?null:sum(x,r=>r.amount)};
    });
    const incomplete=sum(groups,g=>g.incomplete), assessed=rows.filter(r=>r.basis==='Issued assessment');
    const deltas=assessed.filter(r=>r.originalDue!==null).map(r=>r.amount-r.originalDue);
    const missingAdvance=assessed.length-deltas.length;
    return {groups,segments:rows.length,assessed:assessed.length,estimated:rows.length-assessed.length-incomplete,
      incomplete,expected:incomplete?null:sum(groups,g=>g.amount),
      originalDue:rows.some(r=>r.originalDue===null)?null:sum(rows,r=>r.originalDue),
      missingAdvance,additional:missingAdvance?null:sum(deltas,n=>Math.max(n,0)),
      refunds:missingAdvance?null:sum(deltas,n=>Math.max(-n,0)),
      additionalCases:deltas.filter(n=>n>0).length,refundCases:deltas.filter(n=>n<0).length};
  }
  window.P3Forecast={year,january,april,tax,seed,segments,summarize};
})();
