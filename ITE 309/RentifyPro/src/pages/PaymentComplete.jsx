import React, { useState, useEffect } from "react";
import { Bot, Bell, MessageCircle, Settings, Car, Check, ArrowLeftRight} from "lucide-react";

  const PaymentComplete = ({
    vehicle,
  bookingData,
  days,

  paymentOption,
  paymentMethod,
  payableNow,
  payableOnPickup,

  insuranceTotal,
  vehicleTotal,
  refundableDeposit,

  onNavigateToHome,
    onNavigateToSignIn,
    onNavigateToVehicles,
    onNavigateToRegister,
    onNavigateToAbout,
    onNavigateToBookingHistory,
    onNavigateToAccountSettings,
    onSwitchToOwner,
    
    isLoggedIn,
    user,
    onLogout,
  }) => {
    

  const [showAI, setShowAI] = useState(false);
  const [userMessage, setUserMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

   const [isVehicleOwner, setIsVehicleOwner] = useState(
             localStorage.getItem("isVehicleOwner") === "true"
           );
           
           // Sync when login state changes
           useEffect(() => {
             if (!isLoggedIn) {
               setIsVehicleOwner(false);
             } else {
               setIsVehicleOwner(localStorage.getItem("isVehicleOwner") === "true");
             }
           }, [isLoggedIn]);
           
           // Sync across tabs
           useEffect(() => {
             const syncOwnerStatus = () => {
               setIsVehicleOwner(
                 isLoggedIn && localStorage.getItem("isVehicleOwner") === "true"
               );
             };
           
             window.addEventListener("storage", syncOwnerStatus);
             return () => window.removeEventListener("storage", syncOwnerStatus);
           }, [isLoggedIn]);

  const {
  pickupDate,
  pickupTime,
  returnDate,
  returnTime,
} = bookingData;

// Format date → January 13, 2026
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Format time → 9:00 PM
const formatTime = (timeStr) => {
  if (!timeStr) return "";
  const [hour, minute] = timeStr.split(":");
  const d = new Date();
  d.setHours(hour, minute);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

if (!vehicle || !bookingData) {
  return (
    <div className="pt-40 text-center">
      <p className="text-gray-500">No payment data found.</p>
      <button
        onClick={onNavigateToHome}
        className="mt-4 px-4 py-2 bg-[#017FE6] text-white rounded"
      >
        Go Home
      </button>
    </div>
  );
}
  

  const getInitials = (firstName, lastName) => {
    if (!firstName || !lastName) return "";
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  useEffect(() => {
    if (!showAI) return;

    setMessages([
      {
        sender: "ai",
        text: "Hi! 👋 This is RentifyPro AI. How can I assist you today?"
      }
    ]);
  }, [showAI]);

  const [profilePhoto, setProfilePhoto] = useState(
    localStorage.getItem("profilePhoto") || null
  );
  
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePhoto(reader.result);
      localStorage.setItem("profilePhoto", reader.result);
    };
    reader.readAsDataURL(file);
  };
  
  const handleRemovePhoto = () => {
    setProfilePhoto(null);
    localStorage.removeItem("profilePhoto");
  };

  return (
    <div className="min-h-screen bg-white">

      {/* NAVBAR */}
      <nav className="bg-white shadow-sm fixed w-full top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">

          <button onClick={onNavigateToHome} 
          className="text-2xl font-bold hover:opacity-90 transition"> 
          Rentify<span className="text-[#017FE6]">Pro</span></button>

          <div className="hidden md:flex gap-8 relative left-12">

            <button onClick={onNavigateToHome} className="hover:text-[#017FE6]">Home</button>
            <button onClick={onNavigateToVehicles} className="hover:text-[#017FE6]">Vehicles</button>
            <button onClick={onNavigateToBookingHistory} className="hover:text-[#017FE6]">Booking History</button>
            <button onClick={onNavigateToAbout} className="hover:text-[#017FE6]">About</button>
            <a href="#contacts" className="hover:text-[#017FE6]">Contacts</a>
          </div>

          <div className="flex items-center gap-4">

            {/* SHOW ONLY WHEN LOGGED IN*/}
             {isLoggedIn && (
               <>
                 {/* REAL TIME CHAT */}
                 <button
                   aria-label="Chatroom"
                   className="
                     relative w-11 h-11
                     flex items-center justify-center
                     rounded-full
                     bg-gray-100
                     hover:bg-[#D6EBFF]
                     transition
                   "
                 >
                   <MessageCircle size={20} className="text-[#017FE6]" />
                   <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#017FE6] rounded-full" />
                 </button>
           
                 {/* NOTIFICATIONS */}
                 <button
                   aria-label="Notifications"
                   className="
                     relative w-11 h-11
                     flex items-center justify-center
                     rounded-full
                     bg-gray-100
                     hover:bg-[#D6EBFF]
                     transition
                   "
                 >
                   <Bell size={20} className="text-[#017FE6]" />
                   <span
                     className="
                       absolute -top-1 -right-1
                       bg-red-500 text-white
                       text-[10px]
                       min-w-[18px] h-[18px]
                       flex items-center justify-center
                       rounded-full font-semibold
                     "
                   >
                     3
                   </span>
                 </button>
               </>
             )}
           
           
             {/* CHATOTT */}
             <button
               onClick={() => setShowAI(true)}
               aria-label="AI Assistant"
               className="
                 relative w-11 h-11
                 flex items-center justify-center
                 rounded-full
                 bg-gray-100
                 hover:bg-[#D6EBFF]
                 transition
                 shadow-sm
               "
             >
               <Bot size={22} className="text-[#017FE6]" />
               <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
             </button>
           
             
           
             {/* CHATBOT PROFILE */}
             {!isLoggedIn ? (
               <>
                 <button
                   onClick={onNavigateToSignIn}
                   className="hover:text-[#017FE6]"
                 >
                   Sign In
                 </button>
           
                 <button
                   onClick={onNavigateToRegister}
                   className="bg-[#017FE6] text-white px-5 py-2 rounded-full hover:bg-[#0165B8]"
                 >
                   Register
                 </button>
               </>
             ) : (
               <div className="relative">
             <button
               onClick={() => setShowProfileMenu(!showProfileMenu)}
               className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full hover:bg-gray-200 transition"
             >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-[#017FE6] flex items-center justify-center">
            {profilePhoto ? (
                <img
                src={profilePhoto}
                alt="Profile"
                className="w-full h-full object-cover"
                />
            ) : (
                <span className="text-white text-sm font-bold">
                {user?.initials}
                </span>
            )}
            </div>

               <span className="text-sm font-medium">
                 {user?.name}
               </span>
             </button>
           
              {/* PROFILE DROPDOWN */}
                 {showProfileMenu && (
                   <div className="absolute right-0 mt-3 w-72 bg-white rounded-xl shadow-2xl z-50">
                     <div className="px-4 py-4 border-b">
                       <p className="font-semibold">{user?.name}</p>
                       <p className="text-sm text-gray-400">{user?.email}</p>
                     </div>
             
                     <button onClick={() => {
                        setShowProfileMenu(false);
                        onNavigateToAccountSettings();}}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#017FE6]/10 transition">
                        <Settings size={18} />  Account Settings
                      </button>
             
                     <button onClick={onNavigateToBookingHistory}
                       className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#017FE6]/10 transition"
                     >
                       <Car size={18} /> My Bookings
                     </button>

                      {isVehicleOwner && (
                       <button
                         onClick={() => {
                         localStorage.setItem("activeRole", "owner");
                         setShowProfileMenu(false);
                           onSwitchToOwner();}}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#017FE6]/10 transition border-t">
                          <ArrowLeftRight size={18} className="text-[#017FE6]" />
                          <span className="text-[#017FE6] font-medium">
                           Switch to Owner
                          </span>
                        </button>
                      )}
             
                     <button onClick={onLogout} 
                     className="w-full px-4 py-3 text-red-500 hover:bg-red-50"> ⎋ Sign Out 
                     </button>
           
               </div>
             )}
           </div>
             )}
           
           </div>
           
                   </div>
      </nav>

      {/* MAIN CONTENT */}
<div className="pt-24 px-6 pb-16 flex justify-center">
  <div className="w-full max-w-5xl">

    {/* SUCCESS HEADER */}
    <div className="flex flex-col items-center text-center mb-10">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
        <svg
          className="w-10 h-10 text-green-600"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="text-3xl font-bold text-green-600">
        Payment Successful
      </h1>
      <p className="text-gray-500 mt-2">
        Your Booking has been successfully <span className="font-semibold">Confirmed</span>
      </p>
    </div>

    {/* CONTENT GRID */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-7">

      {/* BOOKING DETAILS */}
      <div className="md:col-span-2 bg-white rounded-xl shadow p-9">
        <div className="flex justify-between items-center mb-4">
          <span className="bg-gray-200 text-sm px-4 py-1 rounded-full font-medium">
            Booking Details
          </span>
          <span className="text-sm text-gray-500 font-semibold">
            BKID-2026
          </span>
        </div>

        <div className="flex gap-5">
          <img
            src={vehicle?.image || "/car-placeholder.png"}
            alt={vehicle?.name}
            className="w-48 h-auto object-contain"
          />

          <div className="flex-1">
            <h2 className="text-xl font-bold">{vehicle?.name}</h2>
            <p className="text-gray-500 text-sm mb-4">
            {vehicle?.brand} • {vehicle?.category}
            </p>
            <div className="space-y-1 text-sm text-gray-600">
              <p className="text-gray-500">
            <span className="font-medium text-gray-700">Pickup:</span>{" "}
            {formatDate(pickupDate)} | {formatTime(pickupTime)}
            </p>

              <p className="text-gray-500">
                <span className="font-medium text-gray-700">Return:</span>{" "}
                {formatDate(returnDate)} | {formatTime(returnTime)}
             </p>
            </div>
          </div>
        </div>

        <div className="border-t mt-5 pt-4 flex justify-between items-start">
  <div>
    <p className="text-l text-[#017FE6] font-medium">Amount Paid</p>

    {paymentOption === "downpayment" && (
      <p className="text-xs text-gray-400 mt-1">
        • Refundable Deposit of ₱{refundableDeposit?.toLocaleString()} will be
        collected upon vehicle pickup
      </p>
    )}
  </div>

  <div className="text-xl font-bold text-[#017FE6]">
    ₱{payableNow?.toLocaleString()}
  </div>
</div>
      </div>

      {/* PAYMENT SUMMARY */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="font-semibold mb-4">Payment Summary</h3>

        <div className="flex items-center gap-2 mb-5">
          <img
            src={
                paymentMethod === "gcash"
                ? "/gcash.png"
                : paymentMethod === "paymaya"
                ? "/paymaya.png"
                : "/card.png"
            }
            className="h-6"
            />

            <span className="font-medium capitalize">
            {paymentMethod}
            </span>
        </div>

        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Paid Via:</span>
            <span className="font-medium">PMYNT ID-2026</span>
          </div>

          <div className="flex justify-between">
            <span>Date:</span>
            <span className="font-medium">
              January 12, 2026 | 10:30 pm
            </span>
          </div>
        </div>

        <button
          onClick={onNavigateToBookingHistory}
          className="mt-6 w-full bg-[#017FE6] text-white py-3 rounded-lg hover:bg-[#0165B8] transition"
        >
          Booking History
        </button>

        <button
          onClick={onNavigateToHome}
          className="mt-3 w-full border py-3 rounded-lg hover:bg-gray-50 transition"
        >
          Back to Home
        </button>
      </div>
    </div>

    {/* PENDING APPROVAL */}
    <div className="mt-6 bg-green-100 border border-green-200 rounded-lg px-6 py-4 text-sm text-green-700 flex items-center gap-3">
      <Check size={18} className="text-green-600 flex-shrink-0" />
      <span>
        <strong>Pending Approval:</strong> Your booking has been successfully submitted and is currently under review.
         You will be notified once approval is completed.
      </span>
    </div>

  </div>
</div>

        {showAI && (
    <div className="
      fixed bottom-4 right-4
      w-[95vw] sm:w-[400px]
      h-[70vh] sm:h-[450px]
      bg-white rounded-2xl shadow-2xl
      z-50 overflow-hidden
      flex flex-col
    ">

    {/* HEADER */}
    <div className="bg-[#017FE6] text-white px-4 py-3 flex justify-between items-center">
      <div>
        <h3 className="font-semibold text-sm">RentifyPro AI</h3>
        <p className="text-xs opacity-80">Online • Ready to help</p>
      </div>
      <button onClick={() => setShowAI(false)}>✕</button>
    </div>

    {/* BODY NG AI */}
    <div className="p-4 flex-1 overflow-y-auto bg-gray-50 space-y-4">


      {messages.map((msg, index) => (
        <div
          key={index}
          className={`flex items-end gap-2 ${
            msg.sender === "user" ? "justify-end" : "justify-start"
          }`}
        >
          {msg.sender === "ai" && (
            <img src="/robot-ai.png" className="w-8 h-8 rounded-full" />
          )}

          <div
            className={`px-4 py-2 rounded-2xl text-sm max-w-[75%] shadow ${
              msg.sender === "user"
                ? "bg-[#017FE6] text-white rounded-br-sm"
                : "bg-white text-gray-800 rounded-bl-sm"
            }`}
          >
            {msg.text}
          </div>

          {msg.sender === "user" && (
            <div className="w-8 h-8 rounded-full bg-[#017FE6] text-white flex items-center justify-center text-xs">
              U
            </div>
          )}
        </div>
      ))}

      {isTyping && (
        <div className="flex items-center gap-2">
          <img src="/robot-ai.png" className="w-8 h-8 rounded-full" />
          <div className="bg-white px-4 py-2 rounded-2xl shadow text-sm text-gray-500 flex gap-1">
            <span className="animate-bounce">.</span>
            <span className="animate-bounce delay-150">.</span>
            <span className="animate-bounce delay-300">.</span>
          </div>
        </div>
      )}
    </div>

    {/* INPUT MESSAGE AI */}
    <div className="border-t bg-white px-3 py-2 flex items-center gap-2">
      <input
        value={userMessage}
        onChange={(e) => setUserMessage(e.target.value)}
        placeholder="Ask me about vehicles, bookings..."
        className="flex-1 border rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-[#017FE6]"
      />

      <button
        onClick={() => {
          if (!userMessage.trim()) return;

          setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
          setUserMessage("");
          setIsTyping(true);

          setTimeout(() => {
            setMessages((prev) => [
              ...prev,
              { sender: "ai", text: "Got it! 😊 Let me help you with that." }
            ]);
            setIsTyping(false);
          }, 1200);
        }}
        className="bg-[#017FE6] text-white w-9 h-9 rounded-full"
      >
        ➤
      </button>
    </div>
  </div>
      )}
    </div>
  );
};

export default PaymentComplete;
