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
        supabase.from('protocol_delegates').select('id,username,first_name,last_name,city,active,must_change_password,created_at').order('created_at',{ascending:false}),
        supabase.from('protocol_assignments').select('id,delegate_id,portal_match_id,match_details,state,rejection_reason,responded_at,published,updated_at,created_at').order('created_at',{ascending:false})
      ]);
      if (delegates.error || assignments.error) throw new Error('database');
      return res.status(200).json({delegates:delegates.data,assignments:assignments.data});
    }
    if (req.method !== 'POST') return error(res,405,'Metoda nuk lejohet');
    const body=req.body || {};
    if (body.action === 'create') {
      const username=clean(body.username,40).toLowerCase(), firstName=clean(body.firstName), lastName=clean(body.lastName), city=clean(body.city), password=body.password;
      if (!/^[a-z0-9][a-z0-9_-]{2,39}$/.test(username) || !firstName || !lastName || !city || typeof password !== 'string' || password.length<12 || password.length>128) return error(res,400,'Plotësoni të gjitha fushat; fjalëkalimi duhet të ketë 12–128 karaktere.');
      const {data:existing,error:lookupError}=await supabase.from('protocol_delegates').select('id').eq('username',username).maybeSingle();
      if (lookupError) throw lookupError;
      if (existing) return error(res,409,'Ky emër përdoruesi ekziston.');
      const {data:created,error:authError}=await supabase.auth.admin.createUser({email:`${username}@delegates.invalid`,password,email_confirm:true});
      if (authError || !created?.user) return error(res,409,'Llogaria nuk u krijua. Kontrolloni emrin e përdoruesit.');
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
      if (insertError?.code==='23505') return error(res,409,'Kjo ndeshje është caktuar tashmë për këtë delegat.');
      if (insertError) throw insertError;
      return res.status(201).json({assignment});
    }
    return error(res,400,'Veprim i panjohur');
  } catch {return error(res,503,'Shërbimi i delegatëve është përkohësisht i padisponueshëm.');}
}
