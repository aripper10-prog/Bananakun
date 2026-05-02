import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "APIキー未設定" });

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

        const prompt = `
      【超精密・音声模写モード】
      あなたは入力音声の波形を「バナナ」でトレースする写経師です。
      
      手順：
      1. 音声の1音節（1モーラ）を1つの「バ」または「ナ」に変換。
      2. イントネーション（高さ）を以下の記号でタグ付けしてください。
         - 高い音/強調：[H]
         - 低い音/通常：[L]
         - 伸ばす音：ー
      
      出力形式例：
      「おれは（低低高）」→ [L]バ[L]ナ[H]ナ
      「ばかだ（低高低）」→ [L]バ[H]ナ[L]ナ
      
      ※解説禁止。記号とカタカナのみ。音節数を絶対にズラさないこと。
    `;

    const result = await model.generateContentStream([
      { text: prompt },
      {
        inlineData: {
          mimeType: "audio/webm",
          data: audioBuffer.toString('base64')
        }
      }
    ]);

    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    });

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
