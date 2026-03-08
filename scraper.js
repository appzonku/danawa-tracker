const axios = require('axios');
const cheerio = require('cheerio');
const admin = require('firebase-admin');

// 깃허브에 숨겨둔 파이어베이스 출입증
const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

async function scrapeAndSave() {
    console.log("🚀 작전 변경: 다나와 버리고 컴퓨존 찌르기!");
    try {
        // 삼성 DDR5 16GB 5600 컴퓨존 상품 링크 (상품번호 997836)
        const url = "https://www.compuzone.co.kr/product/product_detail.htm?ProductNo=997836";
        
        const response = await axios.get(url, {
            headers: { 
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
                "Accept-Language": "ko-KR,ko;q=0.9"
            }
        });
        
        const $ = cheerio.load(response.data);
        
        // 1순위: 컴퓨존 가격 태그 아이디로 찾기
        let priceText = $("#ProductSalePrice").text();
        
        // 2순위: 못 찾으면 meta 태그에서 찾기
        if (!priceText) {
            priceText = $("meta[property='product:price:amount']").attr("content");
        }

        const price = parseInt((priceText || "").replace(/[^0-9]/g, ""), 10);

        // 정상적으로 1만 원 이상 가격이 잡혔을 경우만 저장
        if (price && price > 10000) { 
            const kst = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
            const today = kst.toISOString().split("T")[0];

            await db.collection("ram_prices").doc(today).set({
                time: today,
                value: price,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`✅ [${today}] 컴퓨존 뚫었다! 가격 저장 완료: ${price}원`);
        } else {
            console.log("❌ 가격을 찾을 수 없습니다. 컴퓨존 구조 확인 필요.");
        }
    } catch (error) {
        console.error("❌ 크롤링 에러 발생:", error.message);
    }
}

scrapeAndSave();
