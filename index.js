import express from "express";
import fetch from "node-fetch";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3000;
const CACHE_FILE = "./cache.json";

let CACHE = {
  time: 0,
  data: null
};

// load cache khi restart
if (fs.existsSync(CACHE_FILE)) {
  CACHE = JSON.parse(fs.readFileSync(CACHE_FILE));
}

// fetch Luck (có thể fail)
async function fetchLuck() {
  const res = await fetch(
    "https://game-api.luckywinoo.com/app/getTaixiuMd5TableListInfo",
    {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "user-agent":
          "Mozilla/5.0 (Linux; Android 10; Chrome/143.0.0.0 Mobile)"
      },
      body: ""
    }
  );

  if (!res.ok) throw new Error("Luck blocked");
  return await res.json();
}

app.get("/api/luck/taixiu", async (req, res) => {
  const now = Date.now();

  // cache 10s
  if (CACHE.data && now - CACHE.time < 10000) {
    return res.json({
      source: "cache",
      ...CACHE.data
    });
  }

  try {
    const data = await fetchLuck();

    CACHE = {
      time: now,
      data
    };

    fs.writeFileSync(CACHE_FILE, JSON.stringify(CACHE));

    res.json({
      source: "live",
      ...data
    });
  } catch (err) {
    if (CACHE.data) {
      res.json({
        source: "cache-fallback",
        ...CACHE.data
      });
    } else {
      res.status(503).json({
        error: "Luck API bị chặn",
        message: "Chưa có cache"
      });
    }
  }
});

app.listen(PORT, () =>
  console.log("✅ API trung gian chạy port", PORT)
);
