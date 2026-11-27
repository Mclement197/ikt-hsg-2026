(function(){'use strict';
const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validTone=t=>['info','success','warning','danger','neutral'].includes(t)?t:'neutral';
const H={esc,
 money:p=>p===null||p===undefined?'Not assessed':new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(Number(p)/100),
 num:n=>Number.isFinite(Number(n))?new Intl.NumberFormat('en-GB',{maximumFractionDigits:2}).format(Number(n)):'Not available',
 button:(action,label,variant='primary',attrs={})=>'<button type="button" class="btn btn-'+esc(variant)+'" data-action="'+esc(action)+'"'+(attrs.disabled?' disabled':'')+(attrs.value!==undefined?' data-value="'+esc(attrs.value)+'"':'')+(attrs.title?' title="'+esc(attrs.title)+'"':'')+'>'+esc(label)+'</button>',
 field:(name,label,value,opts={})=>'<label class="field"><span>'+esc(label)+'</span><input name="'+esc(name)+'" type="'+esc(opts.type||'text')+'" value="'+esc(value)+'"'+['min','max','step','placeholder'].map(k=>opts[k]!==undefined?' '+k+'="'+esc(opts[k])+'"':'').join('')+(opts.readonly?' readonly':'')+(opts.required?' required':'')+' autocomplete="off">'+(opts.help?'<small>'+esc(opts.help)+'</small>':'')+'</label>',
 select:(name,label,value,options,help='')=>'<label class="field"><span>'+esc(label)+'</span><select name="'+esc(name)+'">'+options.map(o=>'<option value="'+esc(o.value)+'"'+(String(o.value)===String(value)?' selected':'')+'>'+esc(o.label)+'</option>').join('')+'</select>'+(help?'<small>'+esc(help)+'</small>':'')+'</label>',
 textarea:(name,label,value,help='')=>'<label class="field"><span>'+esc(label)+'</span><textarea name="'+esc(name)+'">'+esc(value)+'</textarea>'+(help?'<small>'+esc(help)+'</small>':'')+'</label>',
 card:(title,body,kicker='')=>'<section class="card"><header class="card-header">'+(kicker?'<div class="eyebrow">'+esc(kicker)+'</div>':'')+'<h2>'+esc(title)+'</h2></header>'+body+'</section>',
 alert:(tone,title,text)=>'<div class="notice '+validTone(tone)+'"><strong>'+esc(title)+'</strong><p>'+esc(text)+'</p></div>',
 badge:(text,tone='neutral')=>'<span class="badge '+validTone(tone)+'">'+esc(text)+'</span>',
 table:(headers,rows)=>'<div class="table-wrap"><table class="data-table"><thead><tr>'+headers.map(v=>'<th scope="col">'+esc(v)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+String(c==null?'':c)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>',
 kv:rows=>'<dl class="kv-list">'+rows.map(r=>'<div class="kv-row"><dt>'+esc(r.label)+'</dt><dd>'+esc(r.value)+'</dd></div>').join('')+'</dl>',
 chart:(rows,format='money')=>{const max=Math.max(1,...rows.map(r=>Math.abs(Number(r.value))));return '<div class="bar-chart">'+rows.map(r=>'<div class="bar-row"><div class="bar-meta"><span>'+esc(r.label)+'</span><strong>'+esc(format==='money'?H.money(r.value):H.num(r.value))+'</strong></div><div class="bar-track"><div class="bar-fill" style="width:'+Math.max(0,Math.min(100,Math.abs(Number(r.value))/max*100)).toFixed(2)+'%"></div></div></div>').join('')+'</div>';},
 step:(s,path,next,title,detail,tone='info')=>{
  const model=window.EPC_MODEL; const known=new Set(model.nodes.map(n=>n.id));
  for(const id of [...path,...next])if(!known.has(id))throw Error('Unknown EPC node: '+id);
  s.visited=Array.from(new Set([...(s.visited||[]),...path]));s.active=next.slice();s.lastNodes=path.slice();s.error=null;s.errorFields=[];
  const edges=new Set((s.edgeVisits||[]));
  const exists=(a,b)=>model.edges.some(e=>e.from===a&&e.to===b);
  for(let i=1;i<path.length;i++)if(exists(path[i-1],path[i]))edges.add(path[i-1]+'>'+path[i]);
  if(path.length)for(const id of next)if(exists(path[path.length-1],id))edges.add(path[path.length-1]+'>'+id);
  for(const id of path){const n=model.nodes.find(n=>n.id===id);if(n&&n.type==='and'){const incoming=model.edges.filter(e=>e.to===id);if(incoming.length>1)for(const edge of incoming)if(s.visited.includes(edge.from))edges.add(edge.from+'>'+id);}}
  s.edgeVisits=Array.from(edges);
  s.trace.push({title,detail,tone:validTone(tone),role:s.role,nodes:path.slice(),active:next.slice(),kind:'step',index:s.trace.length+1});
 },
 fail:(s,message,fields=[])=>{s.error=message;s.errorFields=fields;s.lastNodes=[];s.trace.push({title:'Action blocked',detail:message,tone:'danger',role:s.role,nodes:[],active:s.active.slice(),kind:'error',index:s.trace.length+1});},
 note:(s,title,detail,tone='info')=>{s.error=null;s.errorFields=[];s.trace.push({title,detail,tone:validTone(tone),role:s.role,nodes:[],active:s.active.slice(),kind:'note',index:s.trace.length+1});}
};
window.PortalKit=H;
})();
