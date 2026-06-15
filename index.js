const express = require("express");
const admin = require("firebase-admin");
const axios = require("axios");

const app = express();
app.use(express.json());

// ربط السيرفر بمشروع الفايربيس الجديد بتاعك تلقائياً
admin.initializeApp({
    projectId: "bot-trading-175e2"
});
const db = admin.firestore();

// نقطة استقبال الرسائل من تيلجرام
app.post("/webhook", async (req, res) => {
    try {
        const update = req.body;
        const botToken = req.query.token;

        if (!botToken || !update.message || !update.message.text) {
            return res.status(200).send("Ignore");
        }

        const chatId = update.message.chat.id;
        const messageText = update.message.text.trim();

        // جلب إعدادات البوت من Firestore
        const snapshot = await db.collection("bots").where("token", "==", botToken).limit(1).get();

        if (snapshot.empty) {
            return res.status(200).send("Bot not found");
        }

        const botData = snapshot.docs[0].data();
        const botType = botData.type;
        const isUserVip = botData.isVip || false;
        const watermark = isUserVip ? "" : "\n\n⚡ Powered by Sultan Dev Bot";

        // 1. بوت الأزرار التفاعلي
        if (botType === "buttons") {
            if (messageText === "/start") {
                await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    chat_id: chatId,
                    text: botData.welcomeMsg + watermark,
                    reply_markup: {
                        inline_keyboard: [[{ text: botData.btn1Name, url: botData.btn1Link }]]
                    }
                });
            }
        }
        
        // 2. بوت حماية المجموعات
        else if (botType === "security") {
            if (/(https?:\/\/[^\s]+)/g.test(messageText)) {
                await axios.post(`https://api.telegram.org/bot${botToken}/deleteMessage`, { chat_id: chatId, message_id: update.message.message_id });
                if (botData.securityAction === "kick") {
                    await axios.post(`https://api.telegram.org/bot${botToken}/banChatMember`, { chat_id: chatId, user_id: update.message.from.id });
                }
            }
        }

        // 3. بوت الموافقة التلقائية
        else if (botType === "join") {
            if (messageText === "/start") {
                await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, { chat_id: chatId, text: botData.joinWelcomeMsg + watermark });
            }
        }

        // 4. بوت إدارة الخدمات
        else if (botType === "account") {
            if (messageText === "/start") {
                await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    chat_id: chatId,
                    text: `ℹ️ **الملف الشخصي والخدمات:**\n\n${botData.profileBio}\n\n💰 سعر الخدمة: ${botData.servicePrice || 0}$` + watermark
                });
            }
        }

        // 5. بوت المتجر الرقمي
        else if (botType === "shop") {
            if (messageText === "/start") {
                await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    chat_id: chatId,
                    text: `🛒 **مرحباً في متجرنا:**\n\n📦 السلعة: ${botData.prodName}\n💵 السعر: ${botData.prodPrice}$` + watermark
                });
            }
        }

        return res.status(200).send("OK");
    } catch (err) {
        console.error(err);
        return res.status(200).send("Error");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sultan Server running on port ${PORT}`));
