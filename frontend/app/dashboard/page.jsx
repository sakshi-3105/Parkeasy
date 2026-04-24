"use client";
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

export default function UserDashboard() {
  // --- Data States ---
  const [lots, setLots] = useState([]);
  const [bookings, setBookings] = useState([]); 
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showShadedOnly, setShowShadedOnly] = useState(false);

  // --- Modal & Selection States ---
  const [selectedLot, setSelectedLot] = useState(null);
  const [lotSpots, setLotSpots] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingSpotId, setPendingSpotId] = useState(null);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [vehicleNumInput, setVehicleNumInput] = useState('');
  const [vehicleError, setVehicleError] = useState('');
  
  // --- QR & Success States ---
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [qrData, setQrData] = useState("");
  const qrRef = useRef(null);

  // --- UI Feedback States ---
  const [feedback, setFeedback] = useState({ open: false, message: '', type: 'info' });
  const [paymentToast, setPaymentToast] = useState({ open: false, message: '' });

  const router = useRouter();

  // --- Initialization ---
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    } else {
      setUserName(storedUser.name);
      fetchLots();
      fetchUserBookings(storedUser.user_id);
    }
  }, []);

  const fetchLots = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/user/lots');
      setLots(response.data);
    } catch (err) { console.error("Error fetching lots"); }
    finally { setLoading(false); }
  };

  const fetchUserBookings = async (userId) => {
    try {
      const response = await axios.get(`http://localhost:3001/api/user/my-bookings/${userId}`);
      setBookings(response.data);
    } catch (err) { console.error("Error fetching bookings"); }
  };

  // --- Booking Logic ---
  const openBookingModal = async (lot) => {
    setSelectedLot(lot);
    setIsModalOpen(true);
    setBookingSuccess(false); 
    try {
      const response = await axios.get(`http://localhost:3001/api/user/lots/${lot.lot_id}/spots`);
      setLotSpots(response.data);
    } catch (err) {
      setFeedback({ open: true, message: "Could not load spots.", type: 'error' });
    }
  };

  const vehicleRegex = /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{1,4}$/;

  const openVehicleModal = (spotId) => {
    setPendingSpotId(spotId);
    setVehicleNumInput('');
    setVehicleError('');
    setShowVehicleModal(true);
  };

  const handleFinalBooking = async () => {
    const normalizedVehicleNum = vehicleNumInput.trim().toUpperCase().replace(/\s+/g, '');
    if (!normalizedVehicleNum) {
      setVehicleError('Vehicle number is required.');
      return;
    }
    if (!vehicleRegex.test(normalizedVehicleNum)) {
      setVehicleError('Enter a valid vehicle number (e.g., MH12AB1234).');
      return;
    }

    const user = JSON.parse(localStorage.getItem('user'));
  
    try {
      await axios.post('http://localhost:3001/api/user/book', {
        user_id: user.user_id,
        lot_id: selectedLot.lot_id,
        vehicle_num: normalizedVehicleNum,
        spot_id: pendingSpotId
      });
      
      const uniqueData = `PARKEASY|${normalizedVehicleNum}|LOT:${selectedLot.lot_id}|SPOT:${pendingSpotId}|${Date.now()}`;
      setQrData(uniqueData);
      
      setShowVehicleModal(false);
      setBookingSuccess(true); 
      fetchLots();
      fetchUserBookings(user.user_id);
    } catch (err) {
      setFeedback({ open: true, message: err.response?.data?.error || "Booking failed", type: 'error' });
    }
  };

  // --- QR Ticket Download Logic ---
  const downloadTicket = () => {
    const svg = qrRef.current.querySelector("svg");
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = 300;
      canvas.height = 450;
      
      // Draw Ticket Background
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw Header
      ctx.fillStyle = "#2563eb";
      ctx.fillRect(0, 0, canvas.width, 60);
      ctx.fillStyle = "white";
      ctx.font = "bold 20px Arial";
      ctx.textAlign = "center";
      ctx.fillText("PARKEASY TICKET", canvas.width / 2, 40);

      // Draw QR Code
      ctx.drawImage(img, 50, 80, 200, 200);

      // Draw Details
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 16px Arial";
      ctx.fillText(`VEHICLE: ${vehicleNumInput}`, canvas.width / 2, 320);
      
      ctx.font = "14px Arial";
      ctx.fillStyle = "#64748b";
      ctx.fillText(selectedLot?.prime_loc, canvas.width / 2, 350);
      
      ctx.font = "italic 12px Arial";
      ctx.fillText("Valid for one-time entry", canvas.width / 2, 400);

      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `ParkEasy_${vehicleNumInput}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  // --- Checkout & Payment Logic ---
  const handleCheckout = async (reserve_id) => {
    try {
      const billRes = await axios.put(`http://localhost:3001/api/user/checkout-calc/${reserve_id}`);
      const { total_amt } = billRes.data;
  
      const orderRes = await axios.post('http://localhost:3001/api/user/create-order', { amount: total_amt });
      
      if (!window.Razorpay) {
        setFeedback({ open: true, message: "Razorpay SDK failed to load.", type: 'error' });
        return;
      }
  
      const options = {
        key: "rzp_test_SeZ4TZZ9b1jBY8", 
        amount: orderRes.data.amount,    
        currency: "INR",
        name: "ParkEasy Pune",
        order_id: orderRes.data.id,      
        handler: async function (response) {
          try {
            await axios.put(`http://localhost:3001/api/user/checkout-confirm/${reserve_id}`, {
              payment_id: response.razorpay_payment_id,
              amount: total_amt 
            });
            setPaymentToast({ open: true, message: `Payment Successful! ID: ${response.razorpay_payment_id}` });
            setTimeout(() => setPaymentToast({ open: false, message: '' }), 4000);
            fetchLots();
            fetchUserBookings(JSON.parse(localStorage.getItem('user')).user_id);
          } catch (err) {
            setFeedback({ open: true, message: "Critical session update error.", type: 'error' });
          }
        },
        prefill: { name: userName, email: JSON.parse(localStorage.getItem('user'))?.email || "" },
        theme: { color: "#2563eb" }
      };
  
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setFeedback({ open: true, message: "Checkout failed.", type: 'error' });
    }
  };

  const filteredLots = lots.filter(lot => {
    const matchesSearch = lot.prime_loc.toLowerCase().includes(searchTerm.toLowerCase()) || lot.pincode.includes(searchTerm);
    return matchesSearch && (showShadedOnly ? lot.is_shaded : true);
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 pb-20 relative font-sans">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-300/20 blur-[120px] rounded-full pointer-events-none"></div>
      
      {/* Payment Toast */}
      {paymentToast.open && (
        <div className="fixed top-4 right-4 z-[70] bg-white border border-green-200 shadow-2xl rounded-2xl p-4 border-l-4 border-l-green-500 animate-in slide-in-from-right duration-300">
          <p className="text-xs font-bold text-green-700 uppercase">Success</p>
          <p className="text-sm font-semibold text-gray-800">{paymentToast.message}</p>
        </div>
      )}
      
      <nav className="bg-white/80 backdrop-blur-xl border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-40 shadow-sm">
        <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-800 tracking-tighter">PARKEASY</h1>
        <div className="flex items-center gap-4">
          <span className="hidden md:inline font-medium text-gray-600">Welcome, <span className="text-gray-900 font-bold">{userName}</span></span>
          <button onClick={() => { localStorage.clear(); router.push('/login'); }} className="text-xs font-bold text-red-500 hover:bg-red-500 hover:text-white border border-red-500 px-4 py-2 rounded-xl transition-all">Logout</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 relative z-10">
        {feedback.open && (
          <div className="mb-6 rounded-2xl bg-blue-50 border border-blue-200 p-4 text-blue-800 font-bold flex justify-between">
            {feedback.message}
            <button onClick={() => setFeedback({ ...feedback, open: false })}>✕</button>
          </div>
        )}

        {/* Active Bookings */}
        {bookings.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><span className="w-1.5 h-6 bg-blue-600 rounded-full"></span> Active Sessions</h2>
            <div className="grid gap-6">
              {bookings.map((booking) => (
                <div key={booking.reserve_id} className="bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-[2rem] p-8 flex flex-col md:flex-row justify-between items-center shadow-xl">
                  <div>
                    <p className="text-blue-200 text-xs font-bold uppercase tracking-widest">Vehicle: {booking.vehicle_num}</p>
                    <h3 className="text-4xl font-black mt-1">Spot #{booking.spot_id}</h3>
                  </div>
                  <button onClick={() => handleCheckout(booking.reserve_id)} className="mt-4 md:mt-0 bg-white text-blue-700 px-10 py-4 rounded-2xl font-black hover:scale-105 transition-transform">CHECKOUT & PAY</button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-10 bg-white p-4 rounded-[2rem] border border-gray-200 shadow-sm">
          <input type="text" placeholder="Find a location..." className="flex-grow px-6 py-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <div className="flex items-center px-6 py-4 bg-gray-50 rounded-2xl border border-gray-100">
            <input type="checkbox" id="shaded-only" checked={showShadedOnly} onChange={(e) => setShowShadedOnly(e.target.checked)} className="w-5 h-5 accent-blue-600" />
            <label htmlFor="shaded-only" className="ml-3 font-bold text-gray-700 cursor-pointer text-sm">Shaded Slots</label>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredLots.map((lot) => (
            <div key={lot.lot_id} className="bg-white rounded-[2.5rem] p-8 border border-gray-100 hover:border-blue-300 transition-all group flex flex-col justify-between shadow-sm hover:shadow-xl">
              <div>
                <span className={`text-[10px] font-black px-3 py-1 rounded-lg ${lot.is_shaded ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                  {lot.is_shaded ? 'SHADED' : 'OPEN'}
                </span>
                <h3 className="text-2xl font-black text-gray-900 mt-4">{lot.prime_loc}</h3>
                <p className="text-gray-500 text-sm mt-1 mb-6 leading-relaxed">{lot.address}</p>
              </div>
              <div className="flex justify-between items-center border-t pt-6">
                <p className="text-2xl font-black">₹{lot.price_per_hr}<span className="text-sm font-medium text-gray-400">/hr</span></p>
                <button onClick={() => openBookingModal(lot)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200">Select Spot</button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* --- MODAL (SPOT SELECTION + QR SUCCESS) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] p-8 sm:p-12 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative border border-white/20">
            
            <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-gray-400 hover:text-red-500 transition-colors">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>

            {bookingSuccess ? (
              <div className="flex flex-col items-center justify-between h-full max-h-[75vh] sm:max-h-[85vh] animate-in zoom-in duration-300">
                
                {/* Header Section - Reduced margins for laptop */}
                <div className="text-center">
                  <div className="w-12 h-12 sm:w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-6 h-6 sm:w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <h2 className="text-xl sm:text-3xl font-black text-gray-900 leading-tight">Booking Confirmed!</h2>
                  <p className="text-gray-500 text-[11px] sm:text-sm font-medium">Scan at entry gate</p>
                </div>

                {/* QR Container - Shrinks on smaller laptop screens */}
                <div 
                  ref={qrRef} 
                  className="bg-white p-3 sm:p-6 rounded-[1.5rem] border-2 border-dashed border-blue-100 shadow-sm my-3 sm:my-6 flex items-center justify-center"
                >
                  <div className="block lg:hidden"> {/* Smaller for tablets/laptops */}
                    <QRCodeSVG value={qrData} size={140} level="H" includeMargin={true} />
                  </div>
                  <div className="hidden lg:block"> {/* Larger for big monitors */}
                    <QRCodeSVG value={qrData} size={180} level="H" includeMargin={true} />
                  </div>
                </div>

                {/* Action Section - Compact buttons */}
                <div className="w-full flex flex-col gap-2">
                  <button 
                    onClick={downloadTicket} 
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-100 flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                    </svg>
                    Download Ticket
                  </button>
                  
                  <button 
                    onClick={() => setIsModalOpen(false)} 
                    className="w-full py-2 text-gray-400 font-bold hover:text-gray-600 text-xs uppercase tracking-widest"
                  >
                    Dismiss
                  </button>
                </div>

                {/* Small Footer Tip */}
                <p className="mt-2 text-[9px] font-black uppercase tracking-widest text-blue-400 opacity-50">
                  ParkEasy Pune Digital Pass
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-3xl font-black text-gray-900 mb-2">Pick a Spot</h2>
                <p className="text-gray-500 font-medium mb-10">{selectedLot?.prime_loc}</p>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-4">
                  {lotSpots.map((spot, index) => (
                    <button
                      key={spot.spot_id}
                      disabled={spot.status === 'o'}
                      onClick={() => openVehicleModal(spot.spot_id)}
                      className={`aspect-square rounded-2xl flex flex-col items-center justify-center border-2 transition-all active:scale-90 ${
                        spot.status === 'a' 
                        ? 'border-green-100 bg-green-50 text-green-700 hover:border-green-500 hover:bg-green-500 hover:text-white' 
                        : 'border-gray-100 bg-gray-50 text-gray-300'
                      }`}
                    >
                      <span className="text-sm font-black">P-{index + 1}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Vehicle Input Modal */}
      {showVehicleModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl border border-gray-100">
            <h2 className="text-3xl font-black text-gray-900 mb-2">Verification</h2>
            <p className="text-gray-500 mb-8 font-medium">Enter your vehicle plate number.</p>

            <input
              type="text"
              value={vehicleNumInput}
              onChange={(e) => setVehicleNumInput(e.target.value.toUpperCase())}
              placeholder="e.g. MH12AB1234"
              className={`w-full px-6 py-5 bg-gray-50 border-2 rounded-2xl outline-none focus:border-blue-500 text-xl font-black tracking-widest ${vehicleError ? 'border-red-300' : 'border-gray-100'}`}
            />
            {vehicleError && <p className="mt-3 text-sm font-bold text-red-500">{vehicleError}</p>}

            <div className="mt-10 flex gap-4">
              <button onClick={() => setShowVehicleModal(false)} className="flex-1 py-4 font-bold text-gray-400">Cancel</button>
              <button onClick={handleFinalBooking} className="flex-[2] bg-blue-600 text-white py-5 rounded-2xl font-black shadow-lg hover:bg-blue-700">Book Spot</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}