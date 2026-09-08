// backend/src/services/telegram.service.ts

import crypto from 'crypto';
import prisma from './prisma';
import env from '../config/env';

/**
 * تنبيه التاجر عبر تيليجرام.
 *
 * **لماذا تيليجرام لا إشعار المتصفّح وحده:** إشعار المتصفّح يحتاج إذناً
 * يرفضه كثيرون بالعادة، ولا يعمل على iOS إلا إذا ثبّت المستخدم الموقع على
 * شاشته الرئيسية، ورمزه يموت بصمت مع تدوير Firebase — وقد كلّفنا رمزٌ صامت
 * في تطبيق السائق ساعاتٍ من التشخيص.
 *
 * تيليجرام يتجاوز الثلاثة: يربط التاجر حسابه مرّةً بضغطة رابط، فيصله
 * التنبيه والهاتف مقفل، على أي منصّة، بلا إذنٍ ولا رمزٍ ينتهي. ومجّاني.
 *
 * **الربط:** التاجر يفتح `t.me/<bot>?start=<code>`، فيصل البوت `/start
 * <code>` مع `chat_id`. نطابق الرمز فنعرف أي مستخدم يملك تلك المحادثة —
 * بلا أن يكتب التاجر شيئاً ولا أن نطلب منه معرّفه.
 */

const API = 'https://api.telegram.org/bot';

export const isConfigured = (): boolean => Boolean(env.TELEGRAM_BOT_TOKEN);

/** اسم البوت — يُبنى منه رابط الربط الذي يفتحه التاجر */
export const botUsername = (): string => env.TELEGRAM_BOT_USERNAME || '';

interface TelegramResponse {
  ok: boolean;
  description?: string;
  result?: any;
}

const call = async (method: string, payload: unknown): Promise<TelegramResponse | null> => {
  if (!isConfigured()) return null;

  try {
    const res = await fetch(`${API}${env.TELEGRAM_BOT_TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = (await res.json()) as TelegramResponse;
    if (!data.ok) console.error(`Telegram ${method} failed:`, data.description);
    return data;
  } catch (error) {
    console.error(`Telegram ${method} error:`, (error as Error).message);
    return null;
  }
};

/** يهرب رموز HTML — اسم زبونٍ فيه `<` يكسر الرسالة كلها لا سطرها */
const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export interface TelegramMessage {
  text: string;
  /** زرٌّ يفتح اللوحة على الطلب مباشرةً — أسرع من البحث عنه */
  buttonText?: string;
  buttonUrl?: string;
}

export const sendMessage = async (chatId: string, message: TelegramMessage): Promise<boolean> => {
  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text: message.text,
    parse_mode: 'HTML',
    // معاينة الروابط تحوّل التنبيه إلى بطاقة كبيرة تخفي نصّه
    disable_web_page_preview: true
  };

  if (message.buttonText && message.buttonUrl) {
    payload.reply_markup = {
      inline_keyboard: [[{ text: message.buttonText, url: message.buttonUrl }]]
    };
  }

  const res = await call('sendMessage', payload);
  return Boolean(res?.ok);
};

/**
 * رمز ربطٍ للمستخدم.
 *
 * يُعاد الرمز نفسه إن كان موجوداً: توليد رمزٍ جديد مع كل فتحٍ للصفحة يُبطل
 * رابطاً أرسله التاجر إلى هاتفه قبل دقيقة.
 */
export const getOrCreateLinkCode = async (userId: string): Promise<string> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegramLinkCode: true }
  });

  if (user?.telegramLinkCode) return user.telegramLinkCode;

  // ١٦ حرفاً من قاعدة ٣٦: عشوائيةٌ تكفي لمنع التخمين، وقِصَرٌ يُبقي الرابط
  // قابلاً للقراءة والمسح برمز QR
  const code = crypto.randomBytes(12).toString('base64url').slice(0, 16);
  await prisma.user.update({ where: { id: userId }, data: { telegramLinkCode: code } });
  return code;
};

/** الرابط الذي يفتحه التاجر ليربط حسابه */
export const buildLinkUrl = (code: string): string | null => {
  const bot = botUsername();
  return bot ? `https://t.me/${bot}?start=${code}` : null;
};

/**
 * يربط محادثةً بحساب.
 *
 * الرمز يُستهلك عند النجاح: رابطٌ مسرَّب بعد الربط لا يربط محادثة غريبٍ
 * بحساب التاجر.
 */
export const linkChat = async (code: string, chatId: string): Promise<{ ok: boolean; name?: string }> => {
  const user = await prisma.user.findFirst({
    where: { telegramLinkCode: code },
    select: { id: true, name: true }
  });

  if (!user) return { ok: false };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      telegramChatId: String(chatId),
      telegramLinkedAt: new Date(),
      telegramLinkCode: null
    }
  });

  return { ok: true, name: user.name };
};

export const unlinkChat = async (userId: string): Promise<void> => {
  await prisma.user.update({
    where: { id: userId },
    data: { telegramChatId: null, telegramLinkedAt: null }
  });
};

/**
 * يعالج تحديثاً واردًا من تيليجرام.
 *
 * لا يفعل إلا `/start` بالرمز: البوت ليس محادثةً بل قناة تنبيه في اتجاه
 * واحد، وردُّه على كل رسالة يوهم التاجر أنه يستقبل طلباته منه.
 */
export const handleUpdate = async (update: any): Promise<void> => {
  try {
    const message = update?.message;
    const chatId = message?.chat?.id;
    const text: string = message?.text || '';
    if (!chatId || !text) return;

    const match = text.match(/^\/start\s+(\S+)/);

    if (!match) {
      if (text.startsWith('/start')) {
        await sendMessage(String(chatId), {
          text:
            '👋 أهلاً بك في تنبيهات <b>شام ستورز</b>.\n\n' +
            'لربط هذه المحادثة بحسابك، افتح لوحة التحكّم ← الإعدادات ← ' +
            'تنبيهات الطلبات، واضغط زرّ الربط هناك.'
        });
      }
      return;
    }

    const result = await linkChat(match[1], String(chatId));

    await sendMessage(String(chatId), {
      text: result.ok
        ? `✅ تم الربط بنجاح، ${escapeHtml(result.name || '')}.\n\n` +
          'سيصلك هنا تنبيهٌ فور وصول أي طلب جديد — حتى لو كانت اللوحة مغلقة.'
        : '⚠️ رابط الربط غير صالح أو استُخدم من قبل.\n\n' +
          'افتح لوحة التحكّم واطلب رابطاً جديداً.'
    });
  } catch (error) {
    console.error('Telegram handleUpdate failed:', error);
  }
};

/** يضبط الـwebhook — يُنادى مرّةً بعد النشر */
export const setWebhook = async (publicUrl: string): Promise<boolean> => {
  const res = await call('setWebhook', {
    url: publicUrl,
    allowed_updates: ['message'],
    secret_token: env.TELEGRAM_WEBHOOK_SECRET || undefined
  });
  return Boolean(res?.ok);
};

export default {
  isConfigured,
  botUsername,
  sendMessage,
  getOrCreateLinkCode,
  buildLinkUrl,
  linkChat,
  unlinkChat,
  handleUpdate,
  setWebhook,
  escapeHtml
};
