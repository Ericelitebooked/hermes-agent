const axios = require('axios');
const config = require('../config');

const axiosInstance = axios.create({
  baseURL: 'https://api.cal.com/v2',
  headers: {
    Authorization: `Bearer ${config.calApiKey}`,
    'cal-api-version': '2024-08-13',
    'Content-Type': 'application/json',
  },
});

async function getAvailability(date) {
  try {
    console.log(`[Cal.com] Fetching availability for ${date}`);

    // Format date as YYYY-MM-DD
    const response = await axiosInstance.get('/slots', {
      params: {
        eventTypeId: config.calEventTypeId,
        startTime: `${date}T00:00:00Z`,
        endTime: `${date}T23:59:59Z`,
        timeZone: config.timezone,
      },
    });

    const slots = response.data.slots || [];
    console.log(`[Cal.com] Found ${slots.length} available slots`);
    return slots;
  } catch (error) {
    console.error('[Cal.com] Error fetching availability:', error.response?.data || error.message);
    return [];
  }
}

async function bookAppointment(email, phone, name, slotTime) {
  try {
    console.log(`[Cal.com] Booking appointment for ${name}`);

    // Build attendee object with required contact method
    const attendee = {
      name: name,
      timeZone: config.timezone,
      language: 'en',
    };

    // Add email only if provided and non-empty
    if (email && email.trim()) {
      attendee.email = email;
    }

    // Always include phone if provided
    if (phone && phone.trim()) {
      attendee.phoneNumber = phone;
    }

    // Must have at least one contact method
    if (!attendee.email && !attendee.phoneNumber) {
      throw new Error('Attendee must have email or phone number');
    }

    const bookingPayload = {
      eventTypeId: Number(config.calEventTypeId),
      start: slotTime,
      attendee: attendee,
    };

    console.log('[Cal.com] Booking payload:', JSON.stringify(bookingPayload, null, 2));

    const response = await axiosInstance.post('/bookings', bookingPayload);

    console.log('[Cal.com] Booking successful:', response.data.booking?.id);
    return response.data.booking;
  } catch (error) {
    console.error('[Cal.com] Booking failed');
    console.error('[Cal.com] Status:', error.response?.status);
    console.error('[Cal.com] Error details:', JSON.stringify(error.response?.data));
    throw error;
  }
}

module.exports = { getAvailability, bookAppointment };
