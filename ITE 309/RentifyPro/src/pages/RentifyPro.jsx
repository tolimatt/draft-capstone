import React, { useState, useEffect } from "react";
import { MapPin, Car, Bike, Truck, Van, Sparkles, Shield, Radio, Bot, Search, Users, Settings, Fuel, Bell, MessageCircle, BadgeCheck, ArrowLeftRight } from "lucide-react";

const getTodayDate = () => {
  const d = new Date();
  return d.toLocaleDateString("en-CA"); // YYYY-MM-DD (LOCAL time)
};

const getTomorrowDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("en-CA"); // YYYY-MM-DD
};

const getCurrentTime = () => {
  const d = new Date();
  return d.toTimeString().slice(0, 5); // HH:mm
};

const normalize = (str = "") =>
  str.toLowerCase().replace(/\s+/g, " ").trim();




const RentifyPro = ({
  onNavigateToSignIn, 
  onNavigateToVehicles, 
  onNavigateToRegister, 
  onNavigateToAbout, 
  onSearch, 
  onViewDetails, 
  onNavigateToBookingHistory,  
   onNavigateToAccountSettings,
   onSwitchToOwner,
  isLoggedIn, 
  user, 
  onLogout,
}) => {

  const [location, setLocation] = useState("");
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [vehicleType, setVehicleType] = useState("");
  const [showAI, setShowAI] = useState(false);
  const [userMessage, setUserMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const getInitials = (firstName, lastName) => {
  if (!firstName || !lastName) return "";
  return `${firstName[0]}${lastName[0]}`.toUpperCase();

};

{/* AI MESSAGE PAG CLICK NG BOT */}
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

    const locations = [
      "Urdaneta City, Pangasinan",
      "Dagupan City, Pangasinan",
      "Calasiao, Pangasinan",
      "Lingayen, Pangasinan",
      "Mangaldan, Pangasinan",
      "University of Pangasinan",
      "San Carlos City, Pangasinan",
      "Sta Barbara, Pangasinan",
      "SM Dagupan",
      "Robinsons Place Pangasinan",
    ];

  
    {/* DEFAULT DATE AND TIME */}

    {/* PICKUP NOW */}
  // DEFAULT PICKUP
const [pickupDate, setPickupDate] = useState(() => getTodayDate());
const [pickupTime, setPickupTime] = useState(() => getCurrentTime());

// DEFAULT RETURN (always +1 day, same time)
const [returnDate, setReturnDate] = useState(() => getTomorrowDate());
const [returnTime, setReturnTime] = useState(() => getCurrentTime());


 useEffect(() => {
  if (returnDate <= pickupDate) {
    const nextDay = new Date(pickupDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setReturnDate(nextDay.toISOString().split("T")[0]);
  }
}, [pickupDate]);

useEffect(() => {
  const today = getTodayDate();
  const now = getCurrentTime();

  if (pickupDate === today) {
    if (pickupTime < now) {
      setPickupTime(now);
    }
  }
}, [pickupDate, pickupTime]);

const isValidDateTime = () => {
  const now = new Date();
  now.setSeconds(0, 0);

  const pickup = new Date(`${pickupDate}T${pickupTime}`);
  const dropoff = new Date(`${returnDate}T${returnTime}`);

  if (pickup < now) return false;        // pickup in past
  if (dropoff <= pickup) return false;   // return not after pickup

  return true;
};




  {/* VEHICLE CTAGEORIES */}

  const categories = [
  {
    id: "premium-cars",
    title: "Premium Cars",
    icon: Car,
    image: "/cars.png",
    tags: ["Sedan", "Hatchback", "SUV", "Luxury"],
    description: "Perfect for family trips, business meetings, or special occasions.",
    price: "₱500/day",
  },
  {
    id: "motorcycles",
    title: "Motorcycles",
    icon: Bike,
    image: "/motor.png",
    tags: ["Scooter", "Sports Bike", "Cruiser"],
    description: "Ideal for quick commutes, exploring the city, or weekend adventures.",
    price: "₱300/day",
  },
  {
    id: "vans",
    title: "Vans",
    icon: Van,
    image: "/van.png",
    tags: ["Passenger", "Mini Van", "Cargo", "Luxury"],
    description: "Spacious rides designed for all your plans and occasions.",
    price: "₱1,500/day",
  },
  {
    id: "trucks",
    title: "Trucks",
    icon: Truck,
    image: "/trucks.png",
    tags: ["Pick-up", "Cargo", "Refrigerated", "Flat bed"],
    description: "Built for work, designed to carry cargo safely and comfortably.",
    price: "₱2,000/day",
  },
];

const [vehicles, setVehicles] = useState([
  {
    id: 1,
    name: "BMW X5",
    category: "BMW • SUV",
    location: "Dagupan City, Pangasinan",
    image: "/bmw-x5.png",
    seats: 7,
    transmission: "Automatic",
    fuel: "Gasoline",
    price: 5500,
    rating: 4.8,
    rentals: 204,
    status: "Available",
    codingDay: "Wednesday",
    driverOption: "both",
  },
  {
    id: 2,
    name: "Yamaha R3",
    category: "Yamaha • Sport",
    location: "Lingayen, Pangasinan",
    image: "/yamaha-r3.png",
    seats: 2,
    transmission: "Manual",
    fuel: "Gasoline",
    price: 1200,
    rating: 4.6,
    rentals: 156,
    status: "Available",
    codingDay: "Thursday",
    driverOption: "self",
  },

  {
  id: 3,
  name: "Toyota HiAce",
  category: "Toyota • Passenger Van",
  location: "San Carlos City, Pangasinan",
  image: "/toyota-hiAce.png",
  seats: 12,
  transmission: "Manual",
  fuel: "Diesel",
  price: 4800,
  rating: 4.7,
  rentals: 120, // IMPORTANT
  status: "Available",
  codingDay: "Saturday",
  driverOption: "with-driver",
}
]);

const isFeatured = (vehicle) => {
  return (
    vehicle.status === "Available" &&
    vehicle.rating >= 4.5 &&
    vehicle.rentals >= 20
  );
};

const featuredVehicles = vehicles
  .filter(isFeatured)
  .sort((a, b) => {
    if (b.rating !== a.rating) {
      return b.rating - a.rating; // mas mataas rating = una
    }
    return b.rentals - a.rentals; // pag tie, mas maraming rent
  })
  .slice(0, 6); // max 6 featured

  const handleBook = (vehicleId) => {
  setVehicles((prev) =>
    prev.map((v) =>
      v.id === vehicleId
        ? { ...v, rentals: v.rentals + 1 }
        : v
    )
  );
};

const formatCoding = (day) => {
  if (!day) return null;
  return `Coding every ${day}`;
};



  const features = [
    {
      icon: <Sparkles className="w-8 h-8" />,
      title: 'AI-Powered Recommendations',
      description: 'Our intelligent system learns your preferences to suggest the perfect vehicle for every trip.'
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: 'Secure Blockchain Transactions',
      description: 'All bookings are recorded on an immutable blockchain, ensuring transparency and trust.'
    },
    {
      icon: <Radio className="w-8 h-8" />,
      title: 'Online Booking',
      description: 'Find, compare, and book your ideal car in minutes with our intuitive and streamlined process with insurance coverage and the best price guaranteed.'
    }
  ];

  const [isVehicleOwner, setIsVehicleOwner] = useState(
  localStorage.getItem("isVehicleOwner") === "true"
);

// Sync when login state changes — catches same-tab logout
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


  return (
    <div className="min-h-screen bg-white">

      {/* NAVBAR */}
      <nav className="bg-white shadow-sm fixed w-full top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
         <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="text-2xl font-bold hover:opacity-90 transition">
          Rentify<span className="text-[#017FE6]">Pro</span>
        </button>

          <div className="hidden md:flex gap-8 relative left-12">

            <a href="#home" className="text-[#017FE6] border-b-2 border-[#017FE6]">Home</a>
            <button onClick={onNavigateToVehicles} className="hover:text-[#017FE6]">Vehicles</button>
            <button onClick={onNavigateToBookingHistory} className="hover:text-[#017FE6]">Booking History</button>
            <button onClick={onNavigateToAbout} className="hover:text-[#017FE6]">About</button>
            <a href="#contacts" className="hover:text-[#017FE6]">Contacts</a>
          </div>

          <div className="flex items-center gap-4">

            {/* SHOW ONLY WHEN LOGGED IN */}
            {isLoggedIn && (
              <>

              {/* CHATROOM */}
              <button aria-label="Chatroom"
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
                <button aria-label="Notifications"
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
      shadow-sm
    "
  >
    <Bot size={22} className="text-[#017FE6]" />
    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
  </button>

  

  {/* USER PROFILE OR AUTH */}
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
         className="bg-[#017FE6] text-white px-5 py-2 rounded-full hover:bg-[#0165B8]">

        Register
        </button>
    </>
    
  ) : (
  <div className="relative">
  <button
    onClick={() => setShowProfileMenu(!showProfileMenu)}
    className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full hover:bg-gray-200 transition">
      
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
          
          <button
          onClick={() => {
            setShowProfileMenu(false);
            onNavigateToAccountSettings();
          }}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#017FE6]/10 transition"
        >
          <Settings size={18} />
          Account Settings
        </button>

  
          <button
            onClick={onNavigateToBookingHistory}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#017FE6]/10 transition">
            <Car size={18} /> My Bookings
          </button>

          {/* ADD THIS SWITCH TO OWNER BUTTON - Only shows if user is verified */}
   {isVehicleOwner && (
  <button
    onClick={() => {
      localStorage.setItem("activeRole", "owner");
      setShowProfileMenu(false);
      onSwitchToOwner();
    }}
    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#017FE6]/10 transition border-t"
  >
    <ArrowLeftRight size={18} className="text-[#017FE6]" />
    <span className="text-[#017FE6] font-medium">
      Switch to Owner
    </span>
  </button>
)}

  
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
       
       {/* HERO SECTION */}
       <div className="relative h-[520px] pt-16 text-white">
          <img
            src="/hero-car1.png"
            alt="Hero"
            className="absolute inset-0 w-full h-full object-cover"
          />
        <div className="absolute inset-0 bg-black/60"></div>

       <div className="relative z-10 h-full flex flex-col items-center justify-start text-center px-4 pt-20">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Rent Smarter, Ride Easier
          </h1>

          <p className="text-xl text-gray-200 mb-8 max-w-2xl">
            Find the perfect car or motorcycle and enjoy hassle-free rides with RentifyPro.
          </p>

          <div className="flex gap-4">
            <button
              onClick={onNavigateToVehicles}
              className="bg-white text-black px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition">
              Browse Vehicles →
            </button>

            <button className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-gray-900">
              Learn More
            </button>
          </div>
        </div>
      </div>

      {/* SEARCH CARD */}
      <div className="max-w-6xl mx-auto px-4 -mt-20 relative z-10">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-6">


             <div className="relative md:col-span-2">
  <label className="block text-[#017FE6] font-semibold mb-2">
    Location
  </label>

  <div className="relative">
    <MapPin
      size={18}
      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#017FE6]"
    />

    <input
      type="text"
      value={location}
      placeholder="Search location"
      onChange={(e) => {
        setLocation(e.target.value);
        setShowLocationSuggestions(true);
      }}
      onFocus={() => setShowLocationSuggestions(true)}
      className="
         w-full h-[52px]
        border
        border-gray-300
        rounded-lg
        pl-10
        pr-5
        py-4
        text-sm
        focus:outline-none
        focus:ring-2
        focus:ring-[#017FE6]
      "
    />
  </div>

  {showLocationSuggestions && location && (
    <div
      className="
        absolute
        left-0
        top-full
        z-50
        mt-1
        w-full
        bg-white
        rounded-lg
        shadow-lg
        border
        border-gray-200
        max-h-56
        overflow-y-auto
      "
    >
      {locations
        .filter((loc) =>
          loc.toLowerCase().includes(location.toLowerCase())
        )
        .map((loc, index) => (
          <button
            key={index}
            onClick={() => {
              setLocation(loc);
              setShowLocationSuggestions(false);
            }}
            className="
               w-full h-[52px]
              px-4
              py-2
              text-left
              flex
              items-center
              gap-2
              hover:bg-[#017FE6]/10
            "
          >
            <MapPin size={14} className="text-[#017FE6]" />
            {loc}
          </button>
        ))}
    </div>
  )}
</div>


            <div>
              <label className="block text-[#017FE6] font-semibold mb-2">Vehicle Types</label>
              <select
                className=" w-full h-[52px] border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#017FE6]"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
              >
                <option value="">Select type</option>
                <option value="car">Car</option>
                <option value="motor">Motorcycle</option>
                <option value="van">Van</option>
                <option value="truck">Truck</option>
              </select>
            </div>


            <div>
              <label className="block text-[#017FE6] font-semibold mb-2">Pick-up Date</label>
              <input
              type="date"
              value={pickupDate}
               min={getTodayDate()}
              onChange={(e) => setPickupDate(e.target.value)}
              className="
                w-full h-[52px]
                border border-gray-300 rounded-lg
                px-4
                text-sm
                leading-[52px]
                focus:outline-none focus:ring-2 focus:ring-[#017FE6]
              "
              />
            </div>
            <div>
              <label className="block text-[#017FE6] font-semibold mb-2">Pick-up Time</label>
              <input
                type="time"
                value={pickupTime}
                min={pickupDate === getTodayDate() ? getCurrentTime() : undefined}
                onChange={(e) => setPickupTime(e.target.value)}
                className="
                    w-full h-[52px]
                    border border-gray-300 rounded-lg
                    px-4
                    text-sm
                    leading-[52px]
                    focus:outline-none focus:ring-2 focus:ring-[#017FE6]
                  "
                />

            </div>
            <div>
              <label className="block text-[#017FE6] font-semibold mb-2">Return Date</label>
              <input
                type="date"
                value={returnDate}
                min={(() => {
    const d = new Date(pickupDate);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  })()}
                onChange={(e) => setReturnDate(e.target.value)}
              className="
                  w-full h-[52px]
                  border border-gray-300 rounded-lg
                  px-4
                  text-sm
                  leading-[52px]
                  focus:outline-none focus:ring-2 focus:ring-[#017FE6]
                "
              />

            </div>
            <div>
              <label className="block text-[#017FE6] font-semibold mb-2">Return Time</label>
              <input
                  type="time"
                  value={returnTime}
                  onChange={(e) => setReturnTime(e.target.value)}
                className="
                    w-full h-[52px]
                    border border-gray-300 rounded-lg
                    px-4
                    text-sm
                    leading-[52px]
                    focus:outline-none focus:ring-2 focus:ring-[#017FE6]
                  "
                />

            </div>
          </div>
          <div className="flex justify-center">
            
          <button
              onClick={() => {
                if (!isValidDateTime()) {
            alert(
                pickupDate === returnDate
                  ? "Return date must be at least 1 day after pick-up date."
                  : "Pick-up time must not be in the past."
              );
              return;
              }

                onSearch({
                  location,
                  vehicleType,
                  pickupDate,
                  pickupTime,
                  returnDate,
                  returnTime,
                });
              }}

              className="flex items-center gap-3 bg-[#017FE6] text-white px-10 py-3 rounded-xl font-semibold text-lg hover:bg-[#0165B8] transition">
              <Search size={22} className="stroke-[2.5]" />
              Search Available Vehicles
          </button>
          
          </div>
        </div>
      </div>

      {/* VEHICLE CATEGORIES */}
      <div className="max-w-5xl mx-auto px-6 py-20">

        <h2 className="text-4xl font-bold text-center mb-4">
          Select your <span className="text-[#017FE6]">Vehicle Category</span>
        </h2>

        <p className="text-center text-gray-600 mb-12">
          Choose a category to find your perfect vehicle.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {categories.map((category) => (
              <div key={category.id}
              
              onClick={() =>
                onSearch({
                  location,
                  vehicleType:
                    category.id === "premium-cars"
                      ? "car"
                      : category.id === "motorcycles"
                      ? "motor"
                      : category.id === "vans"
                      ? "van"
                      : "truck",
                  pickupDate,
                  pickupTime,
                  returnDate,
                  returnTime,
                })
              }
              
              className="bg-gray-50 rounded-2xl p-8 hover:shadow-xl transition-shadow cursor-pointer">
                <img
                  src={category.image}
                  alt={category.title}
                  className="w-full h-48 object-cover rounded-xl mb-6"
               />

              <h3 className="text-2xl font-bold mb-4 flex items-center justify-start text-left">
                <category.icon className="w-6 h-6 mr-2 text-[#017FE6]" />
                {category.title}
             </h3>

              <div className="flex flex-wrap justify-start gap-2 mb-4">

                {category.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-[#017FE6] text-white px-3 py-1 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <p className="text-gray-600 text-left mb-4">
                {category.description}
              </p>

              <p className="text-[#017FE6] font-bold text-xl text-left">
                Starting from {category.price}
              </p>

            </div>
          ))}

        </div>
      </div>

      {/* FEATURED V */}
      <div className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold mb-12">
            <span className="text-[#017FE6]">Featured</span> Vehicles
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredVehicles.map((vehicle, index) => (
              <div key={index} className="group bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all">
                <div className="relative">
                  {vehicle.status === "Available" && (
                <span className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  Available
                </span>
              )}
                  <span className="absolute top-4 right-4 bg-gray-900 text-white px-3 py-1 rounded-full text-sm font-semibold">
                   <span className="text-yellow-400"> ★ </span>
                <span className="text-white">{vehicle.rating}</span>
                </span>
                 <div className="bg-gray-50 rounded-t-xl p-6 h-60 flex items-center justify-center">
                    <img
                      src={vehicle.image || "/bmw-x5.png"}
                      alt={vehicle.name}
                      className="max-h-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>

                  </div>
                     <div className="p-5">
      
                      {/* VEHICLE NAME */}
                      <h3 className="text-xl font-bold leading-tight mb-1">
                        {vehicle.name}
                      </h3>

                      {/* CATEGORY */}
                      <p className="text-gray-500 text-sm mb-2">
                        {vehicle.category}
                      </p>

                      {/* LOCATION */}
                      <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                        <MapPin size={14} className="text-[#017FE6]" />
                        <span>{vehicle.location}</span>
                      </div>

                      
                      {/* CODING DAY (FIGMA STYLE) */}
                       <div className="flex flex-wrap gap-2 mb-3">
                        {vehicle.codingDay && (
                          <span className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded-full font-medium">
                            {formatCoding(vehicle.codingDay)}
                          </span>
                        )}

                        {vehicle.driverOption && (
                          <span className="px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-700 font-medium">
                            {vehicle.driverOption === "self" && "Self Drive only"}
                            {vehicle.driverOption === "with-driver" && "With Driver Only"}
                            {vehicle.driverOption === "both" && "Self / With Driver"}
                          </span>
                        )}
                      </div>

                 <div className="flex items-center gap-5 mb-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Users size={16} className="text-[#017FE6]" />
                      {vehicle.seats} seats
                    </span>

                    <span className="flex items-center gap-1">
                      <Settings size={16} className="text-[#017FE6]" />
                      {vehicle.transmission}
                    </span>

                    <span className="flex items-center gap-1">
                      <Fuel size={16} className="text-[#017FE6]" />
                      {vehicle.fuel}
                    </span>
                  </div>


                {/* PRICE */} 
                <div className="text-lg font-bold text-[#017FE6] mb-4"> ₱{vehicle.price.toLocaleString()} / day </div>
                  <div className="flex space-x-2">

                    <button
                      onClick={() => onViewDetails(vehicle)}
                      className="flex-1 border-2 border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
                    >
                      View Details
                    </button>

                    <button
                    onClick={() => {
                      handleBook(vehicle.id);
                      onViewDetails(vehicle);
                    }}
                    className="flex-1 bg-[#017FE6] text-white py-2 rounded-lg hover:bg-[#0165B8]"
                  >
                    Book Now
                  </button>

                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* WHY CHOOSE RENTIFY*/}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            
        <h2 className="text-4xl font-bold text-center mb-16">
          Why choose <span className="text-[#017FE6]">RentifyPro</span>?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full text-[#017FE6] mb-6">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-[#017FE6] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>

              <h3 className="text-2xl font-bold mb-4">
                RentifyPro
              </h3>

              <p className="text-blue-100">Your trusted partner for vehicle rentals in the Philippines
              </p>
            </div>
            
              <div><h4 className="font-bold mb-4">Quick Links</h4>

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

          {/* BODY */}
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

    {/* INPUT */}
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

export default RentifyPro;