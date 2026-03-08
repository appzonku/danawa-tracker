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
    console.log("📱 스마트폰 위장: 모바일 다나와 크롤링 시작...");
    try {
        // 1. 타겟을 PC 다나와에서 '모바일 다나와' 주소로 변경
        const url = "https://m.danawa.com/product/product.html?code=18382725";
        
        // 2. 완벽한 안드로이드 스마트폰(갤럭시) 접속으로 위장
        const { data } = await axios.get(url, {
            headers: { 
                "User-Agent": "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
                "Referer": "https://m.danawa.com/"
            }
        });
        
        const $ = cheerio.load(data);
        
        // 3. 모바일 페이지 구조에 맞는 다양한 가격 태그 찌르기
        let priceText = $(".price_c").first().text() || 
                        $(".price_sec .price").first().text() || 
                        $(".lowest_price").first().text() ||
                        $(".lwst_prc").first().text() ||
                        $(".product__price .num").first().text();

        const price = parseInt(priceText.replace(/[^0-9]/g, ""), 10);

        if (price) {
            // 한국 시간 맞추기
            const now = new Date();
            const kst = new Date(now.getTime() + (9 * 60 * 60 * 1000));
            const today = kst.toISOString().split("T")[0];

            // 파이어베이스 DB에 저장
            await db.collection("ram_prices").doc(today).set({
                time: today,
                value: price,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`✅ [${today}] 모바일 우회 성공! 가격 저장 완료: ${price}원`);
        } else {
            console.log("❌ 가격을 찾을 수 없습니다. (모바일도 막혔거나 구조가 다름)");
            console.log("가져온 페이지 일부 확인:", data.substring(0, 500));
        }
    } catch (error) {
        console.error("❌ 크롤링 에러 발생:", error.message);
    }
}

scrapeAndSave();
