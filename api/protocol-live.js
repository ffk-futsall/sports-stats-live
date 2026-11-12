import { supabase } from './_supabaseClient.js';
export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Metoda nuk lejohet.'});
  res.setHeader('Cache-Control','no-store');
  try{
    // Paginate, otherwise Supabase's row limit silently drops older published results.
    const pageSize=500, all=[];
    for(let offset=0;;offset+=pageSize){
      const {data,error}=await supabase.from('protocol_assignments').select('id,portal_match_id,public_snapshot,updated_at').eq('published',true).eq('state','accepted').eq('publication_blocked',false).is('archived_at',null).order('updated_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+pageSize-1);
      if(error)throw error;
      const page=data||[];all.push(...page);
      if(page.length<pageSize)break;
    }
    // Only the explicitly public projection is shared briefly; never cache errors.
    res.setHeader('Cache-Control','public, max-age=0, must-revalidate');
    res.setHeader('Vercel-CDN-Cache-Control','public, s-maxage=5');
    return res.status(200).json({matches:all.map(x=>({id:x.id,portalMatchId:x.portal_match_id,updatedAt:x.updated_at, ...x.public_snapshot}))});
  }catch{return res.status(503).json({error:'Ndeshjet live nuk janë të disponueshme.'});}
}
