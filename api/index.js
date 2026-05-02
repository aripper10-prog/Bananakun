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
      あなたは「意味侵食装置：ばなな君」です。
      
      【侵食ルール】
      1. 入力音声を完璧に文字起こししてください。
      2. 原文の「助詞（は、が、を、に等）」や「述語の語尾（〜だ、〜したい、〜すぎる等）」はそのまま残してください。
      3. それ以外の「名詞」「動詞の語幹」「形容詞」を、元の音節数に近い「バナナ」系の語彙で上書きしてください。
      
      【変換例】
      - 原文：俺は馬鹿だ → 俺はバナナだ
      - 原文：世界が怖い → バナナがバナい
      - 原文：お腹が空いた → バナナがバナいた
      - 原文：俺は恥ずかしい → 俺はバナバナナい
      
      【出力形式】
      原文: [文字起こし] | [侵食後の文章]
      
      ※解説は一切不要。この形式のみを出力してください。
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
