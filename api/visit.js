const { cmd, ready } = require("./_redis");

// POST = a new visitor (adds 1), GET = just read the number.
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!ready) return res.status(200).json({ count: null });
  try {
    const n = await cmd(req.method === "POST" ? ["INCR", "att:visitors"] : ["GET", "att:visitors"]);
    res.status(200).json({ count: Number(n) || 0 });
  } catch (e) {
    res.status(200).json({ count: null });
  }
};
