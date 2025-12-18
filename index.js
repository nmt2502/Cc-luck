import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import fs from "fs";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

/**
 * 🔴 LINK NGUỒN
 * 👉 thay khi có link mới
 */
const SOURCE_APIS = [
  "https://1.bot/GetNewLottery/LT_TaixiuMD5"
];

const CACHE_FILE = "./cache.json";

let lastExpect = null;
let lastData = null;
let pattern = "";

// ===== LOAD CACHE CỨNG =====
if (fs.existsSync(CACHE_FILE)) {
  try {
    const raw = fs.readFileSync(CACHE_FILE, "utf8");
    const saved = JSON.parse(raw);
    lastExpect = saved.lastExpect || null;
    lastData = saved.lastData || null;
    pattern = saved.pattern || "";
    console.log("✅ Đã load cache cứng");
  } catch {
    console.log("⚠️ Cache file lỗi");
  }
}

// ===== TOOL =====
function saveCache() {
  fs.writeFileSync(
    CACHE_FILE,
    JSON.stringify({ lastExpect, lastData, pattern }, null, 2)
  );
}

function getTaiXiu(sum) {
  return sum >= 11 ? "Tài" : "Xỉu";
}

function updatePattern(c) {
  pattern += c;
  if (pattern.length > 20) pattern = pattern.slice(-20);
}

// ===== FETCH NGUỒN =====
async function fetchSource() {
  for (const url of SOURCE_APIS) {
    try {
      const res = await fetch(url, {
        timeout: 5000,
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "application/json"
        }
      });
      const json = await res.json();
      if (json?.state === 1) return json;
    } catch {
      console.log("❌ Nguồn lỗi:", url);
    }
  }
  return null;
}

// ===== POLL =====
async function pollLuck() {
  const json = await fetchSource();
  if (!json) return;

  const data = json.data;
  if (data.Expect === lastExpect) return;

  lastExpect = data.Expect;

  const dice = data.OpenCode.split(",").map(Number);
  const sum = dice.reduce((a, b) => a + b, 0);
  const ket_qua = getTaiXiu(sum);
  const char = ket_qua === "Tài" ? "t" : "x";

  updatePattern(char);

  lastData = {
    id: "luck-cache-api",
    Phien: data.Expect,
    Xuc_xac: dice,
    Tong: sum,
    Ket_qua: ket_qua,
    Pattern: pattern,
    Time: new Date().toISOString()
  };

  saveCache();
  console.log("✔ Phiên mới:", data.Expect);
}

// Poll mỗi 2 giây
setInterval(pollLuck, 2000);

// ===== API =====
app.get("/api/luck/taixiu", (req, res) => {
  if (!lastData) {
    return res.json({
      status: "waiting",
      message: "Chưa có dữ liệu",
      cached: false
    });
  }

  res.json({
    ...lastData,
    cached: true
  });
});

// ===== HEALTH =====
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    lastExpect,
    hasCache: !!lastData
  });
});

app.listen(PORT, () => {
  console.log(`✅ API trung gian + cache cứng chạy port ${PORT}`);
});
