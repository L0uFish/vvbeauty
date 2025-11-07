// supabase/functions/send-booking-email/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    console.log("📩 Incoming:", body);

    const { appointment_id } = body;

    if (!appointment_id)
      return new Response(JSON.stringify({ error: "Missing appointment_id" }), {
        status: 400,
      });

    // 1️⃣ Fetch appointment details
    const { data: appt, error: apptErr } = await supabase
      .from("appointments")
      .select("id, user_id, service_id, date, time")
      .eq("id", appointment_id)
      .single();

    if (apptErr || !appt)
      throw new Error("Appointment not found: " + apptErr?.message);

    const { user_id, service_id, date, time } = appt;

    // 2️⃣ Fetch client + service info
    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .select("full_name, email")
      .eq("id", user_id)
      .single();
    if (clientErr || !client)
      throw new Error("Client not found: " + clientErr?.message);

    const { data: service, error: svcErr } = await supabase
      .from("services")
      .select("name")
      .eq("id", service_id)
      .single();
    if (svcErr || !service)
      throw new Error("Service not found: " + svcErr?.message);

    // 🗓 Format date as DD-MM-YYYY
    const formattedDate = new Date(date).toLocaleDateString("nl-BE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    // 3️⃣ Email content (VVBeauty style)
    const subjectClient = `Bevestiging van je afspraak – ${service.name} op ${formattedDate} om ${time}`;
    const htmlClient = `
      <div style="font-family:Inter,Arial,sans-serif;padding:24px;color:#333;background:#fff6f9;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;box-shadow:0 6px 18px rgba(0,0,0,0.08);overflow:hidden;border:1px solid #ffe0ea;">
          <div style="padding:22px 24px;background:#ffe8f0;">
            <h1 style="margin:0;font-size:20px;color:#b23561;">💅 VVBeauty – Afspraakbevestiging</h1>
          </div>
          <div style="padding:24px;">
            <p style="margin:0 0 12px;">Dag <strong>${client.full_name}</strong>,</p>
            <p style="margin:0 0 14px;">Bedankt voor je boeking! Je afspraak is bevestigd.</p>

            <table style="width:100%;border-collapse:collapse;margin:10px 0 16px;">
              <tr><td style="padding:8px 0;width:110px;color:#777;">Behandeling</td><td style="padding:8px 0;"><strong>${service.name}</strong></td></tr>
              <tr><td style="padding:8px 0;color:#777;">Datum</td><td style="padding:8px 0;"><strong>${formattedDate}</strong></td></tr>
              <tr><td style="padding:8px 0;color:#777;">Uur</td><td style="padding:8px 0;"><strong>${time}</strong></td></tr>
            </table>

            <p style="margin:14px 0;">Je kunt je afspraak beheren via onze website:</p>
            <p style="text-align:center;margin:20px 0;">
              <a href="https://vvbeauty.be/" 
                 style="background-color:#b23561;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:500;">
                 Beheer je afspraak
              </a>
            </p>

            <p style="margin:14px 0 0;">Tot snel!<br><strong>Team VVBeauty</strong><br>
              <a href="https://vvbeauty.be" style="color:#b23561;text-decoration:none;">vvbeauty.be</a>
            </p>
          </div>
        </div>
      </div>
    `;

    const subjectAdmin = `Nieuwe boeking: ${client.full_name} – ${service.name} (${formattedDate} ${time})`;
    const textAdmin = `Nieuwe boeking
Naam: ${client.full_name}
E-mail: ${client.email}
Behandeling: ${service.name}
Datum: ${formattedDate}
Uur: ${time}`;

// 4️⃣ Send via MailerSend
const send = async (payload: unknown) => {
      // 👇 CRITICAL FIX: Get the key and check if it exists
      const API_KEY = Deno.env.get("MAILERSEND_API_KEY");
      if (!API_KEY) {
          throw new Error("MAILERSEND_API_KEY environment variable is missing.");
      }

      const res = await fetch("https://api.mailersend.com/v1/email", {
          method: "POST",
          headers: {
              // 👇 Ensure the header is correctly formed
              Authorization: `Bearer ${API_KEY}`,
              "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
      });
      if (!res.ok) {
          // This is excellent error handling!
          const t = await res.text();
          throw new Error("MailerSend failed with status " + res.status + ": " + t);
      }
      // You might want to console.log the response to confirm success
      console.log(`✅ MailerSend successful for ${payload.to[0].email}`); 
  };

    // Client email
    await send({
      from: { email: "info@vvbeauty.be", name: "VVBeauty" },
      to: [{ email: client.email, name: client.full_name }],
      subject: subjectClient,
      html: htmlClient,
    });

    // Admin email
    await send({
      from: { email: "info@vvbeauty.be", name: "VVBeauty" },
      to: [{ email: "info@vvbeauty.be", name: "VVBeauty Bookings" }],
      subject: subjectAdmin,
      text: textAdmin,
    });

    // ✅ Done
    return new Response(
      JSON.stringify({ success: true, appointment_id }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: any) {
    console.error("❌ Error:", err);
    return new Response(
      JSON.stringify({ error: err.message ?? String(err) }),
      { status: 500 }
    );
  }
});
