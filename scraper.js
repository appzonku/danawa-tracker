const puppeteer = require('puppeteer');
const admin = require('firebase-admin');

// 파이어베이스 출입증
const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function scrapeAndSave() {
    console.log("🤖 궁극기 발동: 가상 크롬 브라우저(Puppeteer) 띄우는 중...");
    let browser;
    try {
        // 눈에 안 보이는 진짜 크롬 브라우저 실행 (깃허브 서버용 세팅)
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // 완벽한 사람으로 위장 (최신 크롬 브라우저 User-Agent)
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        console.log("🌐 다나와 접속 중...");
        const url = "https://prod.danawa.com/info/?pcode=18382725";
        
        // 다나와 접속 후, 자바스크립트가 가격을 다 불러올 때까지 대기
        await page.goto(url, { waitUntil: 'networkidle2' }); 

        // 가격 태그가 화면에 뜰 때까지 최대 5초간 사람처럼 기다려줌
        await page.waitForSelector('.lwst_prc .prc_c, .lowest_price .prc_c', { timeout: 5000 });

        // 화면에서 가격 글자만 쏙 빼오기
        const priceText = await page.evaluate(() => {
            const el = document.querySelector('.lwst_prc .prc_c, .lowest_price .prc_c');
            return el ? el.innerText : null;
        });

        if (priceText) {
            const price = parseInt(priceText.replace(/[^0-9]/g, ""), 10);
            
            // 한국 시간 세팅
            const now = new Date();
            const kst = new Date(now.getTime() + (9 * 60 * 60 * 1000));
            const today = kst.toISOString().split("T")[0];

            // DB에 저장
            await db.collection("ram_prices").doc(today).set({
                time: today,
                value: price,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`✅ [${today}] 방패 파괴 성공! 가격 저장 완료: ${price}원`);
        } else {
            console.log("❌ 화면에서 가격을 찾지 못했습니다. 구조가 바뀌었을 수 있습니다.");
        }

    } catch (error) {
        console.error("❌ 크롤링 에러 발생:", error.message);
    } finally {
        // 작업 끝나면 브라우저 닫기
        if (browser) await browser.close();
        console.log("작업 종료.");
    }
}

scrapeAndSave();
