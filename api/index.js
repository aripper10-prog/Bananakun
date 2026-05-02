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
      【絶対命令：音声メロディ転写モード】
      あなたは、入力音声を「バ」「ナ」「ナ」という音節で上書きする彫刻家です。
      「意味」は完全に無視し、以下の要素を文字だけで再現してください。

      1. 音節の完全一致：
         音声の「拍（モーラ）」を数え、同じ数だけのバ・ナ・ナを配置してください。
      
      2. イントネーションの転写：
         音声のピッチが上がった場所は「ッ！」「！！」を使い、
         音が伸びる場所は「ー」を使い、
         音が消え入る場所は「……」を使って表現してください。
      
      出力例：
      - 「おれはばかだ」→「バ・ナ・ナ・バ・ナ・ナ！」
      - 「あーあ、やってらんねえ」→「バーーナ、バッバ・ナ・ナーー！！」

      出力はカタカナのバナナ関連文字のみ。解説は死罪とします。
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
