import React, { useState, useEffect } from "react";
import {
  Bot,
  Bell,
  MessageCircle,
  Settings,
  Car,
  ShieldCheck,
  User,
  LogOut,
  CreditCard,
  Lock,
  Wallet,
  ArrowLeftRight 
} from "lucide-react";

const PaymentPage = ({
  vehicle,
  bookingData,
  days,

  payableNow,
  payableOnPickup,
  insuranceTotal,
  vehicleTotal,
  refundableDeposit,
  paymentOption,

  onPay,
  onBack,
  onSwitchToOwner,

  onNavigateToHome,
  onNavigateToVehicles,
  onNavigateToAbout,
  onNavigateToBookingHistory,
  onNavigateToAccountSettings,

  isLoggedIn,
  user,
  onLogout,
}) => {

  const [paymentMethod, setPaymentMethod] = useState(null);

  const isDownpayment = paymentOption === "downpayment";

const pickupAmount = isDownpayment ? refundableDeposit : 0;

const [cardDetails, setCardDetails] = useState({
  number: "",
  expiry: "",
  cvc: "",
  name: "",
});

const isCardInvalid =
  paymentMethod === "card" &&
  (!cardDetails.number ||
    !cardDetails.expiry ||
    !cardDetails.cvc ||
    !cardDetails.name);
    

  const {
    pickupDate,
    pickupTime,
    returnDate,
    returnTime,
    insuranceType,
  } = bookingData;

  const INSURANCE_LABELS = {
  basic: {
    label: "Basic Coverage",
    desc: "Free",
    color: "text-green-600",
  },
  standard: {
    label: "Standard Coverage",
    desc: "Collision & Theft",
    color: "text-blue-600",
  },
  premium: {
    label: "Premium Coverage",
    desc: "Full Coverage + PA + Roadside",
    color: "text-purple-600",
  },
};

const insuranceInfo = INSURANCE_LABELS[insuranceType] || INSURANCE_LABELS.basic;

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
  

  // Format date to: January 13, 2026
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Format time to: 9:00 pm
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

      {/* PAGE CONTENT */}
<div className="pt-24 pb-16 bg-gray-50">
  <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-8">

    {/* LEFT — BOOKING SUMMARY */}
    <div className="space-y-6">

      <h2 className="text-xl font-semibold">Booking Summary</h2>

      {/* VEHICLE CARD */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex gap-5">
          <img
            src={vehicle?.image || "/car-placeholder.png"}
            alt={vehicle?.name}
            className="w-48 h-30 object-cover rounded-xl"
          />

          <div>
            <h3 className="font-semibold text-xl">{vehicle?.name}</h3>
            <p className="text-l text-gray-500">
              {vehicle?.category}
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3 text-sm">
          <p className="text-gray-500">
          <span className="font-medium text-gray-700">Pickup:</span>{" "}
          {formatDate(pickupDate)} | {formatTime(pickupTime)}
        </p>

        <p className="text-gray-500">
          <span className="font-medium text-gray-700">Return:</span>{" "}
          {formatDate(returnDate)} | {formatTime(returnTime)}
        </p>

          <div className={`flex items-center gap-2 ${insuranceInfo.color}`}>
            <ShieldCheck size={16} />
            <span>
              {insuranceInfo.label}
              {insuranceType === "basic"
                ? " (Free)"
                : ` (₱${(insuranceTotal / days).toLocaleString()} / day)`}
            </span>
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center border-t pt-4">
          <span className="font-medium">Total Price:</span>
          <span className="text-[#017FE6] font-semibold text-lg">
            ₱{(vehicleTotal + insuranceTotal).toLocaleString()}
          </span>
        </div>
      </div>

      {/* PAYMENT BREAKDOWN */}
      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="font-semibold mb-4">Payment Breakdown</h3>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Vehicle Rental</span>
            <span>₱{vehicleTotal.toLocaleString()}</span>
          </div>

          <div className="flex justify-between">
          <span className="text-gray-500">
            Insurance ({insuranceInfo.label})
          </span>
          <span>₱{insuranceTotal.toLocaleString()}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">Refundable Deposit</span>
          <span>₱{refundableDeposit.toLocaleString()}</span>
        </div>
      </div>

        <div className="mt-4 border-t pt-4 flex justify-between items-center text-[#017FE6]">
          <span className="font-semibold">
            {paymentOption === "downpayment"
              ? "Downpayment (Pay Now)"
              : "Full Payment (Pay Now)"}
          </span>

          <span className="text-[#017FE6] font-semibold text-lg">
            ₱{payableNow.toLocaleString()}
          </span>
        </div>

          {isDownpayment && (
  <div className="flex justify-between text-sm text-gray-600 mt-2">
    <span>Refundable Deposit (Pay on Pickup)</span>
    <span>₱{refundableDeposit.toLocaleString()}</span>
  </div>
)}
        </div>
      </div>

    {/* RIGHT — PAYMENT METHOD */}
<div className="space-y-6 lg:mt-[42px]">

  <div className="bg-white rounded-xl shadow p-5 space-y-6">
        <p className="text-sm font-semibold text-gray-700">
          Choose Online Method
        </p>

        <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="radio"
          name="method"
          checked={paymentMethod === "gcash"}
          onChange={() => setPaymentMethod("gcash")}
        />
        <img
          src="/gcash.png"
          alt="GCash"
          className="w-6 h-6 object-contain"
        />
        <span className="font-medium">GCash</span>
      </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="radio"
            name="method"
            checked={paymentMethod === "paymaya"}
            onChange={() => setPaymentMethod("paymaya")}
          />
          <img
            src="/paymaya.png"
            alt="PayMaya"
            className="w-6 h-6 object-contain"
          />
          <span className="font-medium">PayMaya</span>
        </label>

       <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="radio"
          name="method"
          checked={paymentMethod === "card"}
          onChange={() => setPaymentMethod("card")}
        />
        <CreditCard size={20} className="text-gray-700" />
        <span className="font-medium">Credit / Debit Card</span>
      </label>

        {paymentMethod === "card" && (
        <div className="mt-4 space-y-4">
          
          {/* CARD NUMBER */}
          <div>
            <label className="text-sm text-gray-600">Card Number</label>
            <input
              type="text"
              placeholder="1234 5678 9012 3456"
              value={cardDetails.number}
              onChange={(e) =>
                setCardDetails({ ...cardDetails, number: e.target.value })
              }
              className="w-full mt-1 border rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#017FE6]"
            />
          </div>

          {/* EXPIRY + CVC */}
          <div className="flex gap-4">
            <div className="w-1/2">
              <label className="text-sm text-gray-600">MM / YY</label>
              <input
                type="text"
                placeholder="MM / YY"
                value={cardDetails.expiry}
                onChange={(e) =>
                  setCardDetails({ ...cardDetails, expiry: e.target.value })
                }
                className="w-full mt-1 border rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#017FE6]"
              />
            </div>

            <div className="w-1/2 relative">
              <label className="text-sm text-gray-600">CVC</label>
              <input
                type="text"
                placeholder="CVC"
                value={cardDetails.cvc}
                onChange={(e) =>
                  setCardDetails({ ...cardDetails, cvc: e.target.value })
                }
                className="w-full mt-1 border rounded-xl px-4 py-3 pr-10 focus:ring-2 focus:ring-[#017FE6]"
              />
              <CreditCard
                size={18}
                className="absolute right-3 top-[42px] text-gray-400"
              />
            </div>
          </div>

          {/* CARDHOLDER NAME */}
          <div>
            <label className="text-sm text-gray-600">Cardholder Name</label>
            <input
              type="text"
              placeholder="Full Name"
              value={cardDetails.name}
              onChange={(e) =>
                setCardDetails({ ...cardDetails, name: e.target.value })
              }
              className="w-full mt-1 border rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#017FE6]"
            />
          </div>
        </div>
      )}
          
        {/* BACK BUTTON */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* BACK BUTTON */}
        <button
          onClick={onBack}
          className="w-full border border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-100"
        >
          ← Back
        </button>

        {/* PAY / CONFIRM BUTTON */}
        <button
        disabled={!paymentMethod || isCardInvalid}
        onClick={() =>
          onPay({
            vehicle,
            bookingData,
            days,
            insuranceTotal,
            vehicleTotal,
            refundableDeposit,
            paymentOption,                // "downpayment" | "fullpayment"
            paymentMethod,                // gcash | paymaya | card
            payableNow,                   // online paid amount
            payableOnPickup: pickupAmount // deposit if downpayment
          })
        }
        className={`w-full py-3 rounded-xl text-lg font-semibold transition ${
          !paymentMethod || isCardInvalid
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-[#017FE6] hover:bg-[#0165B8] text-white"
        }`}
      >
        Pay ₱{payableNow.toLocaleString()}
      </button>
      </div>

      </div>
      <p className="text-sm text-gray-500 flex items-center justify-center gap-2 mt-2">
        <Lock size={14} className="text-[#017FE6]" />
        <span>
          Secure payment powered by
          <span className="font-medium text-[#017FE6]"> RentifyPro</span>
        </span>
      </p>
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

export default PaymentPage;
