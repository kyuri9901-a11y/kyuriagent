const express = require("express");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

// ── 프록시: Google Gemini API 호출 ──
app.post("/api/chat", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY 환경변수가 설정되지 않았습니다." });
  }

  // Google Gen AI SDK 초기화
  const ai = new GoogleGenAI({ apiKey: apiKey });

  try {
    const { messages, system } = req.body;
    
    // 프론트엔드의 대화 이력(history)을 Gemini 포맷으로 정규화
    const contents = messages.map(msg => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    }));

    // Gemini 2.5 Flash 모델 호출 및 실시간 구글 검색 활성화
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        systemInstruction: system, // KICPA 페르소나 시스템 프롬프트 주입
        maxOutputTokens: 8000,
        // DART 및 재무 데이터 실시간 수집을 위한 구글 검색 툴 추가
        tools: [{ googleSearch: {} }] 
      }
    });

    // 기존 프론트엔드 코드(index.html)가 안전하게 읽을 수 있도록 Anthropic 규격 형태로 응답 가공
    res.json({
      content: [
        {
          type: "text",
          text: response.text
        }
      ]
    });

  } catch (err) {
    console.error("Gemini API Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 모든 라우팅은 public/index.html로 향하게 처리
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`서버 실행 중: http://localhost:${PORT}`));