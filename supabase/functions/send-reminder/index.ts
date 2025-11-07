import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req: Request) => {
  try {
    const { phone, message } = await req.json();

    if (!phone || !message) {
      return new Response("Missing phone or message", { status: 400 });
    }

    const token = Deno.env.get("SMSAPI_TOKEN");
    if (!token) {
      throw new Error("Missing SMSAPI_TOKEN");
    }

    // 🟢 Format the Belgian number
    let formatted = phone.trim();

    // Convert 0476... → +32476...
    if (/^0\d{8,}$/.test(formatted)) {
      formatted = "+32" + formatted.slice(1);
    }

    // Convert 0032476... → +32476...
    if (formatted.startsWith("0032")) {
      formatted = "+" + formatted.slice(2);
    }

    // Ensure it starts with +
    if (!formatted.startsWith("+")) {
      throw new Error(`Invalid phone number format: ${formatted}`);
    }

    // 🟢 Send SMS through SMSAPI
    const res = await fetch("https://api.smsapi.com/sms.do", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        to: formatted,
        message,
        from: "VVBeauty",
      }),
    });

    const text = await res.text();

    if (!res.ok || text.startsWith("ERROR")) {
      console.error("❌ SMSAPI error:", text);
      return new Response(JSON.stringify({ success: false, error: text }), { status: 500 });
    }

    console.log("✅ SMS sent:", text);
    return new Response(JSON.stringify({ success: true, response: text }), { status: 200 });

  } catch (err: unknown) {
    const e = err as Error;
    console.error("💥 Error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});
