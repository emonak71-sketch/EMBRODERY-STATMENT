import type {Party,Transaction} from '../types';
import {supabase} from './supabaseClient';
async function uid(){const {data:{session}}=await supabase.auth.getSession();if(!session?.user.id)throw Error('Please sign in again.');return session.user.id;}
async function allRows(table:string,userId:string,asOf?:string){const rows:any[]=[];for(let offset=0;;offset+=1000){let q=supabase.from(table).select('*').eq('user_id',userId).order('id').range(offset,offset+999);if(asOf)q=q.lte('date',asOf);const {data,error}=await q;if(error)throw error;rows.push(...(data||[]));if((data||[]).length<1000)break;}return rows;}
export const accountToolsService={
 async aging(asOf:string){const userId=await uid();const [parties,transactions]=await Promise.all([allRows('Parties',userId),allRows('Transactions',userId,asOf)]);return {parties:parties as Party[],transactions:transactions as Transaction[]};},
 async history(offset=0,table='',action=''){let q=supabase.from('ActivityHistory').select('*').eq('user_id',await uid()).order('changed_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+49);if(table)q=q.eq('table_name',table);if(action)q=q.eq('action',action);const {data,error}=await q;if(error)throw error;return data||[];},
 async deleted(){const {data,error}=await supabase.from('DeletedBusinessRecords').select('*').eq('user_id',await uid()).is('restored_at',null).gt('recover_until',new Date().toISOString()).order('deleted_at',{ascending:false});if(error)throw error;return data||[];},
 async restore(id:string){const {error}=await supabase.rpc('restore_business_record',{p_id:id});if(error)throw error;},
 async reviews(){const {data,error}=await supabase.from('worker_salary_reviews').select('*').eq('user_id',await uid()).order('next_review_date');if(error)throw error;return data||[];},
 async setReviewBase(workerId:string,date:string){const {data,error}=await supabase.from('Workers').update({salary_review_base_date:date||null,updated_at:new Date().toISOString()}).eq('id',workerId).eq('user_id',await uid()).select('id');if(error)throw error;if(!data?.length)throw Error('Worker not found or access is unavailable.');},
 async syncReviews(){const {error}=await supabase.rpc('sync_salary_review_notifications');if(error)throw error;}
};
