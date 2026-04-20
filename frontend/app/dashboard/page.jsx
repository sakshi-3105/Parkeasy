"use client";
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

export default function UserDashboard() {
  const [lots, setLots] = useState([]);
  const [bookings, setBookings] = useState([]); 
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showShadedOnly, setShowShadedOnly] = useState(false);

  // Path 2 States: Spot Selection Modal
  const [selectedLot, setSelectedLot] = useState(null); // The lot user clicked on
  const [lotSpots, setLotSpots] = useState([]); // The spots inside that lot
  const [isModalOpen, setIsModalOpen] = useState(false);

  const router = useRouter();

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

  const openBookingModal = async (lot) => {
    setSelectedLot(lot);
    setIsModalOpen(true);
    try {
      const response = await axios.get(`http://localhost:3001/api/user/lots/${lot.lot_id}/spots`);
      setLotSpots(response.data);
    } catch (err) {
      alert("Could not load spots for this lot.");
    }
  };

  const handleFinalBooking = async (spotId) => {
    const vehicleNum = prompt("Confirm Vehicle Number:");
    if (!vehicleNum) return;
  
    const user = JSON.parse(localStorage.getItem('user'));
  
    try {
      await axios.post('http://localhost:3001/api/user/book', {
        user_id: user.user_id,
        lot_id: selectedLot.lot_id,
        vehicle_num: vehicleNum,
        spot_id: spotId // Sending the specific spot chosen
      });
      
      alert("Booking confirmed!");
      setIsModalOpen(false);
      fetchLots();
      fetchUserBookings(user.user_id);
    } catch (err) {
      alert(err.response?.data?.error || "Booking failed");
    }
  };

  const handleCheckout = async (reserve_id) => {
    try {
      const billRes = await axios.put(`http://localhost:3001/api/user/checkout-calc/${reserve_id}`);
      const { total_amt } = billRes.data;
  
      const orderRes = await axios.post('http://localhost:3001/api/user/create-order', { 
        amount: total_amt 
      });
      
      if (!window.Razorpay) {
        alert("Razorpay SDK is still loading. Please wait a second and try again.");
        return;
      }
  
      const options = {
        key: "rzp_test_SeZ4TZZ9b1jBY8", 
        amount: orderRes.data.amount,    
        currency: "INR",
        name: "ParkEasy Pune",
        description: "Parking Session Checkout",
        order_id: orderRes.data.id,      
        handler: async function (response) {
          try {
            await axios.put(`http://localhost:3001/api/user/checkout-confirm/${reserve_id}`, {
              payment_id: response.razorpay_payment_id,
              amount: total_amt 
            });
            
            alert(`Payment Successful! Transaction ID: ${response.razorpay_payment_id}`);
            
            const user = JSON.parse(localStorage.getItem('user'));
            fetchLots();
            fetchUserBookings(user.user_id);
          } catch (err) {
            console.error("Confirmation Error:", err);
            alert("Payment was successful, but your session is still active in our system. Please contact the Admin.");
          }
        },
        prefill: {
          name: userName,
          email: JSON.parse(localStorage.getItem('user'))?.email || "",
        },
        theme: { 
          color: "#2563eb"
        },
        modal: {
          ondismiss: function() {
            console.log("Checkout modal closed by user");
          }
        }
      };
  
      const rzp = new window.Razorpay(options);
      
      rzp.on('payment.failed', function (response) {
        alert(`Payment Failed: ${response.error.description}`);
      });
  
      rzp.open();
      
    } catch (err) {
      console.error("Checkout Error:", err);
      alert(err.response?.data?.error || "Unable to initiate checkout. Please try again.");
    }
  };

  const filteredLots = lots.filter(lot => {
    const matchesSearch = lot.prime_loc.toLowerCase().includes(searchTerm.toLowerCase()) || lot.pincode.includes(searchTerm);
    return matchesSearch && (showShadedOnly ? lot.is_shaded : true);
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 pb-20 relative font-sans selection:bg-blue-600 selection:text-white transition-colors duration-300">
      {/* Decorative background blurs using same color tokens */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-300/20 blur-[120px] rounded-full pointer-events-none"></div>
      
      <nav className="bg-white/80 backdrop-blur-xl border-b border-gray-200 px-4 sm:px-8 py-4 flex justify-between items-center sticky top-0 z-40 transition-all shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3">
          <h1 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-800 tracking-tighter">PARKEASY</h1>
        </div>
        <div className="flex items-center gap-3 sm:gap-6">
          <span className="text-gray-600 font-medium hidden md:inline-block">Welcome back, <span className="font-bold text-gray-900">{userName}</span></span>
          <button onClick={() => { localStorage.clear(); router.push('/login'); }} className="text-xs sm:text-sm font-bold text-red-500 hover:text-white hover:bg-red-500 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-all border border-red-500/20 hover:border-red-500 hover:shadow-lg hover:shadow-red-500/20">
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 sm:p-8 relative z-10">
        {/* Active Bookings Section */}
        {bookings.length > 0 && (
          <section className="mb-10 sm:mb-14">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="w-2 h-6 bg-blue-500 rounded-full inline-block"></span>
              My Active Sessions
            </h2>
            <div className="grid gap-6">
              {bookings.map((booking) => (
                <div key={booking.reserve_id} className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-3xl sm:rounded-[2rem] p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden group shadow-xl shadow-blue-900/10 border border-blue-500/30">
                  <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover:scale-110 transition-transform duration-700"></div>
                  <div className="relative z-10 mb-6 md:mb-0 w-full md:w-auto">
                    <p className="text-blue-200 font-medium uppercase tracking-wider text-xs sm:text-sm mb-1 mt-0">Current Parking</p>
                    <h3 className="text-3xl sm:text-4xl font-extrabold mb-3 text-white">Spot #{booking.spot_id}</h3>
                    <div className="inline-flex items-center gap-2 bg-black/20 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 text-xs sm:text-sm font-medium text-white/90">
                      <span>Vehicle:</span> <span className="font-mono tracking-widest text-white">{booking.vehicle_num}</span>
                    </div>
                  </div>
                  <button onClick={() => handleCheckout(booking.reserve_id)} className="relative z-10 w-full md:w-auto bg-white text-blue-700 px-6 sm:px-10 py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg hover:shadow-lg hover:shadow-blue-900/20 hover:-translate-y-1 transition-all active:scale-95 text-center border-none">
                    Checkout & Pay
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8 sm:mb-10 bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-gray-200 sticky top-[70px] sm:top-[80px] z-30 shadow-sm">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <input type="text" placeholder="Search by location or pincode..." className="w-full pl-12 pr-4 py-3 sm:py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900 placeholder-gray-500 font-medium transition-all text-sm sm:text-base focus:bg-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex items-center bg-gray-50 px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer">
            <input type="checkbox" id="shaded-toggle-user" className="w-4 h-4 sm:w-5 sm:h-5 rounded border-gray-300 bg-white text-blue-600 focus:ring-blue-500 cursor-pointer" checked={showShadedOnly} onChange={(e) => setShowShadedOnly(e.target.checked)} />
            <label htmlFor="shaded-toggle-user" className="ml-2 sm:ml-3 text-xs sm:text-sm font-bold text-gray-700 cursor-pointer whitespace-nowrap">Indoor / Shaded</label>
          </div>
        </div>

        {/* Lots Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredLots.map((lot) => (
            <div key={lot.lot_id} className="group bg-white rounded-3xl sm:rounded-[2rem] p-5 sm:p-6 border border-gray-200 hover:shadow-xl hover:shadow-blue-900/5 hover:-translate-y-1 hover:border-blue-300 transition-all duration-300 flex flex-col justify-between cursor-pointer">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 text-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center mb-0 group-hover:bg-blue-100 group-hover:scale-110 transition-all border border-blue-100">
                     <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  </div>
                  <span className={`text-[8px] sm:text-[10px] px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-black tracking-wider border ${lot.is_shaded ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                    {lot.is_shaded ? 'SHADED' : 'OPEN'}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 leading-tight mb-1">{lot.prime_loc}</h3>
                <p className="text-gray-500 text-xs sm:text-sm mb-6 line-clamp-2 leading-relaxed">{lot.address}</p>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                <div>
                  <p className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5 mt-0">Rate</p>
                  <p className="font-extrabold text-lg sm:text-xl text-gray-900">₹{lot.price_per_hr}<span className="text-xs sm:text-sm font-medium text-gray-500">/hr</span></p>
                </div>
                <button
                  onClick={() => openBookingModal(lot)}
                  className="bg-white border border-gray-200 group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:text-white text-gray-700 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-bold transition-all text-sm sm:text-base group-hover:shadow-[0_4px_14px_0_rgba(37,99,235,0.39)]"
                >
                  Select Spot
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* --- SPOT SELECTION MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 transition-all">
          <div className="bg-white rounded-3xl sm:rounded-[2rem] p-5 sm:p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100">
            <div className="flex justify-between items-start sm:items-center mb-6 sm:mb-8 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">Select Spot</h2>
                <p className="text-gray-500 text-xs sm:text-sm mt-1">{selectedLot?.prime_loc}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setIsModalOpen(false); }} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-colors border border-gray-200">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
              {lotSpots.map((spot,index) => (
                <button
                  key={spot.spot_id}
                  disabled={spot.status === 'o'}
                  onClick={() => handleFinalBooking(spot.spot_id)}
                  className={`aspect-square rounded-xl sm:rounded-2xl flex flex-col items-center justify-center border transition-all transform active:scale-95 group ${
                    spot.status === 'a' 
                    ? 'border-green-200 bg-green-50/50 hover:bg-green-500 hover:border-green-600 hover:text-white hover:shadow-[0_4px_14px_0_rgba(34,197,94,0.39)] cursor-pointer' 
                    : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed opacity-60'
                  }`}
                >
                  <span className={`text-xs sm:text-sm font-black mb-1 mt-0 transition-colors ${spot.status === 'a' ? 'text-gray-700 group-hover:text-white' : 'text-gray-400'}`}>P-{index+1}</span>
                  <span className={`text-[8px] sm:text-[9px] uppercase font-bold px-1.5 sm:px-2 py-0.5 rounded-full mt-0 ${spot.status === 'a' ? 'bg-green-100 text-green-700 group-hover:bg-white/20 group-hover:text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {spot.status === 'a' ? 'Free' : 'Used'}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-100 flex justify-center gap-6 sm:gap-8 text-xs sm:text-sm font-medium text-gray-600">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-50 border border-green-200 rounded-md"></div> Available
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gray-50 border border-gray-200 rounded-md"></div> Occupied
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}