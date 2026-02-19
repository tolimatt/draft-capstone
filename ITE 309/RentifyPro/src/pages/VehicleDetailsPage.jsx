import React, { useState, useEffect } from "react";
import { Bot, Users, Settings, Fuel, Car, Wallet, Receipt, Camera, Bell, MessageCircle, BadgeCheck } from "lucide-react";
import VehicleOwnerProfilePage from "./VehicleOwnerProfilePage";

const VehicleDetailsPage = ({
vehicle,
  bookingData,
  setBookingData,
  onBack,
  onNavigateToHome,
  onNavigateToSignIn,
  onNavigateToRegister,
  onNavigateToBookingHistory,
  onNavigateToAbout,
  onNavigateToAccountSettings,
  isLoggedIn,
  user,
  onLogout,
}) => {

    const { pickupDate, pickupTime, returnDate, returnTime } = bookingData;
    const [showAI, setShowAI] = useState(false);
    const [userMessage, setUserMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showReviewsModal, setShowReviewsModal] = useState(false);
    const [sortOption, setSortOption] = useState("recent");


      useEffect(() => {
          if (showAI) {
            setMessages([
              {
                sender: "ai",
                text: "Hi! 👋 This is RentifyPro AI. How can I assist you today?"
              }
            ]);
          }
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

            const [selectedOwner, setSelectedOwner] = useState(null);
            const [page, setPage] = useState("vehicleDetails");

            const onNavigateToOwnerProfile = (owner) => {
              setSelectedOwner(owner);
              setPage("ownerProfile");
            };

        

    const dailyRate = vehicle?.price || 0;

    const [interiorImages] = useState([
      { src: "/interior-1.jpg", label: "Leather Seats" },
      { src: "/interior-2.jpg", label: "Touchscreen Display" },
      { src: "/interior-3.jpg", label: "Back Seat" },
      { src: "/interior-4.png", label: "USB Charging Port" },
    ]);

      // combine date + time → Date object
      const getDateTime = (date, time) => new Date(`${date}T${time}`);

      // calculate duration in days (minimum 1 day)
        const calculateDays = () => {
        const start = getDateTime(pickupDate, pickupTime);
        const end = getDateTime(returnDate, returnTime);

        if (end <= start) return 1;

        const diffMs = end - start;
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return diffDays;
      };

          const durationDays = calculateDays();
          const totalPrice = durationDays * dailyRate;
          const DOWNPAYMENT_RATE = 0.30;
          const downpaymentFee = Math.round(dailyRate * DOWNPAYMENT_RATE);

          const reviews = [
        {
          id: 1,
          name: "John Doe",
          avatar: "/owner-profile.png",
          rating: 1,
          comment: "Very Comfortable, Amazing!",
          date: "2026-01-03",
        },
        {
          id: 2,
          name: "John Doe",
          avatar: "/owner-profile.png",
          rating: 5,
          comment: "Very Comfortable, Amazing!",
          date: "2026-01-03",
        },
        {
          id: 3,
          name: "John Doe",
          avatar: "/owner-profile.png",
          rating: 2,
          comment: "Very Comfortable, Amazing!",
          date: "2026-01-03",
        },
      ];

      const totalReviews = reviews.length;

      const averageRating =
        totalReviews > 0
          ? (
              reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
            ).toFixed(1)
          : "0.0";

          const processedReviews = (() => {
        if (sortOption === "highest") {
          const maxRating = Math.max(...reviews.map(r => r.rating));
          return reviews.filter(r => r.rating === maxRating);
        }

        if (sortOption === "lowest") {
          const minRating = Math.min(...reviews.map(r => r.rating));
          return reviews.filter(r => r.rating === minRating);
        }

        // Most Recent (default)
        return [...reviews].sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        );
      })();

      if (page === "ownerProfile") {
  return (
    <VehicleOwnerProfilePage
      owner={selectedOwner}
      onBack={() => setPage("vehicleDetails")}
    />
  );
}



  return (
    <div className="min-h-screen bg-gray-50">

      {/* NAVBAR */}
<nav className="bg-white shadow-sm fixed w-full top-0 z-50">
  <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">

    {/* LOGO */}
    <button
      onClick={onNavigateToHome}
      className="text-2xl font-bold hover:opacity-90 transition"
    >
      Rentify<span className="text-[#017FE6]">Pro</span>
    </button>

    {/* NAV LINKS */}
    <div className="hidden md:flex gap-8 relative left-12">
      <button
        onClick={onNavigateToHome}
        className="hover:text-[#017FE6] border-b-2 border-transparent hover:border-[#017FE6]"> Home </button>
        <span className="text-[#017FE6] border-b-2 border-[#017FE6]"> Vehicles </span>
        <a href="#history" className="hover:text-[#017FE6] border-b-2 border-transparent hover:border-[#017FE6]" > Booking History</a>
      <button onClick={onNavigateToAbout} className="hover:text-[#017FE6] border-b-2 border-transparent hover:border-[#017FE6]"> About </button>
      <a href="#contacts" className="hover:text-[#017FE6] border-b-2 border-transparent hover:border-[#017FE6]"> Contacts </a>
    </div>

    <div className="flex items-center gap-4">

                {/* IF THE LOGIN SUCCESS */}
      {isLoggedIn && (
        <>
          {/* MESSENGER*/}
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
    
    
      {/* AI*/}
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
          shadow-sm">

        <Bot size={22} className="text-[#017FE6]" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" 
        />

      </button>
    
      
    
     {/* AUTH*/}
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

          <span className="text-sm font-medium">{user?.name}</span>
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

            <button
              onClick={onNavigateToBookingHistory}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#017FE6]/10 transition">
              <Car size={18} /> My Bookings
            </button>
    
            <button
              onClick={onLogout}
              className="w-full px-4 py-3 text-red-500 hover:bg-red-50">
              ⎋ Sign Out
            </button>
            </div>
          )}
        </div>
      )}
    </div> 
  </div>
</nav>
      {/* CONTENT */}
      <div className="pt-24 max-w-[1320px] mx-auto px-8 pb-24">

        <button
          onClick={onBack}
          className="mb-6 text-sm font-medium text-gray-500 hover:text-[#017FE6]">
          ← Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1.3fr] gap-12">

          {/* LEFT */}
          <div className="space-y-6">

            {/* VEHICLE CARD */}
            <div className="bg-white rounded-xl border p-6">
                  <img
                    src={vehicle.image}
                    alt={vehicle.name}
                    className="w-full h-64 object-contain mb-6"
                    onError={(e) => {
                        e.currentTarget.src = "/bmw-x5.png";
                    }}
                  />

                  <h2 className="text-2xl font-bold">{vehicle.name}</h2>
                  <p className="text-sm text-gray-500 mb-3">{vehicle.category}</p>

                <div className="flex items-center justify-between mt-4">
                  
                  {/* RATING */}
                  <div className="flex items-center gap-2">
                  <span className="text-yellow-400 text-lg">★</span>

                  <span className="font-semibold text-lg">
                    {averageRating}
                  </span>

                  <span className="text-gray-400 text-sm">
                    ({totalReviews} {totalReviews === 1 ? "review" : "reviews"})
                  </span>
                </div>

                 
                 {/* PRICE */}
                  <div className="text-2xl font-extrabold text-[#017FE6]">
                    ₱{dailyRate.toLocaleString()}
                    <span className="ml-1 text-sm font-normal text-gray-500">/ day</span>
                  </div>
                </div>
               </div>

               {/* VEHICLE OWNER */}
                <div
                  onClick={() => {
                  if (!isLoggedIn) {
                    onNavigateToSignIn();
                    return;
                  }
                  if (!vehicle?.owner) return;
                  onNavigateToOwnerProfile(vehicle.owner);
                }}

                  className="bg-white rounded-xl border p-6 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition"
                >
                  {/* AVATAR */}
                  <img
                    src={vehicle.owner?.avatar || "/owner-profile.png"}
                    alt={vehicle.owner?.name}
                    className="w-16 h-16 rounded-full object-cover border"
                  />

                  {/* INFO */}
                <div className="flex-1">
                   {/* LISTED BY LABEL */}
                    <p className="text-sm text-gray-400 mb-1">
                      Listed by:
                    </p>

                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-lg">
                      {vehicle.owner?.name || "Vehicle Owner"}
                    </h4>

                    {/* VERIFIED BADGE */}
                    {vehicle.owner?.verified && (
                    <BadgeCheck
                      size={20}
                      className="text-[#017FE6]"
                      title="Verified Vehicle Owner"
                    />
                  )}

                  </div>

                  <p className="text-sm text-[#017FE6]">
                    Verified Vehicle Owner
                  </p>

                  {/* STATS */}
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                     <span className="flex items-center gap-1 font-semibold text-gray-800">
                    <span className="text-yellow-400 text-base">★</span>
                      {vehicle.owner?.rating || "4.8"}
                    </span> {vehicle.owner?.rentals || 204} Rentals
                    <span>{vehicle.owner?.vehicles || 40} Vehicles</span>
                  </div>
                </div>
                </div>

               
               {/* INTERIOR */}
                <div className="bg-white rounded-2xl border p-7">
                  <h3 className="font-bold text-base mb-5 flex items-center gap-2">
                    <span className="bg-[#ADD8E6] text-[#017FE6] p-2.5 rounded-lg">
                      <Camera size={18} />
                    </span>
                      Interior Views
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {interiorImages.map((item, index) => (
                      <div
                          key={index}
                          className="relative rounded-2xl overflow-hidden shadow-sm group">

                        <div className="w-full h-56">
                            <img
                                src={item.src}
                                alt={item.label}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                         </div>


                          {/* LABEL OVERLAY */}
                          <div className="absolute bottom-3 left-3 bg-black/55 text-white text-sm px-3 py-1.5 rounded-lg">
                            {item.label}
                          </div>
                        </div>
                    ))}
                  </div>
                </div>
              </div>
          {/* RIGHT */}
          <div className="space-y-7 lg:sticky lg:top-24 self-start">

           {/* SPECIFICATIONS */}
            <div className="bg-white rounded-2xl shadow-sm p-7">
            <h3 className="text-lg font-bold mb-6">Specifications</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                
              {/* PASSENRGER */}
              <div className="flex items-center gap-4 bg-gray-100 rounded-xl p-4">
                <div className="bg-[#89CFF0] text-[#017FE6] p-3 rounded-xl">
                    <Users size={22} />
                    </div>

                <div>
                    <p className="text-sm text-gray-500">Seats</p>
                    <p className="font-semibold text-base">{vehicle.seats} Passengers</p>
                </div>
                
              </div>
              {/* TR */}
              <div className="flex items-center gap-4 bg-gray-100 rounded-xl p-4">
                <div className="bg-[#89CFF0] text-[#017FE6] p-3 rounded-xl">
                    <Settings size={22} />
                </div>
                <div>
                    <p className="text-sm text-gray-500">Transmission</p>
                    <p className="font-semibold text-base">{vehicle.transmission}</p>
                </div>
              </div>

                {/* GAS */}
                <div className="flex items-center gap-4 bg-gray-100 rounded-xl p-4">
                    <div className="bg-[#89CFF0] text-[#017FE6] p-3 rounded-xl">
                        <Fuel size={22} />
                    </div>
                <div>
                    <p className="text-sm text-gray-500">Fuel Type</p>
                    <p className="font-semibold text-base">{vehicle.fuel}</p>
                 </div>
                 </div>

                {/* Car Type */}
                <div className="flex items-center gap-4 bg-gray-100 rounded-xl p-4">
                  <div className="bg-[#89CFF0] text-[#017FE6] p-3 rounded-xl">
                    <Car size={22} />
                 </div>
                    <div>
                      <p className="text-sm text-gray-500">Car Type</p>
                      <p className="font-semibold text-base">{vehicle.subType}</p>
                   </div>
                </div>
            </div>
          </div>


            {/* DEPOSIT & FEES */}
                <div className="bg-white rounded-2xl shadow-sm p-7">
                <h3 className="text-lg font-bold mb-6">Deposit & Fees</h3>

                {/* DEPOSIT */}
                <div className="flex justify-between items-center bg-gray-100 rounded-xl px-5 py-4 mb-4">
                    <div className="flex items-center gap-3">

                    <Wallet size={18} className="text-gray-600" />
                    <span className="font-medium">Refundable Deposit</span>
                    </div>
                    <span className="font-bold text-[#017FE6]">₱3,000</span>
                </div>

                    {/* DOWNPAYMENT */}
                    <div className="flex justify-between items-center bg-gray-100 rounded-xl px-5 py-4 mb-6">
                        <div className="flex items-center gap-3">
                        <Receipt size={18} className="text-gray-600" />
                        <span className="font-medium">Downpayment (30%)</span>
                        </div>
                        <span className="font-bold text-[#017FE6]">₱{downpaymentFee.toLocaleString()}</span>

                    </div>

                    {/* NOTE */}
                    <ul className="text-sm text-gray-600 space-y-2 leading-relaxed">
                        <li>
                          • <strong>Security Deposit:</strong>
                              Refunded within 3–5 business days after
                              vehicle return, subject to <span className="text-[#017FE6] font-medium">no damage</span> and
                              <span className="text-[#017FE6] font-medium"> on-time return</span>.
                            </li>
                        <li>

                          • <strong>Downpayment Fee:</strong> Non-refundable if cancellation is made
                             <span className="text-[#017FE6] font-medium"> less than 24 hours before the scheduled pickup date and time</span> 
                            </li>
                        <li>

                          • 50% refundable if cancellation is made
                            <span className="text-[#017FE6] font-medium"> 24 hours or more before the scheduled pickup date and time</span> 
                        </li>
                    </ul>
                  </div>

                  {/* REVIEWS */}
                  <div className="bg-white rounded-2xl shadow-sm p-7">
                    <h3 className="text-lg font-bold mb-5 flex items-center gap-2">
                      <span className="text-yellow-400 text-lg">★</span>
                      Reviews
                    </h3>

                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <div
                          key={review.id}
                          className="flex items-start gap-4 border rounded-xl p-4"
                        >
                          <img
                            src={review.avatar}
                            alt={review.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />

                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold">{review.name}</p>
                                  <div className="flex text-yellow-400 text-xs">
                                    {"★".repeat(review.rating)}
                                  </div>
                                </div>

                                <span className="text-xs text-gray-400">
                                  {review.date}
                                </span>
                          </div>

                            <p className="text-sm text-gray-700">{review.comment}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              Booked {vehicle.name}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => setShowReviewsModal(true)}
                      className="mt-5 w-full bg-[#D6EBFF] text-[#017FE6] py-3 rounded-xl font-semibold hover:bg-[#c5e2ff]"
                    >
                      View all reviews
                    </button>
                  </div>

                 {/* BOOKING */}
                <div className="bg-white rounded-2xl border shadow-sm p-7">
                  <h3 className="text-lg font-bold mb-6">Book This Vehicle</h3>

                  {/* PICKUP */}
                  <div className="mb-6">
                    <label className="text-sm font-medium text-gray-600 block mb-3">
                      Pickup Date & Time
                    </label>

                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="date"
                        value={pickupDate}
                        onChange={(e) => setBookingData({ ...bookingData, pickupDate: e.target.value })}
                        className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#017FE6]"
                      />

                      <input
                        type="time"
                        value={pickupTime}
                        onChange={(e) => setBookingData({ ...bookingData, pickupTime: e.target.value })}
                        className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#017FE6]"
                      />
                    </div>
                  </div>

                  {/* RETURN */}
                  <div className="mb-6">
                    <label className="text-sm font-medium text-gray-600 block mb-3">
                      Return Date & Time
                    </label>

                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="date"
                        value={returnDate}
                        min={pickupDate}
                        onChange={(e) => setBookingData({ ...bookingData, returnDate: e.target.value })}
                        className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#017FE6]"
                      />

                      <input
                        type="time"
                        value={returnTime}
                        onChange={(e) => setBookingData({ ...bookingData, returnTime: e.target.value })}
                        className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#017FE6]"
                      />
                    </div>
                </div>

            {/* SUMMARY */}
            <div className="border-t pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Daily Rate</span>
                <span>₱{dailyRate.toLocaleString()}</span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Duration</span>
                <span>{durationDays} {durationDays > 1 ? "days" : "day"}</span>
              </div>
            </div>

            {/* TOTAL */}
            <div className="flex justify-between items-center mt-4">
              <span className="text-lg font-semibold">Estimated Total</span>
              <span className="text-2xl font-extrabold text-[#017FE6]">
                ₱{totalPrice.toLocaleString()}
              </span>
            </div>

            {/* CTA */}
            <button
            onClick={() => {
              // TEMP: redirect to Sign In first
              onNavigateToSignIn();
            }}
            className="mt-6 w-full bg-[#017FE6] hover:bg-[#0165B8] text-white py-4 rounded-xl text-base font-semibold"
          >
            Continue to Booking
          </button>

          </div>
        </div>
      </div>
    </div>

        {/* FOOTER */}
        <footer className="bg-[#017FE6] text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* BRAND */}
        <div>
            <h3 className="text-2xl font-bold mb-4">
            RentifyPro
            </h3>
            <p className="text-blue-100">
            Your trusted partner for vehicle rentals in the Philippines
            </p>
        </div>

        {/* QUICK LINKS */}
        <div>
            <h4 className="font-bold mb-4">Quick Links</h4>
            <ul className="space-y-3">
            <li>
                <button
                onClick={onNavigateToHome}
                className="text-blue-100 hover:text-white transition"
                >
                Home
                </button>
            </li>

            <li>
                <span className="text-white font-semibold cursor-default">
                Vehicles
                </span>
            </li>

            <li>
                <a href="#" className="text-blue-100 hover:text-white transition">
                Booking History
                </a>
            </li>

            <li>
                <a href="#" className="text-blue-100 hover:text-white transition">
                About Us
                </a>
            </li>
            </ul>
        </div>

        {/* VEHICLE CATEGORIES */}
        <div>
            <h4 className="font-bold mb-4">Vehicle Categories</h4>
            <ul className="space-y-2">
            <li><a href="#" className="text-blue-100 hover:text-white">Cars</a></li>
            <li><a href="#" className="text-blue-100 hover:text-white">Motorcycles</a></li>
            <li><a href="#" className="text-blue-100 hover:text-white">Vans</a></li>
            <li><a href="#" className="text-blue-100 hover:text-white">Trucks</a></li>
            </ul>
        </div>

        {/* CONTACTS */}
        <div>
            <h4 className="font-bold mb-4">Contacts</h4>
            <ul className="space-y-2 text-blue-100">
            <li>+63 912 324 5678</li>
            <li>message@rentifypro.com</li>
            <li>Dagupan, Pangasinan</li>
            <li>Philippines</li>
            </ul>
        </div>
        </div>

        {/* BOTTOM BAR */}
        <div className="border-t border-blue-500 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
        <p className="text-blue-100">
            © 2026 RentifyPro. All rights reserved
        </p>
        <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-blue-100 hover:text-white">Privacy Policy</a>
            <a href="#" className="text-blue-100 hover:text-white">Terms and Condition</a>
        </div>
        </div>
        
    </div>
    </footer>

    {showReviewsModal && (
  <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
    <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden">

      {/* HEADER */}
      <div className="px-6 py-4 border-b">

  {/* ROW 1: TITLE + CLOSE */}
  <div className="flex items-center justify-between">
    <h3 className="text-xl font-bold">All Reviews</h3>

    <button
      onClick={() => setShowReviewsModal(false)}
      className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
      aria-label="Close"
    >
      ×
    </button>
  </div>

  {/* ROW 2: RATING + SORT */}
  <div className="flex items-center justify-between mt-2">
    <p className="text-sm text-gray-500 flex items-center gap-1">
      <span className="text-yellow-400">★</span>
      {averageRating}
      <span className="text-gray-400">
        ({totalReviews} {totalReviews === 1 ? "review" : "reviews"})
      </span>
    </p>

   <select
  value={sortOption}
  onChange={(e) => setSortOption(e.target.value)}
  className="border rounded-lg px-3 py-1.5 text-sm"
>
  <option value="recent">Most Recent</option>
  <option value="highest">Highest Rating</option>
  <option value="lowest">Lowest Rating</option>
</select>

  </div>

</div>


      {/* BODY */}
      <div className="max-h-[60vh] overflow-y-auto px-6 py-5 space-y-4">
        {processedReviews.map((review) => (
          <div
            key={review.id}
            className="flex gap-4 border rounded-xl p-4"
          >
            <img
              src={review.avatar}
              alt={review.name}
              className="w-12 h-12 rounded-full object-cover"
            />

            <div className="flex-1">
              <div className="flex justify-between items-center">
  <div className="flex items-center gap-2">
    <p className="font-semibold">{review.name}</p>
    <div className="flex text-yellow-400 text-xs">
      {"★".repeat(review.rating)}
    </div>
  </div>

  <span className="text-xs text-gray-400">
    {review.date}
  </span>
</div>


              <p className="text-sm text-gray-700">
                {review.comment}
              </p>

              <p className="text-xs text-gray-400 mt-1">
                Booked {vehicle.name}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <div className="border-t px-6 py-4">
        <button
          onClick={() => setShowReviewsModal(false)}
          className="w-full bg-[#017FE6] text-white py-3 rounded-xl font-semibold hover:bg-[#0165B8]"
        >
          Close
        </button>
      </div>

    </div>
  </div>
)}



    {/* AI ASSISTANT */}
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

          {/* BODY */}
      <div className="p-4 flex-1 overflow-y-auto bg-gray-50 space-y-4">

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex items-end gap-2 ${
              msg.sender === "user" ? "justify-end" : "justify-start"
            }`}>

            {/* AI AVATAR */}
            {msg.sender === "ai" && (
              <img
                src="/robot-ai.png"
                alt="AI"
                className="w-8 h-8 rounded-full object-cover"
              />
            )}

            {/* MESSAGE */}
            <div
              className={`px-4 py-2 rounded-2xl text-sm max-w-[75%] shadow ${
                msg.sender === "user"
                  ? "bg-[#017FE6] text-white rounded-br-sm"
                  : "bg-white text-gray-800 rounded-bl-sm"
              }`}>

              {msg.text}
            </div>

            {/* USER AVATAR */}
            {msg.sender === "user" && (
              <div className="w-8 h-8 rounded-full bg-[#017FE6] text-white flex items-center justify-center text-xs font-semibold">
                U
              </div>
            )}
          </div>
        ))}

        {isTyping && (
        <div className="flex items-center gap-2">
          <img
            src="/robot-ai.png"
            alt="AI"
            className="w-8 h-8 rounded-full"
          />

          <div className="bg-white px-4 py-2 rounded-2xl shadow text-sm text-gray-500 flex gap-1">
            <span className="animate-bounce">.</span>
            <span className="animate-bounce delay-150">.</span>
            <span className="animate-bounce delay-300">.</span>
          </div>
        </div>
      )}
      


    </div>

          {/* INPUT */}
          <div className="border-t bg-white px-3 py-2 flex items-center gap-2">
          <input
        type="text"
        value={userMessage}
        onChange={(e) => setUserMessage(e.target.value)}
        placeholder="Ask me about vehicles, bookings..."
        className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#017FE6]"
      />

            <button
        onClick={() => {
          if (!userMessage.trim()) return;

          {/* SHOW MESSAGE */}
          setMessages((prev) => [
            ...prev,
            { sender: "user", text: userMessage }
          ]);

          setUserMessage("");
          setIsTyping(true);

          {/* DELAY */}
          setTimeout(() => {
            setMessages((prev) => [
              ...prev,
              {
                sender: "ai",
                text: "Got it! 😊 Let me help you with that."
              }
            ]);
            setIsTyping(false);
          }, 1200); // 1.2s typing
        }}

        className="bg-[#017FE6] text-white w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#0165B8]">
          ➤
          </button>
        </div>
        </div>
      )}
    </div>
  );
};
export default VehicleDetailsPage;
