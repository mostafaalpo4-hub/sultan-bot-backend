const express = require('express');
const admin = require('firebase-admin');
const axios = require('axios');

const app = express();
app.use(express.json());

// تشغيل الفايربيس لو مش شغال تلقائياً
if (!admin.apps.length) {
    admin.initializeApp({
        databaseURL: "https://bot-trading-175e2-default-rtdb.europe-west1.firebasedatabase.app"
    });
}
const db = admin.firestore();

// مسار استقبال التحديثات من تيلجرام (Webhook)
app.post('/webhook', async (req, res) => {
    const { token } = req.query;
    const updates = req.body;

    // تأكيد استقبال الطلب حتى لو مفيش رسالة عشان تيلجرام ما يعلقش
    if (!token || !updates.message) {
        return res.status(200).send('OK');
    }

    const chatId = updates.message.chat.id;
    const text = updates.message.text;

    try {
        // جلب إعدادات البوت من الفايربيس بناءً على التوكن
        const snapshot = await db.collection('bots').where('token', '==', token).get();

        if (snapshot.empty) {
            return res.status(200).send('OK');
        }

        let botData = {};
        snapshot.forEach(doc => { botData = doc.data(); });

        // لو المستخدم بعت /start
        if (text === '/start') {
            let replyText = "مرحباً بك في البوت المطور!";
            let replyMarkup = {};

            if (botData.type === 'buttons') {
                replyText = botData.welcomeMsg || "أهلاً بك!";
                replyMarkup = {
                    inline_keyboard: [[
                        { text: botData.btn1Name, url: botData.btn1Link }
                    ]]
                };
            } else if (botData.type === 'join') {
                replyText = botData.joinWelcomeMsg || "أهلاً بك في بوت الموافقة التلقائية!";
            } else if (botData.type === 'account') {
                replyText = `${botData.profileBio}\n\n💰 سعر الخدمة: ${botData.servicePrice}$`;
            } else if (botData.type === 'shop') {
                replyText = `🏪 متجرنا الرقمي:\n📦 السلعة: ${botData.prodName}\n💵 السعر: ${botData.prodPrice}$`;
            }

            // إرسال الرد للتيلجرام
            await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
                chat_id: chatId,
                text: replyText,
                reply_markup: replyMarkup
            });
        }
    } catch (error) {
        console.error("Error in webhook processing:", error);
    }

    return res.status(200).send('OK');
});

// مسار رئيسي للتأكد أن السيرفر يعمل
app.get('/', (req, res) => {
    res.send('Sultan Backend is Running Successfully on Vercel!');
});

module.exports = app;
