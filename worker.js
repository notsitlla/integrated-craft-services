export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. Intercept the form submission endpoint
    if (url.pathname === "/api/contact") {
      const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      };

      if (request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
      }

      if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
      }

      try {
        const formData = await request.formData();
        const formType = formData.get("form_type") || "General Inquiry";
        const name = formData.get("name") || "Not provided";
        const email = formData.get("email") || "Not provided";
        const phone = formData.get("phone") || "Not provided";
        const projectType = formData.get("project_type") || "N/A";
        const timeline = formData.get("timeline") || "N/A";
        const budget = formData.get("budget") || "N/A";
        const message = formData.get("message") || formData.get("details") || "No message provided";
        const honeypot = formData.get("website");

        // Honeypot spam trap
        if (honeypot) {
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const emailBody = `
New Submission: ${formType}
--------------------------------------------------
Name:             ${name}
Email:            ${email}
Phone:            ${phone}
Project Type:     ${projectType}
Timeline:         ${timeline}
Estimated Budget: ${budget}

Message / Project Scope:
${message}
--------------------------------------------------
Sent from: integratedcraftservices.com
        `.trim();

        if (!env.API_KEY) {
          return new Response(
            JSON.stringify({ error: "API_KEY secret is missing in Cloudflare settings." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Integrated Craft Services <notifications@send.integratedcraftservices.com>",
            to: ["info@integratedcraftservices.com"],
            reply_to: email,
            subject: `[Website Inquiry] ${formType}: ${name}`,
            text: emailBody,
          }),
        });

        const resData = await resendRes.json();

        if (!resendRes.ok) {
          return new Response(JSON.stringify({ error: resData }), {
            status: resendRes.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true, data: resData }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 2. Serve static HTML/CSS/Images for everything else
    return env.ASSETS.fetch(request);
  },
};
