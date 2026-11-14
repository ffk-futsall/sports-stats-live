import { supabase, getAppData } from './_supabaseClient.js';
import { requireAdmin } from './_adminAuth.js';

const clean = (v, max = 100) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const error = (res, code, message) => res.status(code).json({error: message});
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if (!await requireAdmin(req,res)) return;
  try {
    if (req.method === 'GET') {
      const [delegates, assignments] = await Promise.all([
        supabase.from('protocol_delegates').select('id,username,first_name,last_name,city,active,must_change_password,created_at').eq('active',true).order('created_at',{ascending:false}),
        supabase.from('protocol_assignments').select('id,delegate_id,portal_match_id,match_details,state,rejection_reason,responded_at,published,publication_blocked,updated_at,created_at').is('archived_at',null).order('created_at',{ascending:false})
      ]);
      if (delegates.error || assignments.error) throw new Error('database');
      return res.status(200).json({delegates:delegates.data,assignments:assignments.data});
    }
    if (req.method !== 'POST') return error(res,405,'Metoda nuk lejohet');
    const body=req.body || {};
    if (body.action === 'create') {
      const username=clean(body.username,40).toLowerCase(), firstName=clean(body.firstName), lastName=clean(body.lastName), city=clean(body.city), password=body.password;
      if (!firstName || !lastName || !city) return error(res,400,'Plotësoni emrin, mbiemrin dhe qytetin.');
      if (!/^[a-z0-9][a-z0-9_-]{2,39}$/.test(username)) return error(res,400,'Emri i përdoruesit duhet të ketë 3–40 karaktere: shkronja pa thekse, numra, _ ose -.');
      if (typeof password !== 'string' || password.length<6 || password.length>128) return error(res,400,'Fjalëkalimi duhet të ketë 6–128 karaktere.');
      const {data:existing,error:lookupError}=await supabase.from('protocol_delegates').select('id').eq('username',username).maybeSingle();
      if (lookupError) throw lookupError;
      if (existing) return error(res,409,'Ky emër përdoruesi ekziston.');
      const {data:created,error:authError}=await supabase.auth.admin.createUser({email:`urim.ffkfutsall+delegat-${username}@gmail.com`,password,email_confirm:true});
      if (authError || !created?.user) {
        if (authError?.code === 'weak_password') return error(res,400,'Supabase e refuzoi fjalëkalimin sipas rregullave të projektit. Kontrolloni konfigurimin e sigurisë së fjalëkalimit.');
        if (authError?.code === 'email_exists' || authError?.code === 'user_already_exists') return error(res,409,'Ky emër përdoruesi është tashmë i zënë.');
        console.error('Delegate auth creation failed', {code:authError?.code || 'unknown', status:authError?.status || null});
        return error(res,503,'Llogaria nuk u krijua për shkak të një gabimi të shërbimit të kyçjes.');
      }
      const {data:delegate,error:insertError}=await supabase.from('protocol_delegates').insert({user_id:created.user.id,username,first_name:firstName,last_name:lastName,city}).select('id,username,first_name,last_name,city,active,must_change_password,created_at').single();
      if (insertError) { await supabase.auth.admin.deleteUser(created.user.id); throw insertError; }
      return res.status(201).json({delegate});
    }
    if (body.action === 'assign') {
      const delegateId=clean(body.delegateId,100), matchId=clean(body.matchId,100);
      const [{data:delegate,error:delegateError}, blob] = await Promise.all([supabase.from('protocol_delegates').select('id,active').eq('id',delegateId).maybeSingle(),getAppData()]);
      if (delegateError) throw delegateError;
      if (!delegate || !delegate.active) return error(res,400,'Delegati nuk është aktiv.');
      const match=(blob.matches||[]).find(m=>m.id===matchId);
      if (!match) return error(res,400,'Ndeshja nuk u gjet në portal.');
      const teams=blob.teams||[], comp=(blob.competitions||[]).find(c=>c.id===match.competitionId);
      const details={home:teams.find(t=>t.id===match.homeTeamId)?.name||'',away:teams.find(t=>t.id===match.awayTeamId)?.name||'',competition:comp?.name||'',date:match.date||'',time:match.time||'',venue:match.venue||'',round:match.week||''};
      if (!details.home || !details.away) return error(res,400,'Ndeshjes i mungon skuadra.');
      const {data:assignment,error:insertError}=await supabase.from('protocol_assignments').insert({delegate_id:delegate.id,portal_match_id:matchId,match_details:details}).select('id,delegate_id,portal_match_id,match_details,state,created_at').single();
      if (insertError?.code==='23505') return error(res,409,'Kjo ndeshje ka tashmë një caktim aktiv ose i është caktuar më parë këtij delegati.');
      if (insertError) throw insertError;
      return res.status(201).json({assignment});
    }
    if (body.action === 'edit-delegate') {
      const id=clean(body.delegateId), first_name=clean(body.firstName), last_name=clean(body.lastName), city=clean(body.city);
      if(!first_name||!last_name||!city)return error(res,400,'Plotësoni emrin, mbiemrin dhe qytetin.');
      const {data,error:e}=await supabase.from('protocol_delegates').update({first_name,last_name,city}).eq('id',id).eq('active',true).select('id').maybeSingle();
      if(e)throw e;if(!data)return error(res,404,'Delegati nuk u gjet.');return res.status(200).json({ok:true});
    }
    if (body.action === 'remove-delegate') {
      const {data,error:e}=await supabase.rpc('protocol_deactivate_delegate',{p_delegate_id:clean(body.delegateId)});
      if(e?.code==='P0001')return error(res,409,'Së pari ndryshoni delegatin ose largoni caktimet e tij.');
      if(e)throw e;if(!data)return error(res,404,'Delegati nuk u gjet.');return res.status(200).json({ok:true});
    }
    if (body.action === 'archive-assignment') {
      const {data,error:e}=await supabase.from('protocol_assignments').update({archived_at:new Date().toISOString(),published:false,updated_at:new Date().toISOString()}).eq('id',clean(body.assignmentId)).is('archived_at',null).select('id').maybeSingle();
      if(e)throw e;if(!data)return error(res,404,'Caktimi nuk u gjet.');return res.status(200).json({ok:true});
    }
    if (body.action === 'archive-match') {
      // Fshirja e ndeshjes nga portali: arkivo te gjitha caktimet/procesverbalet e saj qe te zhduket nga publiku.
      const matchId=clean(body.matchId,100);
      if(!matchId)return error(res,400,'Ndeshja mungon.');
      const {data,error:e}=await supabase.from('protocol_assignments').update({archived_at:new Date().toISOString(),published:false,updated_at:new Date().toISOString()}).eq('portal_match_id',matchId).is('archived_at',null).select('id');
      if(e)throw e;return res.status(200).json({ok:true,archived:(data||[]).length});
    }
    if (body.action === 'publication') {
      if(typeof body.blocked!=='boolean')return error(res,400,'Veprimi është i pavlefshëm.');
      const change={publication_blocked:body.blocked,updated_at:new Date().toISOString()};if(body.blocked)change.published=false;
      const {data,error:e}=await supabase.from('protocol_assignments').update(change).eq('id',clean(body.assignmentId)).is('archived_at',null).select('id').maybeSingle();
      if(e)throw e;if(!data)return error(res,404,'Caktimi nuk u gjet.');return res.status(200).json({ok:true});
    }
    if (body.action === 'reassign') {
      const id=clean(body.assignmentId),delegateId=clean(body.delegateId);
      const [{data:current,error:e},{data:delegate,error:de}]=await Promise.all([
        supabase.from('protocol_assignments').select('id,delegate_id,draft_version').eq('id',id).is('archived_at',null).maybeSingle(),
        supabase.from('protocol_delegates').select('id,active').eq('id',delegateId).maybeSingle()]);
      if(e||de)throw e||de;if(!current)return error(res,404,'Caktimi nuk u gjet.');
      if(!delegate?.active||delegate.id===current.delegate_id)return error(res,400,'Zgjidhni një delegat tjetër aktiv.');
      const {data,error:ue}=await supabase.from('protocol_assignments').update({delegate_id:delegate.id,state:'pending',rejection_reason:null,responded_at:null,published:false,draft_version:current.draft_version+1,updated_at:new Date().toISOString()}).eq('id',id).eq('delegate_id',current.delegate_id).eq('draft_version',current.draft_version).is('archived_at',null).select('id').maybeSingle();
      if(ue?.code==='23505')return error(res,409,'Kjo ndeshje ka një caktim tjetër aktiv.');if(ue)throw ue;
      if(!data)return error(res,409,'Caktimi ndryshoi ndërkohë. Rifreskoni dhe provoni përsëri.');return res.status(200).json({ok:true});
    }
    return error(res,400,'Veprim i panjohur');
  } catch {return error(res,503,'Shërbimi i delegatëve është përkohësisht i padisponueshëm.');}
}
