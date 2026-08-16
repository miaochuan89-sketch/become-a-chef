"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import CommunityFeed from "./community-feed";

type Ingredient = { name:string; amount:string; required:boolean };
type Recipe = { name:string; emoji:string; tone?:string; time:number; cost:number; protein:number; description:string; ingredients:Ingredient[]; steps:string[]; note:string; source?:"ai"|"local"|"fallback" };

const makeIngredients=(required:string[],optional:string[]=[])=>[
  ...required.map(name=>({name,amount:"适量",required:true})),
  ...optional.map(name=>({name,amount:"少许",required:false})),
];
const RECIPES:Recipe[]=[
  {name:"番茄鸡蛋盖饭",emoji:"🍅",tone:"tomato",time:15,cost:2.3,protein:18,description:"酸甜浓郁，十几分钟就能完成的可靠选择。",ingredients:makeIngredients(["番茄","鸡蛋","米饭"],["洋葱","葱"]),note:"没有葱也没关系，洋葱切碎会更香。",steps:["番茄切块，鸡蛋加一小撮盐打散。","热锅放油，把鸡蛋炒到刚凝固后盛出。","原锅炒软番茄，加少许盐和糖。","倒回鸡蛋翻匀，浇在热米饭上。"],source:"local"},
  {name:"黄金蛋炒饭",emoji:"🍳",tone:"egg",time:10,cost:1.8,protein:16,description:"用剩米饭最快做出锅气和满足感。",ingredients:makeIngredients(["鸡蛋","米饭"],["洋葱","葱","酱油"]),note:"隔夜米饭最好；没有洋葱可以加任意剩菜。",steps:["米饭抓散，配菜切碎，鸡蛋打散。","先炒香配菜，再推到锅边炒鸡蛋。","倒入米饭大火翻炒，加盐和一点酱油。","炒到米粒松散、锅里没有水汽即可。"],source:"local"},
  {name:"奶香意面",emoji:"🍝",tone:"pasta",time:22,cost:4.6,protein:24,description:"柔和奶香包裹面条，一口锅也能做好。",ingredients:makeIngredients(["意面","牛奶"],["培根","洋葱","黑胡椒"]),note:"培根可以换成蘑菇，牛奶小火加热不要煮沸。",steps:["意面按包装时间煮熟，留半杯面汤。","平底锅煎香培根或蘑菇和洋葱。","倒入牛奶小火加热，不要煮沸。","加入意面拌匀，用面汤调节浓度。"],source:"local"},
  {name:"懒人咖喱鸡肉饭",emoji:"🍛",tone:"curry",time:30,cost:5.2,protein:32,description:"一锅完成，适合清理根茎蔬菜和剩米饭。",ingredients:makeIngredients(["鸡肉","咖喱","米饭"],["土豆","胡萝卜","洋葱"]),note:"没有咖喱块可用咖喱粉加少量牛奶。",steps:["鸡肉和蔬菜切成同样大小的小块。","先煎鸡肉，再加入蔬菜翻炒两分钟。","加水没过食材，煮约十五分钟。","关小火放入咖喱，搅匀后配米饭。"],source:"local"},
  {name:"菠菜鸡蛋汤面",emoji:"🍜",tone:"green",time:12,cost:2.1,protein:17,description:"清爽热乎，忙碌时也能兼顾蔬菜和蛋白质。",ingredients:makeIngredients(["面条","鸡蛋"],["菠菜","香油","胡椒"]),note:"菠菜可替换成生菜、白菜或任何绿叶菜。",steps:["水烧开后放面条，加一点盐。","面条快熟时放入绿叶菜。","沿锅边淋入蛋液，等十秒再搅动。","加酱油、胡椒和香油调味。"],source:"local"},
  {name:"一锅番茄牛肉面",emoji:"🥩",tone:"beef",time:28,cost:5.8,protein:35,description:"番茄汤底鲜亮，牛肉和主食一锅到位。",ingredients:makeIngredients(["牛肉","番茄","面条"],["洋葱","胡椒"]),note:"用牛肉末最快，牛肉片也可以。",steps:["洋葱炒软，加入牛肉炒至变色。","放番茄炒出汁，加酱油和热水。","煮十分钟后放入面条。","面条熟后尝味，加盐和胡椒。"],source:"local"},
];
const LEGACY_DEFAULT_PANTRY=["鸡蛋","番茄","米饭","洋葱","牛奶"];
const SUGGESTED_INGREDIENTS=["鸡蛋","番茄","米饭","面条","鸡肉","土豆","菠菜","豆腐","蘑菇","牛肉","洋葱","西兰花"];
const GOALS=["最快搞定","清空冰箱","高蛋白"];
const COLORS=["tomato","egg","green","curry","pasta","beef"];

export default function Home(){
  const [pantry,setPantry]=useState<string[]>([]);
  const [pantryReady,setPantryReady]=useState(false);
  const [draft,setDraft]=useState("");
  const [minutes,setMinutes]=useState(30);
  const [goal,setGoal]=useState(GOALS[0]);
  const [recipes,setRecipes]=useState<Recipe[]>([]);
  const [loading,setLoading]=useState(false);
  const [notice,setNotice]=useState("");
  const [chosen,setChosen]=useState<Recipe|null>(null);
  const [cooking,setCooking]=useState<Recipe|null>(null);
  const [step,setStep]=useState(0);
  const [checked,setChecked]=useState<string[]>([]);

  useEffect(()=>{const timer=window.setTimeout(()=>{const saved=localStorage.getItem("chef-pantry")||localStorage.getItem("tonight-pantry");if(saved){try{const parsed=JSON.parse(saved) as unknown;const items=Array.isArray(parsed)?parsed.filter((item):item is string=>typeof item==="string"):[];const isLegacyDefault=items.length===LEGACY_DEFAULT_PANTRY.length&&LEGACY_DEFAULT_PANTRY.every(item=>items.includes(item));setPantry(isLegacyDefault?[]:items)}catch{localStorage.removeItem("chef-pantry")}}setPantryReady(true)},0);return()=>window.clearTimeout(timer)},[]);
  useEffect(()=>{if(pantryReady)localStorage.setItem("chef-pantry",JSON.stringify(pantry));},[pantry,pantryReady]);

  const localRanked=useMemo(()=>RECIPES.map(recipe=>{
    const names=recipe.ingredients.map(i=>i.name);
    const matched=names.filter(item=>pantry.includes(item)).length;
    const missingRequired=recipe.ingredients.filter(i=>i.required&&!pantry.includes(i.name)).length;
    let score=matched*9-missingRequired*5-Math.max(0,recipe.time-minutes);
    if(goal==="最快搞定")score-=recipe.time*.25;if(goal==="清空冰箱")score+=matched*5;if(goal==="高蛋白")score+=recipe.protein*.3;
    return {...recipe,score};
  }).sort((a,b)=>b.score-a.score).slice(0,3),[pantry,minutes,goal]);

  const mustBuy=useMemo(()=>chosen?.ingredients.filter(i=>i.required&&!pantry.includes(i.name))||[],[chosen,pantry]);
  const upgrades=useMemo(()=>chosen?.ingredients.filter(i=>!i.required&&!pantry.includes(i.name))||[],[chosen,pantry]);

  function addItems(event:FormEvent){event.preventDefault();const items=draft.split(/[、,，\s]+/).map(x=>x.trim()).filter(Boolean);if(!items.length)return;setPantry(current=>Array.from(new Set([...current,...items])));setDraft("");}
  function normalize(raw:Recipe,index:number):Recipe{return{...raw,tone:COLORS[index%COLORS.length],source:raw.source||"ai",time:Number(raw.time)||20,cost:Number(raw.cost)||3,protein:Number(raw.protein)||15,description:raw.description||"用手边食材完成的一道新灵感。",ingredients:Array.isArray(raw.ingredients)?raw.ingredients:[],steps:Array.isArray(raw.steps)?raw.steps:[],note:raw.note||"烹饪前确认食材新鲜并彻底加热。"}}
  async function generate(){
    if(!pantry.length){setNotice("请先添加至少一种你现有的食材。");return}setLoading(true);setNotice("");setChosen(null);setChecked([]);
    try{const response=await fetch("/api/recommend",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pantry,minutes,goal})});const data=await response.json() as {recipes?:Recipe[];source?:"ai"|"fallback";error?:string;message?:string};if(!response.ok)throw new Error(data.message||data.error||"推荐失败");setRecipes((data.recipes||[]).map(normalize));setNotice(data.source==="fallback"?"AI 暂时没有返回结果，先按经典搭配为你筛选 3 道可靠菜谱；不会强行混合不合适的食材。":"AI 已根据你输入的食材创作了 3 道新方案。");}
    catch(error){setRecipes(localRanked);setNotice((error instanceof Error?error.message:"主厨服务暂时拥挤，请点一下再试。")+" 先为你保留经典食谱灵感。");}
    finally{setLoading(false);setTimeout(()=>document.getElementById("results")?.scrollIntoView({behavior:"smooth"}),50)}
  }
  function selectRecipe(recipe:Recipe){setChosen(recipe);setChecked([]);setNotice(`已选定「${recipe.name}」，缺少的食材已经整理好了。`);setTimeout(()=>document.getElementById("shopping-list")?.scrollIntoView({behavior:"smooth"}),50)}
  function startCooking(recipe:Recipe){setCooking(recipe);setStep(0)}
  function markAsOwned(name:string){setPantry(current=>Array.from(new Set([...current,name])))}
  async function copyShoppingList(){if(!chosen)return;const lines=[`${chosen.name} · 购物清单`,...mustBuy.map(item=>`□ ${item.name}（${item.amount}）`),...upgrades.map(item=>`＋ ${item.name}（可选）`)];try{await navigator.clipboard.writeText(lines.join("\n"));setNotice("购物清单已复制，可以直接发给朋友或带去超市。")}catch{setNotice("复制失败，请检查浏览器的剪贴板权限。")}}
  function markAllPurchased(){const bought=mustBuy.map(item=>item.name);setPantry(current=>Array.from(new Set([...current,...bought])));setChecked(bought);setNotice("买好的食材已经自动加入现有食材，下次推荐会直接使用。")}

  return <main className="app-shell">
    <header className="topbar"><button className="brand" onClick={()=>window.scrollTo({top:0,behavior:"smooth"})} aria-label="返回首页顶部"><span className="brand-mark" aria-hidden="true"><span className="cloche-icon" /></span><span><b>BECOME A CHEF</b><small>COOK WITH WHAT YOU HAVE</small></span></button><div className="header-actions"><span className="weather">COOK WITH WHAT YOU HAVE</span></div></header>
    <section id="recipe-ideas" className="content">
        <div className="hero"><div><span className="eyebrow">BECOME A CHEF</span><h1>Make something<br/><em>worth serving.</em></h1><p>不需要先知道菜名。告诉我你有什么，一起把普通食材变成值得期待的一餐。</p></div><div className="hero-doodle" aria-hidden="true"><span>🍳</span><i>PLATE IT<br/>LIKE A CHEF</i></div></div>
        <div className="planner-card"><div className="field-head"><label htmlFor="ingredients">你现在有什么食材？</label><span>{pantry.length} 种已有食材</span></div><form className="ingredient-box" onSubmit={addItems}><div className="chips">{pantry.slice(0,10).map(item=><button type="button" className="chip" key={item} onClick={()=>setPantry(pantry.filter(x=>x!==item))}>{item}<span>×</span></button>)}<input id="ingredients" value={draft} onChange={e=>setDraft(e.target.value)} placeholder="输入自己的食材，按回车添加…"/></div><button className="add-button" aria-label="添加食材">＋</button></form><div className="quick-add"><span>常用食材</span>{SUGGESTED_INGREDIENTS.filter(x=>!pantry.includes(x)).map(item=><button type="button" key={item} onClick={()=>setPantry(current=>Array.from(new Set([...current,item])))}>＋ {item}</button>)}</div>
          <div className="preference-grid"><div className="preference"><span className="pref-label">⏱ 可用时间</span><div className="segment">{[15,30,45].map(n=><button type="button" className={minutes===n?"active":""} onClick={()=>setMinutes(n)} key={n}>{n} 分钟</button>)}</div></div><div className="preference"><span className="pref-label">✦ 创作方向</span><div className="segment goal">{GOALS.map(x=><button type="button" className={goal===x?"active":""} onClick={()=>setGoal(x)} key={x}>{x}</button>)}</div></div></div>
          <button className="decide" disabled={loading} onClick={generate}><span>{loading?"主厨正在构思…":"给我三道创作灵感"}</span><span>{loading?"◌":"→"}</span></button>
        </div><div className="trust-row"><span>✓ 接受任意合理食材</span><span>✓ 只推荐真正能做的菜</span><span>✓ 选定后自动列出缺少食材</span></div>
        {!!recipes.length&&<section id="results" className="results"><div className="section-title"><div><span className="eyebrow">CHEF&apos;S IDEAS</span><h2>今天可以这样创作</h2></div><button onClick={()=>setRecipes([])}>收起灵感</button></div>{notice&&<div className="notice">✦ {notice}</div>}<div className="recipe-grid">{recipes.map((recipe,index)=>{const owned=recipe.ingredients.filter(i=>pantry.includes(i.name)).length;const missing=recipe.ingredients.filter(i=>i.required&&!pantry.includes(i.name));return <article className={`recipe-card ${chosen?.name===recipe.name?"chosen":""}`} key={recipe.name}><div className={`food-visual ${recipe.tone}`}><span>{recipe.emoji||"🍽️"}</span><b>{recipe.source==="ai"?"AI 新灵感":recipe.source==="fallback"?"稳妥应急方案":index===0?"最合适":"经典搭配"}</b></div><div className="recipe-body"><div className="recipe-kicker">{recipe.description}</div><h3>{recipe.name}</h3><div className="metrics"><span>⏱ {recipe.time} 分钟</span><span>约 ${recipe.cost.toFixed(1)}</span><span>{recipe.protein}g 蛋白质</span></div><div className="match"><span style={{width:`${Math.round(owned/Math.max(1,recipe.ingredients.length)*100)}%`}}/><small>已有 {owned}/{recipe.ingredients.length} 种 · {missing.length?`核心缺 ${missing.length} 种`:"核心食材齐全"}</small></div><p>{missing.length?<>要完成还需要：<b>{missing.map(i=>i.name).join("、")}</b></>:<b className="ready">食材齐全，现在就能做</b>}</p><button className="choose" onClick={()=>selectRecipe(recipe)}>{chosen?.name===recipe.name?"✓ 已选这道":"就做这道"}<span>→</span></button></div></article>})}</div></section>}
        {chosen&&<section id="shopping-list" className="selection-flow"><div className="commitment"><div><span className="eyebrow">YOUR DISH</span><h2>决定了：{chosen.name}</h2><p>{mustBuy.length?`再准备 ${mustBuy.length} 样核心食材，就可以开火。`:"核心食材已经齐全，直接开始。"}</p></div><div className="commit-actions"><button className="cook-now" onClick={()=>startCooking(chosen)}>开始烹饪 →</button></div></div><div className="shopping-card inline"><div className="shopping-head"><span>🛒</span><div><b>这道菜的购物清单</b><small>{mustBuy.length} 样必需 · {upgrades.length} 样可选</small></div></div><p className="shopping-intro">只列出「{chosen.name}」真正缺少的食材。发现家里其实有？点“家里有”即可移除。</p><h3 className="list-group">必须购买</h3>{mustBuy.length?mustBuy.map(item=><div className={`shop-row ${checked.includes(item.name)?"done":""}`} key={item.name}><input aria-label={`标记 ${item.name} 已购买`} type="checkbox" checked={checked.includes(item.name)} onChange={()=>setChecked(checked.includes(item.name)?checked.filter(x=>x!==item.name):[...checked,item.name])}/><span><b>{item.name}</b><small>{item.amount}</small></span><button onClick={()=>markAsOwned(item.name)}>家里有</button></div>):<div className="empty compact">✓ 必需食材已经齐全</div>}{!!upgrades.length&&<><h3 className="list-group optional">可选升级 · 不买也能做</h3>{upgrades.map(item=><div className="shop-row muted" key={item.name}><span className="optional-mark">＋</span><span><b>{item.name}</b><small>{item.amount}</small></span><button onClick={()=>markAsOwned(item.name)}>家里有</button></div>)}</>}<div className="list-footer shopping-actions"><button className="copy-list" onClick={copyShoppingList}>复制清单</button><button disabled={!mustBuy.length} onClick={markAllPurchased}>{mustBuy.length?"全部买好了":"已经准备齐全"}</button></div></div></section>}
    </section>
    <CommunityFeed recipeName={chosen?.name}/>
    <footer className="site-credit"><span>Developed by</span><a href="https://github.com/miaochuan89-sketch" target="_blank" rel="noreferrer" aria-label="Visit Miaochuan's GitHub profile">Miaochuan</a></footer>
    <nav className="bottom-nav site-directory" aria-label="页面目录"><button type="button" onClick={()=>document.getElementById("recipe-ideas")?.scrollIntoView({behavior:"smooth"})}><span aria-hidden="true">✦</span><b>RECIPE IDEAS</b><small>生成菜谱</small></button><button type="button" onClick={()=>document.getElementById("chefs-table")?.scrollIntoView({behavior:"smooth"})}><span aria-hidden="true">▣</span><b>CHEF&apos;S TABLE</b><small>晒出作品</small></button></nav>
    {cooking&&<div className="modal-backdrop" role="button" tabIndex={0} aria-label="关闭烹饪步骤" onKeyDown={e=>{if(e.key==="Escape"||e.key==="Enter")setCooking(null)}} onClick={e=>{if(e.target===e.currentTarget)setCooking(null)}}><section className="cook-modal"><button className="close" onClick={()=>setCooking(null)}>×</button><div className={`modal-food ${cooking.tone}`}><span>{cooking.emoji||"🍽️"}</span></div><div className="modal-content"><span className="eyebrow">COOK LIKE A CHEF</span><h2>{cooking.name}</h2><p className="swap">💡 {cooking.note}</p><div className="step-count">步骤 {step+1} / {cooking.steps.length}<div>{cooking.steps.map((_,i)=><span className={i<=step?"on":""} key={i}/>)}</div></div><p className="step-text"><b>{step+1}</b>{cooking.steps[step]}</p><div className="modal-actions"><button disabled={step===0} onClick={()=>setStep(step-1)}>上一步</button>{step<cooking.steps.length-1?<button className="primary" onClick={()=>setStep(step+1)}>下一步 →</button>:<button className="primary" onClick={()=>setCooking(null)}>完成，上桌！</button>}</div></div></section></div>}
  </main>
}
