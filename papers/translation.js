(() => {
  const qs = (s) => document.querySelector(s);
  const paperId = new URLSearchParams(location.search).get("id");
  const panel = qs("#bilingualReader");
  if (!panel || !paperId) return;
  const original = qs("#sourceText"), translated = qs("#translatedText"), status = qs("#translationStatus");
  const pageInput = qs("#translationPage"), prev = qs("#translationPrev"), next = qs("#translationNext");
  const pageBtn = qs("#translatePage"), selectionBtn = qs("#translateSelection");
  let pdf = null, pageNo = 1, totalPages = 0, client = null, user = null, busy = false;
  let currentSource = "", currentUrl = "";
  const title = document.title.replace("｜PDF 阅读器","") || paperId;
  const setStatus = (s) => { status.textContent = s; };
  const setBusy = (v) => { busy = v; [pageBtn, selectionBtn, prev, next].forEach(b => b.disabled = v); };
  const sha256 = async (s) => {
    const bytes = new TextEncoder().encode(s);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2,"0")).join("");
  };
  function cleanText(items) {
    let out = "", lastY = null;
    for (const item of items) {
      if (!item.str) continue;
      const y = item.transform ? Math.round(item.transform[5]) : null;
      if (lastY !== null && y !== null && Math.abs(y-lastY) > 3) out += "\n";
      out += item.str;
      if (item.hasEOL) out += "\n";
      else out += " ";
      lastY = y;
    }
    return out.replace(/[ \t]+\n/g,"\n").replace(/\n{3,}/g,"\n\n").trim();
  }
  async function initClient() {
    try {
      const c = JSON.parse(localStorage.getItem("maritimeSupabaseConfigV1") || "{}");
      if (!c.url || !c.key || !window.supabase) return;
      client = window.supabase.createClient(c.url,c.key);
      const r = await client.auth.getSession();
      user = r.data.session?.user || null;
    } catch (_) { client = null; user = null; }
  }
  async function cached(key) {
    if (!client || !user) return null;
    const r = await client.from("paper_translation_cache").select("translation").eq("paper_id",paperId).eq("user_id",user.id).eq("cache_key",key).maybeSingle();
    return r.data?.translation || null;
  }
  async function saveCache(key, source, translation, page) {
    if (!client || !user) return;
    const r = await client.from("paper_translation_cache").upsert({
      user_id:user.id,paper_id:paperId,cache_key:key,page_number:page,
      source_text:source,translation,model:"deepseek-flash",updated_at:new Date().toISOString()
    },{onConflict:"user_id,paper_id,cache_key"});
    if (r.error) console.warn("Translation cache write failed",r.error.message);
  }
  async function translate(source, mode, page) {
    if (!user || !client) throw new Error("请先到“复现进度与云端同步”页面登录 Supabase 账号。");
    const key = await sha256(mode + "\n" + source);
    const hit = await cached(key);
    if (hit) return {translation:hit,cached:true};
    const {data,error} = await client.functions.invoke("translate",{body:{text:source,mode,paperTitle:title}});
    if (error) throw new Error(error.message || "翻译请求失败");
    if (data?.error) throw new Error(data.error);
    if (!data?.translation) throw new Error("翻译服务没有返回译文。");
    await saveCache(key,source,data.translation,page);
    return {translation:data.translation,cached:false};
  }
  async function loadPage(n) {
    if (!pdf || busy) return;
    pageNo = Math.max(1,Math.min(totalPages,n));
    pageInput.value = pageNo;
    setBusy(true); setStatus("正在提取第 "+pageNo+" 页英文文本……");
    translated.textContent = "点击“翻译本页”生成中文译文。";
    try {
      const page = await pdf.getPage(pageNo);
      const content = await page.getTextContent();
      currentSource = cleanText(content.items);
      original.textContent = currentSource || "本页没有提取到可选中的文本，可能是扫描图片 PDF。";
      setStatus("第 "+pageNo+" / "+totalPages+" 页已加载。可选中左侧英文段落即时翻译。");
    } catch (e) {
      setStatus("页面读取失败："+e.message);
    } finally { setBusy(false); }
  }
  async function translatePage() {
    if (!currentSource) return setStatus("当前页没有可翻译文本。");
    setBusy(true); setStatus("正在调用 DeepSeek 翻译第 "+pageNo+" 页……");
    try {
      const r = await translate(currentSource,"page",pageNo);
      translated.textContent = r.translation;
      setStatus(r.cached ? "已从个人缓存读取第 "+pageNo+" 页译文。" : "第 "+pageNo+" 页翻译完成，已保存到个人缓存。");
    } catch(e) { setStatus(e.message); }
    finally { setBusy(false); }
  }
  async function translateSelection() {
    const selection = window.getSelection()?.toString().trim();
    if (!selection) return setStatus("请先在左侧英文原文中拖动选中一段文字。");
    setBusy(true); setStatus("正在翻译选中段落……");
    try {
      const r = await translate(selection,"selection",pageNo);
      const block = document.createElement("div");
      block.className = "selectionBox";
      const source = document.createElement("div"); source.textContent = selection;
      const result = document.createElement("div"); result.className = "translation"; result.textContent = r.translation;
      const label = document.createElement("div"); label.className = "hint"; label.textContent = "选中段落译文"+(r.cached?" · 缓存":"");
      block.append(label,source,result);
      translated.prepend(block);
      setStatus(r.cached ? "已从缓存读取选中段落译文。" : "选中段落翻译完成。");
    } catch(e) { setStatus(e.message); }
    finally { setBusy(false); }
  }
  async function loadPdf(url) {
    if (!url || url === currentUrl || !window.pdfjsLib) return;
    currentUrl = url;
    try {
      setStatus("正在加载 PDF 文本层……");
      const task = window.pdfjsLib.getDocument({url,withCredentials:false});
      pdf = await task.promise; totalPages = pdf.numPages;
      pageInput.max = totalPages; qs("#translationTotal").textContent = "/ " + totalPages; panel.style.display = "block";
      await loadPage(1);
    } catch(e) {
      pdf = null; panel.style.display = "block";
      setStatus("无法读取此 PDF 的文本层（可能是跨域限制或扫描件）。请尝试下载 PDF 后重新上传到个人 PDF 私有资料库。原 PDF 阅读入口仍可使用。");
    }
  }
  prev.addEventListener("click",()=>loadPage(pageNo-1));
  next.addEventListener("click",()=>loadPage(pageNo+1));
  pageInput.addEventListener("change",()=>loadPage(Number(pageInput.value)||1));
  pageBtn.addEventListener("click",translatePage);
  selectionBtn.addEventListener("click",translateSelection);
  initClient().then(()=>{
    const iframe = qs("#frame");
    const initial = iframe?.src;
    if (initial && initial !== "about:blank") loadPdf(initial);
    if (iframe) {
      const observer = new MutationObserver(()=>{ if(iframe.src && iframe.src !== "about:blank") loadPdf(iframe.src); });
      observer.observe(iframe,{attributes:true,attributeFilter:["src"]});
      if (iframe.src && iframe.src !== "about:blank") loadPdf(iframe.src);
    }
  });
})();