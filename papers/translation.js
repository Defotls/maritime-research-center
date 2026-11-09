(() => {
  const qs = (s) => document.querySelector(s);
  const paperId = new URLSearchParams(location.search).get("id");
  const panel = qs("#bilingualReader");
  if (!panel || !paperId) return;

  const viewer = qs("#pdfCanvasViewer");
  const pageHost = qs("#pdfPageHost");
  const status = qs("#translationStatus");
  const pageInput = qs("#translationPage");
  const prev = qs("#translationPrev");
  const next = qs("#translationNext");
  const zoomIn = qs("#zoomIn");
  const zoomOut = qs("#zoomOut");
  const zoomLabel = qs("#zoomLabel");
  const popup = qs("#selectionTranslation");
  const selectionSource = qs("#selectionSource");
  const selectionResult = qs("#selectionResult");
  const closePopup = qs("#closeSelectionTranslation");

  let pdf = null;
  let pageNo = 1;
  let totalPages = 0;
  let client = null;
  let user = null;
  let currentUrl = "";
  let zoom = 1;
  let rendering = false;
  let selectionTimer = null;
  let lastSelection = "";
  let requestSequence = 0;

  const title = document.title.replace("｜PDF 阅读器", "") || paperId;
  const setStatus = (message) => { status.textContent = message; };

  async function initClient() {
    try {
      const config = JSON.parse(localStorage.getItem("maritimeSupabaseConfigV1") || "{}");
      if (!config.url || !config.key || !window.supabase) return;
      client = window.supabase.createClient(config.url, config.key);
      const result = await client.auth.getSession();
      user = result.data.session && result.data.session.user ? result.data.session.user : null;
    } catch (_) {
      client = null;
      user = null;
    }
  }

  async function sha256(value) {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map((v) => v.toString(16).padStart(2, "0")).join("");
  }

  async function cached(key) {
    if (!client || !user) return null;
    const result = await client.from("paper_translation_cache")
      .select("translation")
      .eq("paper_id", paperId)
      .eq("user_id", user.id)
      .eq("cache_key", key)
      .maybeSingle();
    return result.data ? result.data.translation : null;
  }

  async function saveCache(key, source, translation) {
    if (!client || !user) return;
    const result = await client.from("paper_translation_cache").upsert({
      user_id: user.id,
      paper_id: paperId,
      cache_key: key,
      page_number: pageNo,
      source_text: source,
      translation: translation,
      model: "deepseek-flash",
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id,paper_id,cache_key" });
    if (result.error) console.warn("Translation cache write failed:", result.error.message);
  }

  async function translate(source) {
    if (!client || !user) {
      throw new Error("请先到“复现进度管理”页面登录科研中心账号。");
    }
    const key = await sha256("selection\n" + source);
    const hit = await cached(key);
    if (hit) return { translation: hit, cached: true };

    const result = await client.functions.invoke("translate", {
      body: { text: source, mode: "selection", paperTitle: title }
    });
    if (result.error) throw new Error(result.error.message || "翻译请求失败");
    if (result.data && result.data.error) throw new Error(result.data.error);
    if (!result.data || !result.data.translation) throw new Error("翻译服务没有返回有效译文。");

    await saveCache(key, source, result.data.translation);
    return { translation: result.data.translation, cached: false };
  }

  function positionPopup() {
    if (!popup.classList.contains("visible")) return;
    if (window.innerWidth <= 760) {
      popup.style.left = "12px";
      popup.style.right = "12px";
      popup.style.top = "auto";
      popup.style.bottom = "12px";
      return;
    }
    popup.style.right = "auto";
    popup.style.bottom = "auto";
    const selection = window.getSelection();
    let rect = null;
    if (selection && selection.rangeCount) rect = selection.getRangeAt(0).getBoundingClientRect();
    const width = Math.min(420, window.innerWidth - 24);
    const left = rect ? Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)) : window.innerWidth - width - 24;
    popup.style.left = left + "px";
    let top = rect ? rect.bottom + 12 : 90;
    const popupHeight = popup.offsetHeight || 220;
    if (top + popupHeight > window.innerHeight - 12) {
      top = rect ? Math.max(12, rect.top - popupHeight - 12) : 90;
    }
    popup.style.top = top + "px";
  }

  function showPopup(source, message) {
    selectionSource.textContent = source;
    selectionResult.textContent = message || "正在翻译……";
    popup.classList.add("visible");
    requestAnimationFrame(positionPopup);
  }

  function hidePopup() {
    requestSequence += 1;
    popup.classList.remove("visible");
  }

  async function translateSelectedText(source) {
    const thisRequest = ++requestSequence;
    showPopup(source, "正在调用 DeepSeek 翻译……");
    setStatus("正在翻译选中的英文内容……");
    if (source.length > 8000) {
      const message = "选中内容过长。单次最多支持 8000 个字符，请分段选择。";
      if (thisRequest === requestSequence) selectionResult.textContent = message;
      setStatus(message);
      return;
    }
    try {
      const result = await translate(source);
      if (thisRequest !== requestSequence) return;
      selectionResult.textContent = result.translation;
      setStatus(result.cached ? "已从个人缓存读取这段译文。" : "选中内容翻译完成，译文已保存到个人缓存。");
      requestAnimationFrame(positionPopup);
    } catch (error) {
      if (thisRequest !== requestSequence) return;
      selectionResult.textContent = error.message || "翻译失败，请稍后重试。";
      setStatus(error.message || "翻译失败，请稍后重试。");
      requestAnimationFrame(positionPopup);
    }
  }

  function scheduleSelectionTranslation() {
    window.clearTimeout(selectionTimer);
    selectionTimer = window.setTimeout(() => {
      const selection = window.getSelection();
      const source = selection ? selection.toString().trim() : "";
      if (!source) return;
      if (source === lastSelection && popup.classList.contains("visible")) return;
      lastSelection = source;
      translateSelectedText(source);
    }, 320);
  }

  function clearPageSelection() {
    const selection = window.getSelection();
    if (selection) selection.removeAllRanges();
    lastSelection = "";
    hidePopup();
  }

  async function renderPage(number) {
    if (!pdf || rendering) return;
    rendering = true;
    pageNo = Math.max(1, Math.min(totalPages, number));
    pageInput.value = String(pageNo);
    clearPageSelection();
    setStatus("正在显示第 " + pageNo + " / " + totalPages + " 页……");
    pageHost.replaceChildren();

    try {
      const page = await pdf.getPage(pageNo);
      const baseViewport = page.getViewport({ scale: 1 });
      const availableWidth = Math.max(280, viewer.clientWidth - 36);
      const fitScale = Math.min(1.5, availableWidth / baseViewport.width);
      const scale = fitScale * zoom;
      const viewport = page.getViewport({ scale: scale });
      const outputScale = window.devicePixelRatio || 1;

      const pageElement = document.createElement("div");
      pageElement.className = "pdfPage";
      pageElement.style.width = viewport.width + "px";
      pageElement.style.height = viewport.height + "px";

      const canvas = document.createElement("canvas");
      canvas.className = "pdfPageCanvas";
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = viewport.width + "px";
      canvas.style.height = viewport.height + "px";

      const textLayer = document.createElement("div");
      textLayer.className = "textLayer";
      textLayer.style.width = viewport.width + "px";
      textLayer.style.height = viewport.height + "px";

      pageElement.append(canvas, textLayer);
      pageHost.append(pageElement);

      const context = canvas.getContext("2d", { alpha: false });
      context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
      const renderTask = page.render({ canvasContext: context, viewport: viewport });
      const textContent = await page.getTextContent();
      await renderTask.promise;

      if (typeof window.pdfjsLib.renderTextLayer !== "function") {
        throw new Error("当前 PDF.js 版本不支持文字选取层，请刷新页面重试。");
      }
      const textTask = window.pdfjsLib.renderTextLayer({
        textContent: textContent,
        container: textLayer,
        viewport: viewport,
        textDivs: []
      });
      await textTask.promise;

      pageInput.max = String(totalPages);
      qs("#translationTotal").textContent = "/ " + totalPages;
      zoomLabel.textContent = Math.round(zoom * 100) + "%";
      setStatus("第 " + pageNo + " / " + totalPages + " 页已加载。直接选中英文内容即可自动翻译。");
    } catch (error) {
      setStatus("页面渲染失败：" + (error.message || "未知错误"));
      throw error;
    } finally {
      rendering = false;
    }
  }

  async function loadPdf(url) {
    if (!url || url === "about:blank" || url === currentUrl || !window.pdfjsLib) return;
    currentUrl = url;
    panel.style.display = "block";
    setStatus("正在加载 PDF 原版页面……");
    try {
      const task = window.pdfjsLib.getDocument({ url: url, withCredentials: false });
      pdf = await task.promise;
      totalPages = pdf.numPages;
      viewer.style.display = "block";
      qs("#frameWrap").classList.add("hidden");
      qs("#noPdf").classList.add("hidden");
      await renderPage(1);
    } catch (error) {
      pdf = null;
      viewer.style.display = "none";
      qs("#frameWrap").classList.remove("hidden");
      setStatus("PDF 原版仍可通过上方阅读器查看，但该文件暂时无法建立可选取文字层（可能是跨域限制或扫描版 PDF）。请下载 PDF 后上传到个人 PDF 私有资料库，再使用自动划词翻译。");
      console.warn("PDF.js load failed:", error);
    }
  }

  prev.addEventListener("click", () => renderPage(pageNo - 1));
  next.addEventListener("click", () => renderPage(pageNo + 1));
  pageInput.addEventListener("change", () => renderPage(Number(pageInput.value) || 1));
  zoomIn.addEventListener("click", () => {
    zoom = Math.min(2, +(zoom + 0.15).toFixed(2));
    renderPage(pageNo);
  });
  zoomOut.addEventListener("click", () => {
    zoom = Math.max(0.65, +(zoom - 0.15).toFixed(2));
    renderPage(pageNo);
  });
  closePopup.addEventListener("click", hidePopup);
  document.addEventListener("selectionchange", scheduleSelectionTranslation);
  document.addEventListener("mouseup", scheduleSelectionTranslation);
  document.addEventListener("keyup", scheduleSelectionTranslation);
  document.addEventListener("touchend", () => window.setTimeout(scheduleSelectionTranslation, 150));
  window.addEventListener("resize", () => {
    if (pdf && !rendering) renderPage(pageNo);
  });

  initClient().then(() => {
    const iframe = qs("#frame");
    if (!iframe) return;
    const tryLoad = () => {
      if (iframe.src && iframe.src !== "about:blank") loadPdf(iframe.src);
    };
    tryLoad();
    const observer = new MutationObserver(tryLoad);
    observer.observe(iframe, { attributes: true, attributeFilter: ["src"] });
  });
})();