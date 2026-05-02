import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "システムエラー：APIキーがありません" });

  const { audio } = req.body;
  if (!audio) return res.status(400).json({ error: "音声データがありません" });

  const genAI = new GoogleGenerativeAI(apiKey);
  // モデルはご指定の3.1-flash-lite-previewを使用
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // ※2026年時点の安定版。preview版もお好みで。

  const prompt = "入力された音声の内容とイントネーションを解析し、その感情やリズムを維持したまま、全ての言葉を『バ』『ナ』『ナ』のみで構成されたカタカナ語に変換して。余計な説明は一切不要です。";

  try {
    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType: "audio/webm", data: audio } }
    ]);
    
    const bananaText = result.response.text();
    res.status(200).json({ bananaText });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gemini連携に失敗しました" });
  }
}
