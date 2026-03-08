const axios = require('axios');
const cheerio = require('cheerio');
const admin = require('firebase-admin');

// 깃허브에 숨겨둔 파이어베이스 출입증 가져오기
const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function scrapeAndSave() {
    try {
        const url = "https://prod.danawa.com/info/?pcode=18382725";
        const { data } = await axios.get(url, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
        });
        const $ = cheerio.load(data);
        const priceText = $(".lwst_prc .prc_c, .lowest_price .prc_c").first().text().replace(/[^0-9]/g, "");
        const price = parseInt(priceText, 10);

        if (price) {
            // 한국 시간 맞추기
            const now = new Date();
            const kst = new Date(now.getTime() + (9 * 60 * 60 * 1000));
            const today = kst.toISOString().split("T")[0];

            // DB에 저장
            await db.collection("ram_prices").doc(today).set({
                time: today,
                value: price,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`[${today}] 다나와 가격 파이어베이스 저장 성공: ${price}원`);
        }
    } catch (error) {
        console.error("크롤링 실패:", error);
    }
}

scrapeAndSave();
