const API={
  "item-search":"https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701",
  "ranking":"https://openapi.rakuten.co.jp/ichibaranking/api/IchibaItem/Ranking/20220601"
};

function cors(origin, env){
  const allowed=env.ALLOWED_ORIGIN || "https://littlesamuraiworks-cloud.github.io";
  const ok=origin===allowed;
  return {
    "Access-Control-Allow-Origin": ok ? origin : allowed,
    "Access-Control-Allow-Methods":"GET,OPTIONS",
    "Access-Control-Allow-Headers":"Content-Type,Accept",
    "Access-Control-Max-Age":"86400",
    "Vary":"Origin",
    "Content-Type":"application/json; charset=utf-8"
  };
}
function json(data,status,origin,env,extra={}){
  return new Response(JSON.stringify(data),{status,headers:{...cors(origin,env),...extra}});
}
function redactUrl(url){
  const u=new URL(url);
  if(u.searchParams.has("accessKey")) u.searchParams.set("accessKey","[REDACTED]");
  return u.toString();
}
export default {
  async fetch(request,env){
    const origin=request.headers.get("Origin")||"";
    if(request.method==="OPTIONS") return new Response(null,{status:204,headers:cors(origin,env)});
    const u=new URL(request.url);

    if(u.pathname==="/health"){
      return json({
        ok:true,service:"rakuten-room-worker",version:"2.1",
        originReceived:origin||null,
        allowedOrigin:env.ALLOWED_ORIGIN||"https://littlesamuraiworks-cloud.github.io",
        appIdConfigured:Boolean(env.RAKUTEN_APP_ID),
        accessKeyConfigured:Boolean(env.RAKUTEN_ACCESS_KEY)
      },200,origin,env);
    }

    if(u.pathname!=="/rakuten") return json({ok:false,error:"not_found"},404,origin,env);
    const expected=env.ALLOWED_ORIGIN||"https://littlesamuraiworks-cloud.github.io";
    if(origin && origin!==expected){
      return json({ok:false,error:"origin_not_allowed",error_description:`Origin must be ${expected}`},403,origin,env);
    }
    if(!env.RAKUTEN_APP_ID || !env.RAKUTEN_ACCESS_KEY){
      return json({ok:false,error:"worker_secret_missing",error_description:"RAKUTEN_APP_ID / RAKUTEN_ACCESS_KEY are not configured."},500,origin,env);
    }

    const apiName=u.searchParams.get("api")||"item-search";
    const endpoint=API[apiName];
    if(!endpoint) return json({ok:false,error:"wrong_api",error_description:"api must be item-search or ranking"},400,origin,env);

    const p=new URLSearchParams(u.searchParams);
    p.delete("api");
    p.set("applicationId",env.RAKUTEN_APP_ID);
    p.set("accessKey",env.RAKUTEN_ACCESS_KEY);
    p.set("format","json");
    if(apiName==="item-search") p.set("formatVersion","2");

    const target=endpoint+"?"+p.toString();
    let response;
    try{
      response=await fetch(target,{
        method:"GET",
        headers:{
          "Accept":"application/json",
          "Origin":expected,
          "Referer":expected+"/"
        },
        cf:{cacheTtl:0,cacheEverything:false}
      });
    }catch(e){
      return json({ok:false,error:"rakuten_network_error",error_description:String(e),target:redactUrl(target)},502,origin,env);
    }

    const text=await response.text();
    let data;
    try{data=JSON.parse(text)}catch{data={raw:text.slice(0,12000)}}

    const payload={
      ok:response.ok,
      upstreamStatus:response.status,
      upstreamStatusText:response.statusText,
      data,
      target:redactUrl(target)
    };
    return json(payload,response.ok?200:response.status,origin,env);
  }
};