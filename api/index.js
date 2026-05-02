import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);

  // リストにある正確なモデル名を使用
  const model = genAI.getGenerativeModel({ 
    model: "gemini-3.1-flash-lite-preview" 
  });

  try {
    const chunks = [];
    for await (const chunk of req) { chunks.push(chunk); }
    const audioBuffer = Buffer.concat(chunks);

    const prompt = "あなたは『ばなな君』です。音声のリズムを完璧に守り、全て『バ』『ナ』『ナ』の音節だけで構成されたカタカナ語に変換してください。";

    // ストリーミング生成
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
    console.error("Gemini Error:", error);
    // 404が出る場合のデバッグ用ログ
    res.status(500).send(`Model Error: ${error.message}`);
  }
}
