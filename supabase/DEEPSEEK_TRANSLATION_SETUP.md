# DeepSeek 双语 PDF 阅读器部署步骤

## 已提交到 GitHub 的内容
- `papers/pdf.html`：增加双栏翻译阅读区域。
- `papers/translation.js` / `papers/translation.css`：PDF 文本提取、同步页码、整页翻译、选中段落翻译和个人缓存。
- `supabase/functions/translate/index.ts`：服务端 DeepSeek 调用，不向浏览器暴露 DeepSeek API Key。
- `supabase/schema.sql`：已追加个人翻译缓存表和 RLS 权限策略。

## 还需要在 Supabase 完成一次配置
1. 打开 Supabase 项目的 SQL Editor，执行仓库中的 `supabase/translation_cache.sql`。
2. 在 DeepSeek 开放平台创建 API Key。
3. 在项目根目录安装并登录 Supabase CLI，然后执行：

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set DEEPSEEK_API_KEY=YOUR_DEEPSEEK_API_KEY
supabase functions deploy translate
```

不要把 DeepSeek API Key 写入 GitHub 页面、HTML、JavaScript 或提交到仓库。
Supabase Edge Function 默认需要登录用户 JWT；网页会使用当前 Supabase 登录会话调用。

## 使用方式
1. 打开论文 PDF 阅读页面，并确保已在“复现进度与云端同步”登录 Supabase。
2. 双栏阅读器会尝试读取当前 PDF 文本。点击“翻译本页”翻译整页。
3. 在左侧英文文本中拖选一段，再点“翻译选中段落”。
4. 已翻译的页和段落会按当前用户私有缓存。

## 当前限制
- 这是文本层翻译，不是对 PDF 页面图像做 OCR。扫描版 PDF 没有文本层时需要先 OCR。
- 某些出版商 PDF 会限制浏览器跨域读取；可将有权使用的 PDF 上传到个人 Supabase 私有 PDF 库后再试。
- 译文缓存按用户隔离，不同账号互不可见。
