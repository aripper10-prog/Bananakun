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

  const prompt = "音声を解析し、そのリズムとイントネーションを維持したまま、全ての言葉を『バ』『ナ』『ナ』だけのバナナ語に置換して。カタカナのみで。";

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
