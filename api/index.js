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
      1. 入力音声を完璧に文字起こしする。
      2. そのリズムと抑揚を100%維持したまま、「バ」「ナ」「ナ」の組み合わせに置換する。
      
      流暢さのルール：
      - 文末や強調したい部分は「ナァ」「バッ」のように小書き文字を混ぜて人間味を出すこと。
      - 抑揚は「カタカナの表記」だけで表現してください（[H][L]タグは廃止）。
      - 例：「おれはばかだ」→「バナナバナナー」
      - 例：「まじで？」→「バナバ？」
      
      出力形式：
      原文: [文字起こし] | [バナナ語のみ]
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
