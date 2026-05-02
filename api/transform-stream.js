import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  api: { bodyParser: false }, // ストリームを扱うため、Vercelの標準BodyParserをオフにする
};

export default async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // または 3.1-flash-lite

  // リクエストボディ（音声）をBufferに変換
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const audioBuffer = Buffer.concat(chunks);

    const prompt = `
      あなたは「思考言語無効化装置：ばなな君」です。
      入力音声を解析し、以下の【低度侵食・文脈維持アルゴリズム】に従って変換してください。

      【低度侵食アルゴリズム】
      1. 「主体（一人称）」の完全保持：
         - 「俺」「僕」「私」「自分」などの一人称、および「は」「が」「を」などの助詞は【絶対に】変えないでください。
      
      2. 「核（名詞・動詞・形容詞）」のバナナ置換：
         - 悩みや否定の核となる単語を、基本的には「バナナ」という名詞で置換してください。
         - 例：「俺はダメだ」→「俺はバナナだ」
         - 例：「世界が怖い」→「バナナがバナナ」
      
      3. 「音節数（拍）」の強制同期：
         - 原文の音節数（モーラ数）を維持することを最優先してください。
         - 置換対象の文字数が「バナナ（3音）」で収まらない場合のみ、以下の活用形を許可します。
           - 2音：バナ、バン
           - 3音：バナナ
           - 4音以上：バナバナ、バナバナな
           - 形容詞・動詞の語尾が必要な場合のみ：バナい、バナる、バナいた

      【変換例】
      - 原文：俺はダメな人間だ → 俺はバナナなバナナだ
      - 原文：世界が怖い → バナナがバナナ（※リズム重視なら「バナナがバナい」）
      - 原文：死にたい → バナりたい
      - 原文：消えてしまいたい → バナてしまいたい
      - 原文：僕は恥ずかしい → 僕はバナバナナい

      【出力形式】
      原文: [文字起こし内容] | [侵食後の文章]
      
      ※解説は不要。この形式のみを出力してください。
    `;

  try {
    const result = await model.generateContentStream([
      prompt,
      { inlineData: { mimeType: "audio/webm", data: audioBuffer.toString('base64') } }
    ]);

    // レスポンスをストリーミングで返却
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    for await (const chunk of result.stream) {
        const text = chunk.text();
        res.write(text); // 変換された「バ」や「ナ」を順次送る
    }
    res.end();
  } catch (error) {
    res.status(500).send("Stream Error");
  }
}
