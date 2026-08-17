/**
 * Load FULL MENUS into the 4 new restaurant demo agents (owner request:
 * agents must answer menu questions directly, not deflect to a texted link).
 * For each agent: patch the prompt rules (answer from KB menu, never invent
 * beyond it), create a new KB = facts + full menu, attach, publish.
 */
import { readFileSync } from 'fs'
const RETELL='https://api.retellai.com'
const rh:any={Authorization:`Bearer ${process.env.RETELL_API_KEY}`,'Content-Type':'application/json'}
const menus = JSON.parse(readFileSync('/private/tmp/claude-501/-Users-anthony/7673fa24-4c74-4666-9927-e3f8101e1466/scratchpad/demo_menus.json','utf8'))
const AGENTS = [
  { id:'agent_a660ad7edfa16e61c640d854d3', name:"Liberatore's Westminster", menu:menus.liberatores },
  { id:'agent_3ef17da2289426f43525abfaf0', name:'Millstone at 74 Main', menu:menus['74main'] },
  { id:'agent_c6f17c9baeba370297d48cf319', name:'Revivalist', menu:menus.revivalist },
  { id:'agent_4af4b79a83ce5a77f595aec265', name:'110 Grill Portsmouth', menu:menus['110grill'] },
]
const SUBS: Array<[string,string]> = [
  ["- THE MENU IS NOT IN YOUR HEAD BY DISH: never state or invent a specific dish or price. For any specific dish, ingredient, or price, text the menu link instead.",
   "- THE MENU: you KNOW the menu, it's in your knowledge base. Answer dish and price questions confidently from it, saying prices casually (\"that's about fourteen dollars\"). Only name dishes and prices that are actually in the menu, never invent or improvise items. If something isn't listed or they want to browse everything, text the menu link."],
  ["You do NOT know the menu by dish. Offer the link: \"I don't want to get a dish wrong, so let me text you our menu link, that'll have everything, sound good?\" (send_link with the menu link). Never invent a dish or a price.",
   "Answer from the menu in your knowledge base, warm and specific, like a host who eats there. Recommend one or two favorites when asked. Never invent a dish or price that isn't in the menu. If they want to look it over themselves or ask for something not listed, offer to text the menu link (send_link)."],
  ["You have a knowledge base with the verified facts (location, hours, reservations, the menu policy, private events). It does NOT list individual dishes or prices. So for any specific dish, ingredient, or price, TEXT THE MENU LINK (send_link), never invent one. For a serious allergy, hand the caller to the team.",
   "You have a knowledge base with the verified facts (location, hours, reservations, private events) AND the full menu with prices. Answer menu questions directly from it. Never state a dish or price that isn't in it. For a serious allergy, reassure them warmly and hand the details to the team."],
  ["- Specific dishes or prices: TEXT THE MENU LINK, never guess.",
   "- Menu questions: answer straight from the knowledge-base menu, never invent beyond it. Text the menu link only if they want to browse."],
]
for (const a of AGENTS) {
  const ag:any=await(await fetch(`${RETELL}/get-agent/${a.id}`,{headers:{Authorization:rh.Authorization}})).json()
  const llmId=ag.response_engine.llm_id
  const llm:any=await(await fetch(`${RETELL}/get-retell-llm/${llmId}`,{headers:{Authorization:rh.Authorization}})).json()
  let p:string=llm.general_prompt
  let missing=0
  for (const [o,n] of SUBS){ if(!p.includes(o)){missing++;console.log(`  MISSING sub in ${a.name}:`,o.slice(0,50))} else p=p.replaceAll(o,n) }
  if(missing>0 && missing===SUBS.length) throw new Error('no subs matched for '+a.name)
  // new KB: old facts + menu
  const oldKbIds:string[]=llm.knowledge_base_ids||[]
  let facts=''
  if(oldKbIds[0]){
    const kb:any=await(await fetch(`${RETELL}/get-knowledge-base/${oldKbIds[0]}`,{headers:{Authorization:rh.Authorization}})).json()
    // KB sources aren't retrievable as raw text reliably; rebuild facts from prompt KNOWLEDGE section instead
  }
  const kIdx=p.indexOf('# KNOWLEDGE, THE ESSENTIALS')
  const kEnd=p.indexOf('# YOUR KNOWLEDGE BASE')
  facts=(kIdx>=0&&kEnd>kIdx)?p.slice(kIdx,kEnd):''
  const kbText=`${a.name} - verified facts + FULL MENU (demo knowledge base)\n\n${facts}\n\n${a.menu}\nPrivate events / large groups: capture as a lead (send_dispatch_request); never confirm on the call.`
  const fd=new FormData()
  fd.append('knowledge_base_name',`${a.name} v2 menu`)
  fd.append('knowledge_base_texts',JSON.stringify([{title:`${a.name.replace(/[^a-z0-9]/gi,'_')}_menu_kb`,text:kbText}]))
  const nkb:any=await(await fetch(`${RETELL}/create-knowledge-base`,{method:'POST',headers:{Authorization:rh.Authorization},body:fd})).json()
  if(!nkb?.knowledge_base_id) throw new Error('kb failed for '+a.name)
  const up=await fetch(`${RETELL}/update-retell-llm/${llmId}`,{method:'PATCH',headers:rh,body:JSON.stringify({general_prompt:p,knowledge_base_ids:[nkb.knowledge_base_id]})})
  if(!up.ok) throw new Error('llm update failed '+a.name)
  const pub=await fetch(`${RETELL}/publish-agent/${a.id}`,{method:'POST',headers:rh})
  console.log(`${a.name}: prompt patched (${SUBS.length-missing}/${SUBS.length} subs), kb ${nkb.knowledge_base_id}, publish ${pub.status}`)
}
// wait for KBs to index
await new Promise(r=>setTimeout(r,20000))
for (const a of AGENTS) {
  const ag:any=await(await fetch(`${RETELL}/get-agent/${a.id}`,{headers:{Authorization:rh.Authorization}})).json()
  const llm:any=await(await fetch(`${RETELL}/get-retell-llm/${ag.response_engine.llm_id}`,{headers:{Authorization:rh.Authorization}})).json()
  const kb:any=await(await fetch(`${RETELL}/get-knowledge-base/${(llm.knowledge_base_ids||[])[0]}`,{headers:{Authorization:rh.Authorization}})).json()
  console.log(`VERIFY ${a.name}: menu-rule in prompt: ${llm.general_prompt.includes("you KNOW the menu")} | kb status: ${kb.status}`)
}
