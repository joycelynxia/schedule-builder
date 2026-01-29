import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "");

interface ShiftNotificationData {
  userName: string;
  userEmail: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  title?: string;
  note?: string;
  isDraft?: boolean;
}

export const sendShiftPublishedEmail = async (data: ShiftNotificationData) => {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email notification");
    console.warn("Would send email to:", data.userEmail);
    return;
  }

  console.log(`Attempting to send shift notification email to ${data.userEmail}`);

  const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";
  
  // Format the date nicely
  const date = new Date(data.shiftDate);
  const formattedDate = date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Format time (assuming format like "09:00" or "09:00:00")
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formattedStartTime = formatTime(data.startTime);
  const formattedEndTime = formatTime(data.endTime);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #ffffff;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 30px;
          }
          .header {
            color: #7c5cf0;
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 20px;
          }
          .shift-details {
            background-color: #f8f9fa;
            border-left: 4px solid #7c5cf0;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .detail-row {
            margin: 10px 0;
          }
          .detail-label {
            font-weight: 600;
            color: #666;
            display: inline-block;
            width: 100px;
          }
          .detail-value {
            color: #333;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            font-size: 14px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">Schedulr</div>
          <h2>${data.isDraft ? 'New Shift Assigned (Draft)' : 'Your Shift Has Been Published'}</h2>
          <p>Hi ${data.userName},</p>
          <p>A new shift has been assigned to you${data.isDraft ? ' (draft - not yet published)' : ' and published to the schedule'}.</p>
          
          <div class="shift-details">
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span class="detail-value">${formattedDate}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Time:</span>
              <span class="detail-value">${formattedStartTime} - ${formattedEndTime}</span>
            </div>
            ${data.title ? `
            <div class="detail-row">
              <span class="detail-label">Title:</span>
              <span class="detail-value">${data.title}</span>
            </div>
            ` : ''}
            ${data.note ? `
            <div class="detail-row">
              <span class="detail-label">Note:</span>
              <span class="detail-value">${data.note}</span>
            </div>
            ` : ''}
          </div>
          
          <p>Please check your schedule for more details.</p>
          
          <div class="footer">
            <p>This is an automated notification from Schedulr.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Hi ${data.userName},

A new shift has been assigned to you${data.isDraft ? ' (draft - not yet published)' : ' and published to the schedule'}.

Date: ${formattedDate}
Time: ${formattedStartTime} - ${formattedEndTime}
${data.title ? `Title: ${data.title}\n` : ''}${data.note ? `Note: ${data.note}\n` : ''}

Please check your schedule for more details.

This is an automated notification from Schedulr.
  `;

  try {
    const subject = data.isDraft 
      ? `New Shift Assigned (Draft) - ${formattedDate}`
      : `New Shift Published - ${formattedDate}`;

    const result = await resend.emails.send({
      from: fromEmail,
      to: data.userEmail,
      subject,
      html,
      text,
    });
    console.log(`Email sent successfully to ${data.userEmail}`, result);
  } catch (error) {
    console.error(`Failed to send email to ${data.userEmail}:`, error);
    // Log more details for debugging
    if (error instanceof Error) {
      console.error("Error details:", error.message, error.stack);
    }
    // Don't throw - we don't want email failures to break the API response
  }
};
