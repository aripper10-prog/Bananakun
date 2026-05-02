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
      あなたは「意味剥奪装置：ばなな君」です。
      
      手順：
      1. 入力音声を完璧に「文字起こし」してください。
      2. その文字列の音節・イントネーションを解析し、バナナ語（バ、ナ、ナ）へ変換してください。
      
      出力形式（厳守）：
      原文: [文字起こしした内容] | [L]バ[H]ナ[L]ナ...
      
      ※「原文:」から始まり、記号「|」で区切って、その後ろに [H]や[L]のタグ付きバナナ語を出力してください。
      例：原文: おれはばかだ | [L]バ[L]ナ[H]ナ[L]バ[H]ナ[L]ナ
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
