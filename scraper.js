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
    console.log("🚀 다나와 크롤링 시작...");
    try {
        const url = "https://prod.danawa.com/info/?pcode=18382725";
        
        // 봇 차단을 뚫기 위해 완벽하게 사람(크롬 브라우저)처럼 위장
        const { data } = await axios.get(url, {
            headers: { 
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
                "Referer": "https://www.danawa.com/"
            }
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
            console.log(`✅ [${today}] 다나와 가격 파이어베이스 저장 성공: ${price}원`);
        } else {
            // 가격을 못 찾았을 때 조용히 넘어가지 않고 에러 뿜기
            console.log("❌ 가격을 찾을 수 없습니다. 다나와가 봇을 차단했거나 페이지가 다릅니다.");
            console.log("가져온 페이지 일부 확인:", data.substring(0, 300));
        }
    } catch (error) {
        console.error("❌ 크롤링 에러 발생:", error.message);
    }
}

scrapeAndSave();
