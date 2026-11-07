// Money is allocated in integer paisa. Payments settle the oldest outstanding bills first.
export function dhakaDate(now = new Date()): string {
  const p = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  return ['year','month','day'].map(k=>p.find(x=>x.type===k)!.value).join('-');
}
export function addCalendarYear(date:string):string {
  const [y,m,d]=date.split('-').map(Number);
  const day=Math.min(d,new Date(Date.UTC(y+1,m,0)).getUTCDate());
  return `${y+1}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
export function daysBetween(start:string,end:string):number {return Math.round((Date.parse(end+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/86400000);}
export type AgingTransaction={id:string;party_id:string;date:string;credit?:number;payment?:number;created_at?:string};
export function calculateAging(rows:AgingTransaction[],asOf:string) {
  const groups=new Map<string,AgingTransaction[]>();
  for(const r of rows){if(r.date>asOf)continue;const a=groups.get(r.party_id)||[];a.push(r);groups.set(r.party_id,a);}
  return [...groups].map(([partyId,txs])=>{
    const bills:{date:string;amount:number}[]=[];let payments=0;
    for(const t of txs.sort((a,b)=>a.date.localeCompare(b.date)||(a.created_at||'').localeCompare(b.created_at||'')||a.id.localeCompare(b.id))){
      const charge=Math.round(Number(t.credit||0)*100),paid=Math.round(Number(t.payment||0)*100);
      // Negative adjustments reduce the corresponding side of the ledger.
      if(charge>0)bills.push({date:t.date,amount:charge});else payments-=charge;
      if(paid<0)bills.push({date:t.date,amount:-paid});else payments+=paid;
    }
    const buckets=[0,0,0,0];let oldest:string|null=null;
    for(const bill of bills){const applied=Math.min(Math.max(payments,0),bill.amount);bill.amount-=applied;payments-=applied;if(!bill.amount)continue;
      oldest??=bill.date;const days=Math.max(0,daysBetween(bill.date,asOf));buckets[days<=30?0:days<=60?1:days<=90?2:3]+=bill.amount;}
    return {partyId,buckets:buckets.map(n=>n/100),total:buckets.reduce((a,b)=>a+b,0)/100,advance:Math.max(payments,0)/100,oldest,days:oldest?Math.max(0,daysBetween(oldest,asOf)):0};
  });
}
