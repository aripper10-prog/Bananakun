import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "APIキー未設定" });

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

    const chunks = [];
    for await (const chunk of req) { chunks.push(chunk); }
    const audioBuffer = Buffer.concat(chunks);

        const prompt = `
      あなたは「思考言語無効化装置：ばなな君」です。
      入力音声を解析し、以下の【属性侵食・名詞堅持アルゴリズム】に従って変換してください。

      【属性侵食・名詞堅持アルゴリズム】
      1. 「固有名詞・一般名詞・代名詞」の完全保持：
         - 「俺」「僕」「世界」「仕事」「人間」「あいつ」などの名詞は【絶対に】変えないでください。
         - 助詞（は、が、を、に等）もそのまま維持します。
      
      2. 「状態・評価・感情（動詞・形容詞）」のみをバナナ化：
         - 自分を苦しめている評価、感情、動きの部分だけを「バナナ」に置換してください。
         - 原文の音節数（モーラ数）に合わせるため、適宜「バナ」「バナナ」「バナる」「バナい」を使い分けます。

      【変換例】
      - 原文：俺はダメだ → 俺はバナナだ
      - 原文：世界が怖い → 世界がバナナ（または：世界がバナい）
      - 原文：仕事に行きたくない → 仕事にバナりたくない
      - 原文：人間が嫌いだ → 人間がバナナだ
      - 原文：死にたい → バナりたい
      - 原文：僕は恥ずかしい → 僕はバナバナナい

      【出力形式】
      原文: [文字起こし内容] | [侵食後の文章]
      
      ※解説は不要。この形式のみを出力してください。
    `;


    const result = await model.generateContentStream([
      { text: prompt },
      { inlineData: { mimeType: "audio/webm", data: audioBuffer.toString('base64') } }
    ]);

    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' });
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) res.write(text);
    }
    res.end();
  } catch (error) {
    console.error(error);
    if (!res.writableEnded) res.status(500).send(error.message);
  }
}
