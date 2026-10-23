export type AuthLinkError={code:string;message:string};

export function readAuthLinkError(hash:string):AuthLinkError|null{
 const params=new URLSearchParams(hash.replace(/^#/,''));
 const error=params.get('error'),code=params.get('error_code')||error;
 if(!code)return null;
 if(code==='otp_expired'||code==='otp_disabled')
  return {code,message:'This confirmation link is expired, was already used, or is invalid. Request a fresh confirmation email and open only the newest link.'};
 const raw=(params.get('error_description')||'Could not verify your email confirmation link.').replace(/\+/g,' ').slice(0,250);
 return {code,message:raw};
}
