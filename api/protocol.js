import { supabase } from './_supabaseClient.js';
import { publicProtocolSnapshot } from './_protocolProjection.js';

export const config = { api: { bodyParser: { sizeLimit: '3mb' } } };
const err=(res,status,error)=>res.status(status).json({error});
// The assigned week is controlled by the portal, never by the editable draft.
function validEditPassword(password,details){
  const round=String(details?.round ?? '').trim();
  return /^\d+$/.test(round) && Number(round)>0 && typeof password==='string' && password===`ffkfutsall${round}`;
}
const protectedFields=['round','competition','cupStage','season','matchDate','startTime','venue','city','organization','organizationNote','securityName','securityId','attendance','teams','officials'];
function canonical(value){
  if(Array.isArray(value))return value.map(canonical);
  if(value && typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
  return value;
}
function protectedChanged(before,after){return protectedFields.some(key=>JSON.stringify(canonical(before?.[key]??null))!==JSON.stringify(canonical(after?.[key]??null)));}
function editingLocked(draft){return draft?._editLocked===true || (!!draft?.phase && draft.phase!=='setup');}
function cors(req,res) {
  const allowed=process.env.PROTOCOL_ORIGIN;
  if (allowed && req.headers.origin === allowed) {
    res.setHeader('Access-Control-Allow-Origin',allowed);
    res.setHeader('Vary','Origin');
    res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods','GET, POST, PUT, OPTIONS');
  }
}
async function identity(req,res) {
  const token=/^Bearer\s+(.+)$/i.exec(req.headers.authorization||'')?.[1];
  if (!token) {err(res,401,'Kyçja kërkohet.');return null;}
  const {data,error}=await supabase.auth.getUser(token);
  if (error || !data?.user || !data.user.email_confirmed_at) {err(res,401,'Sesioni nuk është i vlefshëm.');return null;}
  const result=await supabase.from('protocol_delegates').select('id,username,first_name,last_name,city,active,must_change_password').eq('user_id',data.user.id).maybeSingle();
  if (result.error) {err(res,503,'Verifikimi i delegatit dështoi.');return null;}
  if (!result.data?.active) {err(res,403,'Llogaria nuk ka qasje.');return null;}
  return {user:data.user,delegate:result.data};
}
export default async function handler(req,res) {
  cors(req,res); res.setHeader('Cache-Control','no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    const actor=await identity(req,res);if(!actor)return;
    const body=req.body||{};
    if (req.method==='POST' && body.action==='change-password') {
      const password=body.password;
      if(typeof password!=='string'||password.length<6||password.length>128)return err(res,400,'Fjalëkalimi duhet të ketë 6–128 karaktere.');
      const {error:changeError}=await supabase.auth.admin.updateUserById(actor.user.id,{password});
      if(changeError) return err(res,400,'Fjalëkalimi nuk u ndryshua.');
      const {error:flagError}=await supabase.from('protocol_delegates').update({must_change_password:false}).eq('id',actor.delegate.id);
      if(flagError) return err(res,503,'Fjalëkalimi u ndryshua, por konfirmimi dështoi. Provoni përsëri.');
      return res.status(200).json({ok:true});
    }
    if(actor.delegate.must_change_password)return res.status(403).json({error:'Ndryshoni fjalëkalimin para se të vazhdoni.',code:'PASSWORD_CHANGE_REQUIRED'});
    if(req.method==='GET' && !req.query?.id){
      const {data,error}=await supabase.from('protocol_assignments').select('id,portal_match_id,match_details,state,rejection_reason,published,publication_blocked,created_at,updated_at,draft').eq('delegate_id',actor.delegate.id).is('archived_at',null).order('created_at',{ascending:false});
      if(error)throw error;return res.status(200).json({delegate:actor.delegate,assignments:(data||[]).map(({draft,...a})=>({...a,phase:draft?.phase||'setup'}))});
    }
    const id=String(req.query?.id||body.id||'');
    if(!/^[a-f\d-]{36}$/i.test(id))return err(res,400,'Caktimi është i pavlefshëm.');
    if(req.method==='GET'){
      const {data,error}=await supabase.from('protocol_assignments').select('id,match_details,state,rejection_reason,draft,draft_version,published,publication_blocked').eq('id',id).eq('delegate_id',actor.delegate.id).is('archived_at',null).maybeSingle();
      if(error)throw error;if(!data)return err(res,404,'Caktimi nuk u gjet.');return res.status(200).json({assignment:data});
    }
    if(req.method==='POST' && body.action==='verify-edit'){
      const result=await supabase.from('protocol_assignments').select('match_details,state').eq('id',id).eq('delegate_id',actor.delegate.id).is('archived_at',null).maybeSingle();
      if(result.error)throw result.error;
      if(!result.data || result.data.state!=='accepted')return err(res,404,'Caktimi nuk u gjet.');
      if(!/^\d+$/.test(String(result.data.match_details?.round??'').trim()) || Number(result.data.match_details.round)<=0)return err(res,400,'Numri i javës mungon në portal. Kontaktoni administratorin.');
      if(!validEditPassword(body.password,result.data.match_details))return err(res,403,'Fjalëkalimi është i pasaktë.');
      return res.status(200).json({ok:true});
    }
    if(req.method==='POST' && body.action==='respond'){
      if(!['accepted','rejected'].includes(body.state))return err(res,400,'Përgjigjja është e pavlefshme.');
      const reason=typeof body.reason==='string'?body.reason.trim():'';
      if(body.state==='rejected' && (!reason || reason.length>1000))return err(res,400,'Shkruani arsyen e refuzimit.');
      const {data,error}=await supabase.from('protocol_assignments').update({state:body.state,rejection_reason:body.state==='rejected'?reason:null,responded_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id).eq('delegate_id',actor.delegate.id).eq('state','pending').is('archived_at',null).select('id,state').maybeSingle();
      if(error)throw error;if(!data)return err(res,409,'Caktimi nuk u gjet ose është përgjigjur tashmë.');return res.status(200).json({assignment:data});
    }
    if(req.method==='PUT'){
      if(!body.draft || typeof body.draft!=='object' || Array.isArray(body.draft) || !Number.isInteger(body.version) || body.version<0 || typeof body.published!=='boolean' || JSON.stringify(body.draft).length>2500000) return err(res,400,'Të dhënat e procesverbalit nuk janë të vlefshme.');
      const current=await supabase.from('protocol_assignments').select('match_details,state,publication_blocked,draft').eq('id',id).eq('delegate_id',actor.delegate.id).is('archived_at',null).maybeSingle();
      if(current.error)throw current.error;
      if(!current.data || current.data.state!=='accepted')return err(res,404,'Caktimi nuk u gjet.');
      if(editingLocked(current.data.draft)){
        // A started protocol cannot be unlocked by changing the client-side flag or phase.
        body.draft._editLocked=true;
        if(protectedChanged(current.data.draft,body.draft) && !validEditPassword(body.editPassword,current.data.match_details))return err(res,403,'Fjalëkalimi i javës kërkohet për ndryshimin e të dhënave të ndeshjes.');
      }
      const publishing=body.published && !current.data.publication_blocked;
      const snapshot=publishing?publicProtocolSnapshot(body.draft):null;
      if(snapshot){
        const norm=v=>String(v||'').trim().toLocaleLowerCase('sq');
        if(!snapshot.teams.a.name || !snapshot.teams.b.name || norm(snapshot.teams.a.name)!==norm(current.data.match_details?.home) || norm(snapshot.teams.b.name)!==norm(current.data.match_details?.away))return err(res,400,'Skuadrat duhet të përputhen me ndeshjen e caktuar para publikimit.');
      }
      const {data,error}=await supabase.from('protocol_assignments').update({draft:body.draft,draft_version:body.version+1,published:publishing,public_snapshot:snapshot,updated_at:new Date().toISOString()}).eq('id',id).eq('delegate_id',actor.delegate.id).eq('state','accepted').eq('draft_version',body.version).eq('publication_blocked',current.data.publication_blocked).is('archived_at',null).select('id,draft_version,published,publication_blocked,updated_at').maybeSingle();
      if(error)throw error;if(!data)return err(res,409,'Procesverbali ka ndryshuar ose nuk është i disponueshëm. Ringarkoni para ruajtjes.');return res.status(200).json({assignment:data});
    }
    return err(res,405,'Metoda nuk lejohet.');
  } catch {return err(res,503,'Shërbimi është përkohësisht i padisponueshëm.');}
}
