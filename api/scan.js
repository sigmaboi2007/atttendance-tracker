const { hit } = require("./_redis");

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const PROMPT = "You read school timetable images. Return ONLY JSON: {\"subjects\":[{\"name\":\"full subject name\"}],\"slots\":[{\"day\":0,\"start\":\"08:00\",\"end\":\"09:00\",\"subject\":\"exact name from subjects\"}]}. day is 0=Monday to 5=Saturday. Times are 24-hour (2 pm = 14:00) and classes run between 08:00 and 17:00. Skip breaks and lunch. If the image has a table mapping short codes to course names, use the full course names. A class spanning several columns is one slot with its true start and end. If several timetables are shown, use only the first one.";

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "POST only." });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: "AI is not set up on this site yet." });

  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  b = b || {};
  if (typeof b.image !== "string" || b.image.length > 3000000 || !/^image\/(jpeg|png|webp)$/.test(b.mime || ""))
    return res.status(400).json({ error: "Please send one smaller JPEG, PNG or WebP image." });

  const ip = String(req.headers["x-forwarded-for"] || "unknown").split(",")[0].trim();
  const day = new Date().toISOString().slice(0, 10);
  if (!(await hit("att:rl:" + ip + ":" + day, +process.env.SCAN_PER_DAY || 3)))
    return res.status(429).json({ error: "You’ve used today’s free scans. Try tomorrow, or fill the timetable by hand." });
  if (!(await hit("att:cap:" + day, +process.env.SCAN_DAILY_CAP || 100)))
    return res.status(429).json({ error: "The site’s daily AI limit is reached. Try tomorrow, or fill the timetable by hand." });

  try {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: b.mime, data: b.image } }] }],
        generationConfig: { temperature: 0, responseMimeType: "application/json" }
      })
    });
    const j = await r.json();
    if (!r.ok) return res.status(502).json({ error: "The AI service is busy or out of quota. Try again later." });
    const parts = (j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [];
    const d = JSON.parse(parts.map(p => p.text || "").join("").replace(/```json|```/g, "").trim());
    res.status(200).json({
      subjects: Array.isArray(d.subjects) ? d.subjects.slice(0, 20) : [],
      slots: Array.isArray(d.slots) ? d.slots.slice(0, 80) : []
    });
  } catch (e) {
    res.status(502).json({ error: "Couldn’t read a timetable from that image." });
  }
};
