import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "APIキーが設定されていません" });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // ご指定の最新モデルを指定
    // もしこれでも404が出る場合は、API側が未対応な可能性があるため
    // その際は "gemini-1.5-flash-latest" を検討してください
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);
    const base64Audio = audioBuffer.toString('base64');

    const prompt = `
      あなたは「意味剥奪装置：ばなな君」です。
      送られた音声の内容、イントネーション、感情を完璧に解析してください。
      その上で、元の言葉の意味を完全に消し去り、
      全て「バ」「ナ」「ナ」の3文字のみで構成されたカタカナ語に変換してください。
      
      制約：
      - あなたの返答はカタカナの「バナナ」の組み合わせのみ。
      - 句読点や感嘆符（！、？）は元の感情に合わせて使用して良い。
      - 元の言葉が「おれはダメだ」なら「バナナ、バ、ナナー！」のようにリズムを再現すること。
      - 解説は一切不要。カタカナ以外の文字は出さないでください。
    `;

    const result = await model.generateContentStream([
      { text: prompt },
      {
        inlineData: {
          mimeType: "audio/webm",
          data: base64Audio
        }
      }
    ]);

    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Connection': 'keep-alive',
    });

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        res.write(chunkText);
      }
    }

    res.end();
  } catch (error) {
    console.error("Gemini Stream Error:", error);
    if (!res.writableEnded) {
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      } else {
        res.end();
      }
    }
  }
}
