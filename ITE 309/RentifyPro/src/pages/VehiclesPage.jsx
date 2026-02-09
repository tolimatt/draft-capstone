import React, { useState, useEffect} from "react";
import { MapPin, Car, Bot, Search, Users, Settings, Fuel, Bell, MessageCircle } from "lucide-react";



const getTodayDate = () => {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD (LOCAL)
};

const getTomorrowDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("en-CA");
};

const getCurrentTime = () => {
  return new Date().toTimeString().slice(0, 5); // HH:mm
};


const VehiclesPage = ({ 
  bookingData, 
  setBookingData, 
  isLoggedIn, 
  user, 
  onLogout, 
  onNavigateToHome, 
  onNavigateToSignIn, 
  onNavigateToRegister, 
  onViewDetails, 
  onNavigateToBookingHistory, 
  onNavigateToAbout,
  onNavigateToAccountSettings}) => {

  const [showAI, setShowAI] = useState(false);
  const [userMessage, setUserMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  const normalize = (str = "") =>
  str
    .toLowerCase()
    .replace(/city/g, "")
    .replace(/,/g, "")
    .replace(/\s+/g, " ")
    .trim();



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
  
  
  const { pickupDate, pickupTime, returnDate, returnTime, vehicleType, location } = bookingData;
   useEffect(() => {
  if (
    bookingData.pickupDate &&
    bookingData.pickupTime &&
    bookingData.returnDate &&
    bookingData.returnTime
  ) return;

  setBookingData((prev) => ({
    ...prev,
    pickupDate: getTodayDate(),
    pickupTime: getCurrentTime(),
    returnDate: getTomorrowDate(),
    returnTime: getCurrentTime(),
  }));
}, [bookingData, setBookingData]);



 const isValidDateTime = () => {
  const now = new Date();
  now.setSeconds(0, 0);

  const pickup = new Date(`${pickupDate}T${pickupTime}`);
  const dropoff = new Date(`${returnDate}T${returnTime}`);

  return pickup >= now && dropoff > pickup;
};




useEffect(() => {
  if (!pickupDate || !returnDate) return;

  const pickup = new Date(pickupDate);
  const dropoff = new Date(returnDate);

  if (dropoff <= pickup) {
    const nextDay = new Date(pickup);
    nextDay.setDate(nextDay.getDate() + 1);

    setBookingData((prev) => ({
      ...prev,
      returnDate: nextDay.toLocaleDateString("en-CA"),
    }));
  }
}, [pickupDate, returnDate]);


useEffect(() => {
  if (pickupDate !== getTodayDate()) return;

  const now = getCurrentTime();

  if (pickupTime < now) {
    setBookingData((prev) => ({
      ...prev,
      pickupTime: now,
    }));
  }
}, [pickupDate, pickupTime]);


  const [locationFilter, setLocationFilter] = useState(location || "");
useEffect(() => {
  if (location) {
    setLocationFilter(location);
  }
}, [location]);




  
  {/* VEHUCE TYPE */}
    const [selectedFilters, setSelectedFilters] = useState({
      all: !vehicleType,
      cars: vehicleType === "car",
      motor: vehicleType === "motor",
      vans: vehicleType === "van",
      truck: vehicleType === "truck",
  });
  
  {/* SUBTYPE */}
  const [subTypeFilter, setSubTypeFilter] = useState([]);
  const [transmission, setTransmission] = useState({ manual: false, automatic: false });
  const [fuelType, setFuelType] = useState({ gasoline: false, diesel: false});
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [searchQuery, setSearchQuery] = useState("");
  
  const filterKeyToVehicleType = {
    cars: "car",
    motor: "motor",
    vans: "van",
    truck: "truck",
  };
  
  const vehicleSubTypes = {
    car: ["Sedan", "SUV", "Hatchback", "Luxury"],
    motor: ["Scooter", "Sport", "Cruiser"],
    van: ["Passenger", "Cargo", "Minivan", "Luxury"],
    truck: ["Flatbed", "Pickup", "Refrigerated", "Cargo"],
  };

  const vehicles = [
  {
    id: 1,
    name: "BMW X5",
    location: "Dagupan City, Pangasinan",
    image: "/bmw-x5.png",
    type: "car",
    subType: "SUV",
    category: "BMW • SUV",
    seats: 7,
    transmission: "Automatic",
    fuel: "Gasoline",
    price: 5500,
    rating: 4.8,
    available: true,
    codingDay: "Wednesday",

    owner: {
    name: "Anya Forger",
    avatar: "/owner-profile.png",
    verified: true,
    rating: 4.8,
    rentals: 204,
    vehicles: 40,
}

  },
  {
    id: 2,
    name: "Yamaha R3",
    location: "Lingayen City, Pangasinan",
    image: "/yamaha-r3.png",
    type: "motor",
    subType: "Sport",
    category: "Yamaha • Sport",
    seats: 2,
    transmission: "Manual",
    fuel: "Gasoline",
    price: 1200,
    rating: 4.6,
    available: true,
    codingDay: "Thursday",

    owner: {
    name: "Anya Forger",
    avatar: "/owner-profile.png",
    verified: true,
    rating: 4.8,
    rentals: 204,
    vehicles: 40,
}

  },

  {
    id: 3,
    name: "Toyota HiAce",
    location: "San Carlos City, Pangasinan",
    image: "/toyota-hiAce.png",
    type: "van",
    subType: "Passenger",
    category: "Toyota • Passenger Van",
    seats: 12,
    transmission: "Manual",
    fuel: "Diesel",
    price: 4800,
    rating: 4.7,
    available: true,
    codingDay: "Saturday",

    owner: {
    name: "Anya Forger",
    avatar: "/owner-profile.png",
    verified: true,
    rating: 4.8,
    rentals: 204,
    vehicles: 40,
}

  },
  {
    id: 4,
    name: "Isuzu Truck",
    location: "University of Pangasinan",
    image: "/isuzu-truck.png",
    type: "truck",
    subType: "Flatbed",
    category: "Isuzu • Flatbed Truck",
    seats: 3,
    transmission: "Manual",
    fuel: "Diesel",
    price: 6000,
    rating: 4.5,
    available: true,
    codingDay: "Monday",

    owner: {
    name: "Anya Forger",
    avatar: "/owner-profile.png",
    verified: true,
    rating: 4.8,
    rentals: 204,
    vehicles: 40,
}

  },
];

const formatCoding = (day) => {
  if (!day) return null;
  return `Coding every ${day}`;
};

  const handleFilterClick = (filter) => {
  setSubTypeFilter([]); // reset sub-types kapag nagpalit ng main type

  if (filter === "all") {
    setSelectedFilters({
      all: true,
      cars: false,
      motor: false,
      vans: false,
      truck: false,
    });
  } else {
    setSelectedFilters({
      all: false,
      cars: false,
      motor: false,
      vans: false,
      truck: false,
      [filter]: true,
    });
  }
};


  const clearFilters = () => {
  setBookingData((prev) => ({
    ...prev,
    pickupDate: getTodayDate(),
    pickupTime: getCurrentTime(),
    returnDate: getTomorrowDate(),
    returnTime: getCurrentTime(),
  }));

  setLocationFilter("");
  setTransmission({ manual: false, automatic: false });
  setFuelType({ gasoline: false, diesel: false });
  setPriceRange({ min: "", max: "" });
  setSearchQuery("");
  setSubTypeFilter([]);
  setSelectedFilters({
    all: true,
    cars: false,
    motor: false,
    vans: false,
    truck: false,
  });
};


 const filteredVehicles = vehicles.filter((vehicle) => {

  const matchLocation =
  !locationFilter ||
  normalize(vehicle.location).includes(
    normalize(locationFilter)
  );




  // VEHICLE TYPE
  const matchType =
    selectedFilters.all ||
    (selectedFilters.cars && vehicle.type === "car") ||
    (selectedFilters.motor && vehicle.type === "motor") ||
    (selectedFilters.vans && vehicle.type === "van") ||
    (selectedFilters.truck && vehicle.type === "truck");

  // TRANSMISSION
  const matchTransmission =
    (!transmission.manual && !transmission.automatic) ||
    (transmission.manual && vehicle.transmission.toLowerCase() === "manual") ||
    (transmission.automatic && vehicle.transmission.toLowerCase() === "automatic");

// FUEL TYPE (Gasoline & Diesel only)
const matchFuel =
  (!fuelType.gasoline && !fuelType.diesel) ||
  (fuelType.gasoline && vehicle.fuel.toLowerCase() === "gasoline") ||
  (fuelType.diesel && vehicle.fuel.toLowerCase() === "diesel");


  // PRICE RANGE
  const minPrice = priceRange.min ? Number(priceRange.min) : 0;
  const maxPrice = priceRange.max ? Number(priceRange.max) : Infinity;

  const matchPrice =
    vehicle.price >= minPrice && vehicle.price <= maxPrice;

  // SEARCH
  const matchSearch =
    vehicle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.category.toLowerCase().includes(searchQuery.toLowerCase());

    // SUB TYPE FILTER
const matchSubType =
  subTypeFilter.length === 0 ||
  subTypeFilter.includes(vehicle.subType);


  return (
    matchType &&
     matchSubType &&
    matchTransmission &&
    matchFuel &&
    matchPrice &&
    matchSearch &&
    matchLocation
  );
});



  return (
    <div className="min-h-screen bg-gray-50">

      {/* NAVBAR */}
      <nav className="bg-white shadow-sm fixed w-full top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <button onClick={onNavigateToHome} 
          className="text-2xl font-bold hover:opacity-90 transition">
         Rentify<span className="text-[#017FE6]">Pro</span></button>


          <div className="hidden md:flex gap-8 relative left-12">
            <button onClick={onNavigateToHome} className="hover:text-[#017FE6]">Home</button>
            <a href="#vehicles" className="text-[#017FE6] border-b-2 border-[#017FE6]">Vehicles</a>
            <button onClick={onNavigateToBookingHistory} className="hover:text-[#017FE6] ">Booking History</button>
            <button onClick={onNavigateToAbout} className="hover:text-[#017FE6]">About</button>
            <a href="#contacts" className="hover:text-[#017FE6] ">Contacts</a>
          </div>

          <div className="flex items-center gap-4">
            
            {/* IF LOGIN IS SUCCESS */}
            {isLoggedIn && (
              <>
                {/* CHAT*/}
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
                shadow-sm
              "
            >
              <Bot size={22} className="text-[#017FE6]" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
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
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#017FE6]/10 transition"
                >
                  <Car size={18} /> My Bookings
                </button>

                <button
                  onClick={onLogout}
                  className="w-full px-4 py-3 text-red-500 hover:bg-red-50"
                >
                  ⎋ Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  </nav>

  <div className="pt-20 max-w-[1400px] mx-auto px-6 pb-20">

    <div className="flex gap-6">
      {/* LEFT SIDEBAR - FILTERS */}
        <div className="w-72 bg-white rounded-xl p-6 shadow-sm h-fit sticky top-24">
          <h2 className="text-xl font-bold mb-4">Filters</h2>
          
          {/* Search */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Search</label>
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 peer-focus:text-[#017FE6]"
                  />

                    <input
                    type="text"
                    placeholder="Search vehicles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm
                                focus:outline-none focus:ring-2 focus:ring-[#017FE6]"
                    />
                </div>
            </div>

            {/* Location */}
<div className="mb-6">
  <label className="block text-sm font-semibold mb-2">Location</label>

  <div className="relative">
    <MapPin
      size={18}
      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#017FE6]"
    />

    <input
      type="text"
      placeholder="Enter location..."
      value={locationFilter}
      onChange={(e) => setLocationFilter(e.target.value)}
      className="
        w-full border border-gray-300 rounded-lg
        pl-10 pr-3 py-2 text-sm
        focus:outline-none focus:ring-2 focus:ring-[#017FE6]
      "
    />
  </div>
</div>

            
            {/* Vehicle Type */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Vehicle Type</label>
                  <div className="flex flex-wrap gap-2">

                    <button
                       onClick={() => handleFilterClick('all')}
                        className={`px-3 py-1 rounded-full text-sm ${selectedFilters.all ? 'bg-[#017FE6] text-white' : 'bg-gray-200 text-gray-700'}`}>
                        All
                    </button>

                        <button
                          onClick={() => handleFilterClick('cars')}
                          className={`px-3 py-1 rounded-full text-sm ${selectedFilters.cars ? 'bg-[#017FE6] text-white' : 'bg-gray-200 text-gray-700'}`}
                        >
                          Cars
                        </button>

                        <button
                          onClick={() => handleFilterClick('motor')}
                          className={`px-3 py-1 rounded-full text-sm ${selectedFilters.motor ? 'bg-[#017FE6] text-white' : 'bg-gray-200 text-gray-700'}`}
                        >
                          Motor
                        </button>

                        <button
                          onClick={() => handleFilterClick('vans')}
                          className={`px-3 py-1 rounded-full text-sm ${selectedFilters.vans ? 'bg-[#017FE6] text-white' : 'bg-gray-200 text-gray-700'}`}
                        >
                          Vans
                        </button>

                        <button
                          onClick={() => handleFilterClick('truck')}
                          className={`px-3 py-1 rounded-full text-sm ${selectedFilters.truck ? 'bg-[#017FE6] text-white' : 'bg-gray-200 text-gray-700'}`}
                        >
                          Truck
                        </button>

                    </div>
            </div>
            
            {/* SUB TYPES */}
            {!selectedFilters.all && (
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">
                  {selectedFilters.cars && "Car Types"}
                  {selectedFilters.motor && "Motor Types"}
                  {selectedFilters.vans && "Van Types"}
                  {selectedFilters.truck && "Truck Types"}
                </label>
                
                <div className="flex flex-wrap gap-2">
                  {Object.entries(selectedFilters).map(([type, active]) => {
                    if (!active || type === "all") return null;
                    const vehicleType = filterKeyToVehicleType[type];
                    
                    return vehicleSubTypes[vehicleType]?.map((sub) => (
                    <button
                     key={sub}
                     onClick={() =>
                      setSubTypeFilter((prev) =>
                      prev.includes(sub)
                      ? prev.filter((s) => s !== sub)
                      : [...prev, sub]
                    )
                    }

                    className={`px-3 py-1 rounded-full text-sm ${
                      subTypeFilter.includes(sub)
                        ? "bg-[#017FE6] text-white"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {sub}
                    </button>
                    ));
                  })}
                </div>
              </div>
            )}

            {/* Pickup Date & Time */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Pickup Date & Time</label>
              <input
                type="date"
                value={pickupDate}
                min={getTodayDate()}
                onChange={(e) =>
                  setBookingData({ ...bookingData, pickupDate: e.target.value })
                }

                className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#017FE6]"
              />
              <input
                type="time"
                value={pickupTime}
                min={pickupDate === getTodayDate() ? getCurrentTime() : undefined}
                onChange={(e) =>
                  setBookingData({ ...bookingData, pickupTime: e.target.value })
                }

                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#017FE6]"
              />
            </div>

            {/* Return Date & Time */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Return Date & Time</label>
              <input
                type="date"
                value={returnDate}
                min={pickupDate}
                onChange={(e) =>
                  setBookingData({ ...bookingData, returnDate: e.target.value })
                }

                className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#017FE6]"
              />
              <input
                type="time"
                value={returnTime}
                onChange={(e) =>
                    setBookingData({ ...bookingData, returnTime: e.target.value })
                  }

                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#017FE6]"
              />
            </div>

            {/* Transmission */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Transmission</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={transmission.manual}
                    onChange={(e) => setTransmission({ ...transmission, manual: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Manual</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={transmission.automatic}
                    onChange={(e) => setTransmission({ ...transmission, automatic: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Automatic</span>
                </label>
              </div>
            </div>

            {/* Fuel Type */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Fuel Type</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={fuelType.gasoline}
                    onChange={(e) => setFuelType({ ...fuelType, gasoline: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Gasoline</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={fuelType.diesel}
                    onChange={(e) => setFuelType({ ...fuelType, diesel: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Diesel</span>
                </label>
                
              </div>
            </div>

            {/* Price Range */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Price Range (per day)</label>
              <div className="flex gap-2">
                <input
                    type="number"
                    min="0"
                    placeholder="Min"
                    value={priceRange.min}
                    onChange={(e) =>
                        setPriceRange({
                        ...priceRange,
                        min: e.target.value,
                        })
                    }
                    className="w-1/2 border border-gray-300 rounded-lg px-3 py-2 text-sm
                                focus:outline-none focus:ring-2 focus:ring-[#017FE6]"
                    />

                <input
                    type="number"
                    min="0"
                    placeholder="Max"
                    value={priceRange.max}
                    onChange={(e) =>
                        setPriceRange({
                        ...priceRange,
                        max: e.target.value,
                        })
                    }
                    className="w-1/2 border border-gray-300 rounded-lg px-3 py-2 text-sm
                                focus:outline-none focus:ring-2 focus:ring-[#017FE6]"
                    />

              </div>
            </div>

            {/* Clear Filters */}
            <button
              onClick={clearFilters}
              className="w-full bg-[#017FE6] text-white py-2 rounded-lg font-semibold hover:bg-[#0165B8]"
            >
              Clear Filters
            </button>
          </div>

          {/* RIGHT SIDE - VEHICLE GRID */}
        <div className="flex-1">
        <h1 className="text-4xl font-bold mb-7">Browse Vehicles</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">


            {filteredVehicles.map((vehicle) => (

            <div
                key={vehicle.id}
                  className="bg-white rounded-xl shadow-md overflow-hidden
                  hover:shadow-xl transition-shadow
                  group flex flex-col"
            >
                <div className="relative">
                {/* AVAILABLE - LEFT */}
                {vehicle.available && (
                    <span className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold z-10">
                    Available
                    </span>
                )}

                {/* RATING - RIGHT */}
                <span className="absolute top-4 right-4 bg-gray-900 px-3 py-1 rounded-full text-xs font-semibold z-10 flex items-center gap-1">
                <span className="text-yellow-400">★</span>
                <span className="text-white">{vehicle.rating}</span>
                </span>


               <div className="relative bg-gray-50 rounded-t-xl px-5 py-2 h-36 flex items-center justify-center overflow-hidden">
                    <img
                      src={vehicle.image || "/bmw-x5.png"}
                      alt={vehicle.name}
                      className="
                        h-full
                        max-w-[93%]
                        object-contain
                        mx-auto
                        transition-transform duration-300
                        group-hover:scale-105
                      "
                    />


                  </div>
                </div>

                <div className="p-4 flex flex-col flex-1">

                {/* VEHICLE NAME + LOCATION (INLINE) */}
                  <h3 className="text-xl font-bold leading-tight mb-1">
                  {vehicle.name}
                </h3>

                  {/* CATEGORY */}
                  <p className="text-gray-500 text-sm mb-2">
                    {vehicle.category}
                  </p>

                   <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                  <MapPin size={14} className="text-[#017FE6]" />
                  <span>{vehicle.location}</span>
                </div>

                  {/* CODING DAY (FIGMA STYLE) */}
                  {vehicle.codingDay && (
                   <span className="
                    inline-flex
                    w-fit
                    mb-3
                    px-3 py-1
                    text-xs
                    bg-gray-200
                    text-gray-700
                    rounded-full
                    font-medium
                  ">
                    {formatCoding(vehicle.codingDay)}
                  </span>
                  )}

                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mb-3 text-sm text-gray-600">

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
                <div className="text-lg font-bold text-[#017FE6] mb-3"> ₱{vehicle.price.toLocaleString()} / day </div>

                <div className="flex gap-2 mt-auto">

                    <button
            type="button"
            onClick={() => {
              console.log("CLICKED", vehicle);
              onViewDetails(vehicle);
            }}
            className="relative z-50 flex-1 border-2 border-gray-300 text-gray-700 py-2 rounded-lg
                      hover:bg-gray-50 text-sm font-semibold"
          >
            View Details
          </button>
                  <button
                      onClick={() => {
                        if (!isValidDateTime()) {
  alert("Please make sure pick-up is not in the past and return is after pick-up.");
  return;
}
                        isLoggedIn ? onViewDetails(vehicle) : onNavigateToSignIn();
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
                <button onClick={onNavigateToBookingHistory}className="text-blue-100 hover:text-white transition">
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
      }`}
    >
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
        }`}
      >
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

    // show user message
    setMessages((prev) => [
      ...prev,
      { sender: "user", text: userMessage }
    ]);

    setUserMessage("");
    setIsTyping(true);

    // fake AI typing delay
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
  className="bg-[#017FE6] text-white w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#0165B8]"
>
  ➤
</button>


    </div>

  </div>
)}
    </div>
  );
};

export default VehiclesPage;