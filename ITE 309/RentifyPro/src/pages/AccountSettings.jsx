import React, { useState, useEffect } from "react";
import {
  Bot,
  Bell,
  MessageCircle,
  Settings,
  Car,
  ShieldCheck,
  User,
  Lock,
  BellRing,
  BadgeCheck,
} from "lucide-react";

  const AccountSettings = ({
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

      {/* MAIN CONTENT */}
<div className="pt-24 bg-gray-50 min-h-screen">
  <div className="max-w-7xl mx-auto px-6 flex gap-6">

    {/* LEFT SIDEBAR */}
    <aside className="w-72 space-y-4">
    <div className="bg-white rounded-xl shadow p-4 space-y-2">
  {[
    { label: "Profile Settings", icon: User },
    { label: "Change Password", icon: Lock },
    { label: "Notifications Settings", icon: BellRing },
    { label: "Verification", icon: ShieldCheck },
  ].map(({ label, icon: Icon }) => (
    <button
      key={label}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
        label === "Verification"
          ? "bg-[#017FE6]/10 text-[#017FE6]"
          : "hover:bg-gray-100 text-gray-700"
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  ))}
</div>


      <div className="bg-white rounded-xl shadow p-4">
        <h4 className="font-semibold text-sm mb-1">Become a Vehicle Owner</h4>
        <p className="text-xs text-gray-500 mb-4">
          List your vehicles and earn money by renting them to verified users.
        </p>
        <button className="w-full bg-[#017FE6] text-white py-2 rounded-lg text-sm">
          Register as Vehicle Owner
        </button>
      </div>
    </aside>

    {/* RIGHT CONTENT */}
    <main className="flex-1 space-y-6">

      {/* HEADER */}
      <div className="bg-white rounded-xl shadow p-6 flex items-center gap-4">
        <div className="relative">
  <div className="w-20 h-20 rounded-full bg-[#017FE6] text-white flex items-center justify-center text-2xl font-bold">
    {user?.initials}
  </div>
</div>

        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
          {user?.name}
           <BadgeCheck size={18} className="text-[#017FE6]" />
        </h2>

        <p className="text-sm text-gray-500">
          {user?.email}
        </p>

        <span className="text-xs text-[#017FE6] font-medium">
          Verified User
        </span>

        </div>
      </div>

      {/* INFO CARD */}
      {[
        {
          title: "Personal Information",
          fields: [
            ["First Name", "Charles Matthew"],
            ["Last Name", "Toliao"],
            ["Date of Birth", "MM/DD/YYYY"],
            ["Gender", "Male"],
          ],
        },
        {
          title: "Contact Information",
          fields: [
            ["Email", "chaleshaduken@gmail.com"],
            ["Phone Number", "09123456789"],
          ],
        },
        {
          title: "Location Information",
          fields: [
            ["Full Address", "Unit, St., Barangay haduken ..."],
            ["City / Municipality", ""],
            ["Province", ""],
            ["Zip Code", ""],
          ],
        },
        {
          title: "Emergency Contact Information",
          fields: [
            ["Contact Name", ""],
            ["Phone Number", "09123456789"],
            ["Relationship", ""],
          ],
        },
      ].map((section, i) => (
        <div key={i} className="bg-white rounded-xl shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">{section.title}</h3>
            <button className="text-sm border px-4 py-1 rounded-full hover:bg-gray-100">
              Edit
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {section.fields.map(([label, value], idx) => (
              <div key={idx}>
                <label className="text-xs text-gray-500">
                  {label} *
                </label>
                <input
                  disabled
                  value={value}
                  className="w-full mt-1 bg-gray-100 border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </main>
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

export default AccountSettings;