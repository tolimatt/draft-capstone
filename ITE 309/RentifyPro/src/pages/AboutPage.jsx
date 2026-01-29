import React, { useState, useEffect } from "react";
import { Bot, Bell, MessageCircle, Settings, Car, Users, Wrench, ShieldCheck} from "lucide-react";

  const AboutPage = ({
  onNavigateToHome,
    onNavigateToSignIn,
    onNavigateToVehicles,
    onNavigateToRegister,
    onNavigateToAbout,
    onNavigateToBookingHistory,
    isLoggedIn,
    user,
    onLogout,
  }) => {

  const [showAI, setShowAI] = useState(false);
  const [userMessage, setUserMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

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
            <button onClick={onNavigateToAbout} className="text-[#017FE6] border-b-2 border-[#017FE6]">About</button>
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
               <div className="w-8 h-8 rounded-full bg-[#017FE6] text-white flex items-center justify-center text-sm font-bold">
                 {user?.initials}
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
             
                     <button
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#017FE6]/10 transition">
                      <Settings size={18} />
                      Account Settings
                      </button>
             
                     <button onClick={onNavigateToBookingHistory}
                       className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#017FE6]/10 transition"
                     >
                       <Car size={18} /> My Bookings
                     </button>
             
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

                  {/* CONTENT */}
            <div className="pt-28 pb-20 px-6 bg-white">
              {/* HEADER */}
              <div className="text-center mb-12">
                <h1 className="text-3xl font-bold text-gray-900">
                  About <span className="text-[#017FE6]">RentifyPro</span>
                </h1>
                <p className="text-gray-500 mt-2">
                  Your trusted partner for vehicle rentals in the Philippines
                </p>
              </div>

              {/* OUR STORY */}
              <div className="max-w-4xl mx-auto bg-white border rounded-xl shadow-sm p-8 mb-14">
                <h2 className="text-xl font-semibold mb-4">
                  Our <span className="text-[#017FE6]">Story</span>
                </h2>

                <p className="text-gray-600 mb-4">
                  RentifyPro was founded with a simple mission: to make vehicle rental easy,
                  affordable, and reliable. We started with just 5 vehicles and a dream to
                  revolutionize the rental industry.
                </p>

                <p className="text-gray-600 mb-4">
                  Today, we’ve grown to serve thousands of customers with a diverse fleet of
                  cars and motorcycles. Our commitment to quality service and customer
                  satisfaction remains at the heart of everything we do.
                </p>

                <p className="text-gray-600">
                  We believe that everyone deserves access to reliable transportation,
                  whether it’s for a business trip, a family vacation, or an adventure on
                  two wheels.
                </p>
              </div>

              {/* STATS */}
              <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16">
                <div className="border rounded-xl text-center py-6 shadow-sm">
                  <h3 className="text-2xl font-bold text-[#017FE6]">1k</h3>
                  <p className="text-gray-500 mt-1">Vehicles</p>
                </div>

                <div className="border rounded-xl text-center py-6 shadow-sm">
                  <h3 className="text-2xl font-bold text-[#017FE6]">10k</h3>
                  <p className="text-gray-500 mt-1">Users</p>
                </div>

                <div className="border rounded-xl text-center py-6 shadow-sm">
                  <h3 className="text-2xl font-bold text-[#017FE6]">4.7</h3>
                  <p className="text-gray-500 mt-1">Average Ratings</p>
                </div>
              </div>

              {/* VALUES */}
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl font-semibold text-center mb-10">
                Our <span className="text-[#017FE6]">Values</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* QUALITY VEHICLES */}
                <div className="border rounded-xl p-6 text-center shadow-sm hover:shadow-md transition">
                  <div className="flex justify-center mb-4">
                    <div className="bg-blue-100 p-4 rounded-full">
                      <Wrench size={28} className="text-[#017FE6]" />
                    </div>
                  </div>
                  <h3 className="font-semibold mb-2">Quality Vehicles</h3>
                  <p className="text-gray-500 text-sm">
                    All vehicles are thoroughly inspected and well-maintained.
                  </p>
                </div>

                {/* CUSTOMER EXPERIENCE */}
                <div className="border rounded-xl p-6 text-center shadow-sm hover:shadow-md transition">
                  <div className="flex justify-center mb-4">
                    <div className="bg-blue-100 p-4 rounded-full">
                      <Users size={28} className="text-[#017FE6]" />
                    </div>
                  </div>
                  <h3 className="font-semibold mb-2">Customer Experience</h3>
                  <p className="text-gray-500 text-sm">
                    Customer satisfaction is our top priority.
                  </p>
                </div>

                {/* TRUST & TRANSPARENCY */}
                <div className="border rounded-xl p-6 text-center shadow-sm hover:shadow-md transition">
                  <div className="flex justify-center mb-4">
                    <div className="bg-blue-100 p-4 rounded-full">
                      <ShieldCheck size={28} className="text-[#017FE6]" />
                    </div>
                  </div>
                  <h3 className="font-semibold mb-2">Trust & Transparency</h3>
                  <p className="text-gray-500 text-sm">
                    We believe in honest pricing, clear policies, and open communication.
                  </p>
                </div>

              </div>
            </div>

            </div>


                  {/* FOOTERR */}
                  <footer className="bg-[#017FE6] text-white py-12">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div>
                          <h3 className="text-2xl font-bold mb-4">
                            RentifyPro
                          </h3>
                          <p className="text-blue-100">Your trusted partner for vehicle rentals in the Philippines</p>
                        </div>

                        <div>
              <h4 className="font-bold mb-4">Quick Links</h4>

              <ul className="space-y-3">
                <li>
                  <button
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    className="text-blue-100 hover:text-white transition"
                  >
                    <span className="text-white font-semibold cursor-default">
                      Home
                    </span>
                  </button>
                </li>

                <li>
                  <button
                    onClick={onNavigateToVehicles}
                    className="text-blue-100 hover:text-white transition"
                  >
                    Vehicles
                  </button>
                </li>

                <li>
                  <button onClick={onNavigateToBookingHistory} className="text-blue-100 hover:text-white transition">
                    Booking History
                  </button>
                </li>

                <li>
                  <a href="#" className="text-blue-100 hover:text-white transition">
                    About Us
                  </a>
                </li>
              </ul>
            </div>


            <div>
              <h4 className="font-bold mb-4">Vehicle Categories</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-blue-100 hover:text-white">Cars</a></li>
                <li><a href="#" className="text-blue-100 hover:text-white">Motorcycles</a></li>
                <li><a href="#" className="text-blue-100 hover:text-white">Vans</a></li>
                <li><a href="#" className="text-blue-100 hover:text-white">Trucks</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Contacts</h4>
              <ul className="space-y-2 text-blue-100">
                <li>+63 912 324 5678</li>
                <li>message@rentifypro.com</li>
                <li>Dagupan, Pangasinan,</li>
                <li>Philippines</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-blue-500 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-blue-100">© 2026 RentifyPro. All rights reserved</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-blue-100 hover:text-white">Privacy Policy</a>
              <a href="#" className="text-blue-100 hover:text-white">Terms and Condition</a>
            </div>
          </div>
        </div>
      </footer>

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

export default AboutPage;
