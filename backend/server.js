import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import Lead from './models/Lead.js';
import nodemailer from 'nodemailer';

// Load env variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Routes
// @desc    Submit a new lead
// @route   POST /api/leads
app.post('/api/leads', async (req, res) => {
  try {
    const { firstName, lastName, email, company, budget, challenge } = req.body;

    if (!firstName || !lastName || !email || !company || !budget) {
      return res.status(400).json({ message: 'Please enter all required fields' });
    }

    const lead = await Lead.create({
      firstName,
      lastName,
      email,
      company,
      budget,
      challenge: challenge || ''
    });

    // Send Email Notification
    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });

        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: process.env.EMAIL_TO || 'paradoxagencyoffl@gmail.com',
          subject: `⚡ New Lead: ${firstName} ${lastName} from ${company}`,
          html: `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 3px solid #000000; padding: 30px; background-color: #fbfbf8; color: #000000; box-shadow: 6px 6px 0px 0px rgba(0,0,0,1); border-radius: 8px;">
              <div style="text-align: center; margin-bottom: 25px; border-bottom: 3px solid #000000; padding-bottom: 20px;">
                <h1 style="font-size: 28px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -0.5px;">⚡ NEW INQUIRY RECEIVED</h1>
              </div>
              
              <div style="margin-bottom: 25px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; font-weight: 800; text-transform: uppercase; font-size: 13px; color: #000000; border-bottom: 1px solid #e0e0e0; width: 160px;">Name</td>
                    <td style="padding: 10px 0; font-size: 15px; color: #333333; border-bottom: 1px solid #e0e0e0; font-weight: 500;">${firstName} ${lastName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; font-weight: 800; text-transform: uppercase; font-size: 13px; color: #000000; border-bottom: 1px solid #e0e0e0;">Work Email</td>
                    <td style="padding: 10px 0; font-size: 15px; border-bottom: 1px solid #e0e0e0;">
                      <a href="mailto:${email}" style="color: #046bd2; text-decoration: underline; font-weight: bold;">${email}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; font-weight: 800; text-transform: uppercase; font-size: 13px; color: #000000; border-bottom: 1px solid #e0e0e0;">Company / Brand</td>
                    <td style="padding: 10px 0; font-size: 15px; color: #333333; border-bottom: 1px solid #e0e0e0; font-weight: 500;">${company}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; font-weight: 800; text-transform: uppercase; font-size: 13px; color: #000000; border-bottom: 1px solid #e0e0e0;">Project Budget</td>
                    <td style="padding: 10px 0; font-size: 15px; border-bottom: 1px solid #e0e0e0;">
                      <span style="background-color: #e03131; color: #ffffff; padding: 4px 8px; border: 1.5px solid #000000; font-weight: 800; font-size: 12px; border-radius: 2px; box-shadow: 2px 2px 0px 0px rgba(0,0,0,1); display: inline-block;">
                        ${budget}
                      </span>
                    </td>
                  </tr>
                </table>
              </div>
              
              <div style="background-color: #ffffff; border: 2px solid #000000; padding: 20px; border-radius: 4px; box-shadow: 3px 3px 0px 0px rgba(0,0,0,1);">
                <h3 style="margin-top: 0; margin-bottom: 10px; font-weight: 800; text-transform: uppercase; font-size: 13px; color: #000000; border-bottom: 1px solid #e0e0e0; padding-bottom: 6px;">PROJECT CHALLENGE & GOALS</h3>
                <p style="margin: 0; font-size: 14px; color: #333333; line-height: 1.6; white-space: pre-wrap; font-style: italic;">${challenge || 'No challenge description provided.'}</p>
              </div>
              
              <div style="margin-top: 30px; border-top: 2px solid #000000; padding-top: 15px; text-align: center;">
                <p style="margin: 0; font-size: 11px; color: #666666; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">This is an automated notification from the Paradox Agency web app.</p>
              </div>
            </div>
          `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email notification successfully sent to ${mailOptions.to} for lead from ${company}`);
      } else {
        console.warn('EMAIL_USER and EMAIL_PASS not set in .env, skipping email notification.');
      }
    } catch (mailError) {
      console.error('Error sending email notification:', mailError);
      // Lead is still saved even if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Lead submitted successfully',
      data: lead
    });
  } catch (error) {
    console.error('Error submitting lead:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

// @desc    Get all leads (Admin)
// @route   GET /api/leads
app.get('/api/leads', async (req, res) => {
  try {
    const leads = await Lead.find({}).sort({ createdAt: -1 });
    res.status(200).json(leads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ message: 'Server error fetching leads' });
  }
});

// @desc    Delete a lead
// @route   DELETE /api/leads/:id
app.delete('/api/leads/:id', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    await lead.deleteOne();
    res.status(200).json({ success: true, message: 'Lead removed successfully' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ message: 'Server error deleting lead' });
  }
});

// Root Route
app.get('/', (req, res) => {
  res.send('Paradox API is running...');
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running in production-ready mode on port ${PORT}`);
  });
}

export default app;
