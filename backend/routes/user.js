const router = require('express').Router();
const pool = require('../db');
const Razorpay = require('razorpay');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// 1. PUBLIC ROUTE: Get all parking lots (with Occupied Count)
router.get('/lots', async (req, res) => {
  try {
    const allLots = await pool.query(`
      SELECT 
        l.*, 
        (SELECT COUNT(*) FROM spots s WHERE s.lot_id = l.lot_id AND s.status = 'o') as occupied_spots
      FROM lots l
      ORDER BY l.lot_id ASC
    `);
    res.json(allLots.rows);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

// 2. Get active bookings for a specific user
router.get('/my-bookings/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const activeBookings = await pool.query(
      "SELECT * FROM reservations WHERE user_id = $1 AND is_ongoing = true",
      [userId]
    );
    res.json(activeBookings.rows);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

// 3. Create Razorpay Order
router.post('/create-order', async (req, res) => {
  try {
    const { amount } = req.body; 
    const options = {
      amount: amount * 100, // Amount in paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).send("Razorpay Order Error");
  }
});

// 4. STEP 1: Calculate Bill (Before Payment)
router.put('/checkout-calc/:reserve_id', async (req, res) => {
  try {
    const { reserve_id } = req.params;
    const reserveData = await pool.query(
      "SELECT start_time, price_per_hr FROM reservations WHERE reserve_id = $1 AND is_ongoing = true",
      [reserve_id]
    );

    if (reserveData.rows.length === 0) return res.status(404).json({ error: "Session not found" });

    const { start_time, price_per_hr } = reserveData.rows[0];
    const durationInHours = Math.max(1, Math.ceil((new Date() - new Date(start_time)) / (1000 * 60 * 60)));
    const totalAmount = durationInHours * price_per_hr;

    res.json({ total_amt: totalAmount, hours: durationInHours });
  } catch (err) { res.status(500).send("Server Error"); }
});

// 5. STEP 2: Confirm Checkout (After Payment Success)
router.put('/checkout-confirm/:reserve_id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { reserve_id } = req.params;
    const { payment_id, amount } = req.body;
    await client.query('BEGIN');

    const data = await client.query("SELECT spot_id FROM reservations WHERE reserve_id = $1", [reserve_id]);
    if (data.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Reservation not found" });
    }
    const spotId = data.rows[0].spot_id;

    // 1. Free the spot
    await client.query("UPDATE spots SET status = 'a' WHERE spot_id = $1", [spotId]);
    
    // 2. End the reservation
    await client.query("UPDATE reservations SET end_time = NOW(), is_ongoing = false WHERE reserve_id = $1", [reserve_id]);
    
    // 3. Record the payment for Admin Dashboard
    // Handle slight schema variations across setups.
    const paymentColsRes = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments'"
    );
    const paymentCols = paymentColsRes.rows.map((r) => r.column_name);
    const paymentColsByName = Object.fromEntries(
      paymentColsRes.rows.map((r) => [r.column_name, r.data_type])
    );

    const amountCol = paymentCols.includes('total_amt')
      ? 'total_amt'
      : (paymentCols.includes('amount') ? 'amount' : null);
    const methodCol = paymentCols.includes('payment_method')
      ? 'payment_method'
      : (paymentCols.includes('method') ? 'method' : null);
    const textLikeTypes = ['text', 'character varying', 'character'];
    const preferredTxnCols = ['razorpay_payment_id', 'transaction_id', 'payment_id'];
    const txnIdCol = preferredTxnCols.find((col) =>
      paymentCols.includes(col) && textLikeTypes.includes(paymentColsByName[col])
    ) || null;

    if (!paymentCols.includes('reserve_id') || !amountCol) {
      throw new Error("Payments table schema mismatch: required columns not found.");
    }

    const insertColumns = ['reserve_id', amountCol];
    const insertValues = [reserve_id, amount];

    if (methodCol) {
      insertColumns.push(methodCol);
      insertValues.push('Razorpay');
    }
    if (txnIdCol) {
      insertColumns.push(txnIdCol);
      insertValues.push(payment_id);
    }

    const placeholders = insertColumns.map((_, idx) => `$${idx + 1}`).join(', ');
    await client.query(
      `INSERT INTO payments (${insertColumns.join(', ')}) VALUES (${placeholders})`,
      insertValues
    );

    await client.query('COMMIT');
    res.json({ message: "Checkout complete" });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Checkout confirm error:", err);
    res.status(500).json({
      error: "Checkout confirmation failed",
      details: err.message
    });
  } finally { client.release(); }
});

// 6. Get spots for a lot (for the Modal)
router.get('/lots/:lotId/spots', async (req, res) => {
  try {
    const { lotId } = req.params;
    const spots = await pool.query("SELECT * FROM spots WHERE lot_id = $1 ORDER BY spot_id ASC", [lotId]);
    res.json(spots.rows);
  } catch (err) { res.status(500).send("Server Error"); }
});

// 7. Book a spot
router.post('/book', async (req, res) => {
  const client = await pool.connect();
  try {
    const { user_id, lot_id, vehicle_num, spot_id } = req.body;
    await client.query('BEGIN');

    // Double check spot is still available
    const checkSpot = await client.query("SELECT status FROM spots WHERE spot_id = $1 FOR UPDATE", [spot_id]);
    if (checkSpot.rows[0].status !== 'a') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: "Spot just got taken!" });
    }

    await client.query("UPDATE spots SET status = 'o' WHERE spot_id = $1", [spot_id]);
    const lotInfo = await client.query("SELECT price_per_hr FROM lots WHERE lot_id = $1", [lot_id]);
    
    await client.query(
      "INSERT INTO reservations (lot_id, spot_id, user_id, vehicle_num, price_per_hr) VALUES ($1, $2, $3, $4, $5)",
      [lot_id, spot_id, user_id, vehicle_num, lotInfo.rows[0].price_per_hr]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: "Booked!" });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).send("Server Error");
  } finally { client.release(); }
});

module.exports = router;