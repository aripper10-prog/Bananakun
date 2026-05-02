import { GoogleGenerativeAI } from "@google/generative-ai";

// Vercelで大きなバイナリ（音声）をストリームで扱うための設定
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
    // ご指定の最新プレビューモデル
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

    // ストリームから音声データをバイナリとして読み込む
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);
    const base64Audio = audioBuffer.toString('base64');

    // リズムと音節数を完全同期させるための専用プロンプト
    const prompt = `
      【絶対命令：音声同期モード】
      あなたは、入力された音声の「音節（モーラ数）」を1つ残らず「バ」または「ナ」に置換する装置です。
      
      手順：
      1. 入力音声の音節数（モーラ数）を正確にカウントしてください。
      2. 「お・れ・は・ば・か・だ（7音節）」であれば、必ず7音節の「バナナ」の組み合わせを生成してください。
      3. 音声のイントネーション（ピッチの上下）を、カタカナの表記で再現してください。
         - 高い音、強調：カタカナ（例：バッ！！）
         - 低い音、通常：カタカナ（例：バナナ）
         - 伸びる音：長音符（ー）
         - 詰まる音：促音（ッ）
      
      出力ルール：
      - カタカナの「バ」「ナ」および「ー」「ッ」「！」「？」のみ使用可能。
      - 漢字、ひらがな、アルファベット、および解説は一切禁止。
      - 例：「お・れ・は・ば・か・だ」→「バ・ナ・ナ・バ・ナ・ナ・バ！」
      - 例：「ダメだ……」→「バ・ナ・ナ……」
      
      あなたの知能をすべて「音節の正確な一致」と「イントネーションの転写」に捧げてください。
    `;

    // Gemini ストリーミング生成を開始
    const result = await model.generateContentStream([
      { text: prompt },
      {
        inlineData: {
          mimeType: "audio/webm",
          data: base64Audio
        }
      }
    ]);

    // レスポンスヘッダーの設定（ストリーミング用）
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Connection': 'keep-alive',
    });

    // 生成されたバナナ語をリアルタイムでブラウザへ返却
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
