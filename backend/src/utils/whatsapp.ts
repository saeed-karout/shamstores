
export const sendWhatsAppReminder = async (to: string, message: string) => {
  console.log(`Sending WhatsApp reminder to ${to}: ${message}`);
  return { success: true };
};

export const sendWhatsAppMessage = async (to: string, message: string) => {
  console.log(`Sending WhatsApp to ${to}: ${message}`);
  return { success: true };
};

export default { sendWhatsAppReminder, sendWhatsAppMessage };