import React, { useState, useEffect} from "react";
import RentifyPro from "./pages/RentifyPro";
import SignInPage from "./pages/SignInPage";
import VehiclesPage from "./pages/VehiclesPage";
import VehicleDetailsPage from "./pages/VehicleDetailsPage";
import RegisterPage from "./pages/RegisterPage";
import RegisterOTP from "./Verification/RegisterOTP";
import ForgotPasswordEmail from "./Verification/ForgotPasswordEmail";
import ForgotPasswordOTP from "./Verification/ForgotPasswordOTP";
import ResetPassword from "./Verification/ResetPassword";
import AboutPage from "./pages/AboutPage";
import AccountSettings from "./pages/AccountSettings";
import ProceedVehicleOwner from "./pages/ProceedVehicleOwner";
import VehicleOwnerVerification from "./pages/VehicleOwnerVerification";
import RegisterOwnerPage from "./pages/RegisterOwnerPage";
import BookingCheckout from "./pages/BookingCheckout";
import PaymentPage from "./pages/PaymentPage";


//OWNER UI
import OwnerLayout from "./Owner/OwnerLayout";



const App = () => {
  const getDefaultBookingData = () => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return {
      vehicleType: "",
      location: "",
      pickupDate: today.toLocaleDateString("en-CA"), // YYYY-MM-DD in local timezone
      pickupTime: today.toTimeString().slice(0, 5), // HH:mm
      returnDate: tomorrow.toLocaleDateString("en-CA"), // Tomorrow's date
      returnTime: today.toTimeString().slice(0, 5), // Same time as pickup
      insuranceType: "basic",     // basic | standard | premium
      refundableDeposit: 3000,    // fixed for now
    };

    
  };

  const [currentPage, setCurrentPage] = useState("home");
  const [bookingData, setBookingData] = useState(getDefaultBookingData());
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [registeredPhone, setRegisteredPhone] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [isOwnerLoggedIn, setIsOwnerLoggedIn] = useState(false);
  const [registerRole, setRegisterRole] = useState("user"); 


  useEffect(() => {
  setCurrentPage("home");
  setIsOwnerLoggedIn(false);
}, []);



  useEffect(() => {
  const switchToUser = () => {
    setIsOwnerLoggedIn(false);
    setCurrentPage("home"); 
  };

  window.addEventListener("switch-to-user", switchToUser);
  return () => window.removeEventListener("switch-to-user", switchToUser);
}, []);

const days =
  bookingData.pickupDate && bookingData.returnDate
    ? Math.max(
        1,
        Math.ceil(
          (new Date(bookingData.returnDate) -
            new Date(bookingData.pickupDate)) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 1;

const [paymentPayload, setPaymentPayload] = useState(null);

const goToPayment = (payload) => {
  setPaymentPayload(payload);
  setCurrentPage("payment"); 
};

  return (
    <>
    {/* HOMEPAGE CONNECTIONS */}
      {currentPage === "home" && (
        <RentifyPro
        isLoggedIn={isLoggedIn}
        user={user}
        onNavigateToSignIn={() => setCurrentPage("signin")}
         onNavigateToAccountSettings={() => setCurrentPage("account-settings")}
        onNavigateToVehicles={() => {
          setBookingData(getDefaultBookingData());
          setCurrentPage("vehicles");
        }}
        onNavigateToBookingHistory={() => setCurrentPage("signin")}
        onNavigateToRegister={() => setCurrentPage("register")}
        onNavigateToAbout={() => setCurrentPage("about")}
        onSearch={(data) => {
          setBookingData(data);
          setCurrentPage("vehicles");
        }}
        
        onViewDetails={(vehicle) => {
          setSelectedVehicle(vehicle);
          setCurrentPage("vehicle-details");
        }}
        
        onLogout={() => {
        setIsLoggedIn(false);
        setUser(null);
        localStorage.removeItem("isVehicleOwner");  
        localStorage.removeItem("activeRole");      
        setCurrentPage("home");
      }}

         onSwitchToOwner={() => {
      setIsOwnerLoggedIn(true);
      setCurrentPage("owner-dashboard");
    }}
     />
    )}
    
    {/* SIGN IN PAGE CONNECTION */}
    {currentPage === "signin" && (
      <SignInPage
        onNavigateToHome={() => setCurrentPage("home")}
        onNavigateToRegister={() => setCurrentPage("register")}
        onNavigateToForgotPassword={() => setCurrentPage("forgot-email")}
        onLoginSuccess={(userData) => {
        setUser(userData);
         localStorage.setItem("currentUserEmail", userData.email);

        if (userData.role === "owner") {
          setIsOwnerLoggedIn(true);
          localStorage.setItem("isNewOwner", "true");
          setCurrentPage("owner-dashboard");
        } else {
          setIsLoggedIn(true);
          setCurrentPage("home");
        }
      }}

      />
    )}

    {/* FORGOT-EMAIL PAGE CONNECT */}
    {currentPage === "forgot-email" && (
      <ForgotPasswordEmail
        onNavigateToOTP={(email) => {
        setForgotEmail(email);
        setCurrentPage("forgot-otp");
      }}
        onNavigateToSignIn={() => setCurrentPage("signin")}
      />
    )}
    
    {/* FORGOT-OTP */}
    {currentPage === "forgot-otp" && (
      <ForgotPasswordOTP
         email={forgotEmail}
        onVerified={() => setCurrentPage("reset-password")}
        onNavigateToForgotPassword={() => setCurrentPage("forgot-email")}
      />
    )}
    
    {/* RESET-PASS */}
    {currentPage === "reset-password" && (
      <ResetPassword
        onSuccess={() => setCurrentPage("signin")}
        onBack={() => setCurrentPage("forgot-otp")}
      />
    )}
    
    {/* VEHICLES */}
    {currentPage === "vehicles" && (
      <VehiclesPage
        bookingData={bookingData}
        setBookingData={setBookingData}
        isLoggedIn={isLoggedIn}
        user={user}
        onNavigateToHome={() => setCurrentPage("home")}
        onNavigateToSignIn={() => setCurrentPage("signin")}
        onNavigateToBookingHistory={() => setCurrentPage("signin")} 
        onNavigateToRegister={() => setCurrentPage("register")}
        onNavigateToAbout={() => setCurrentPage("about")}
         onNavigateToAccountSettings={() => setCurrentPage("account-settings")}
        onViewDetails={(vehicle) => {
          setSelectedVehicle(vehicle);
          setCurrentPage("vehicle-details");
        }}
        onLogout={() => {
          setIsLoggedIn(false);
          setUser(null);
          localStorage.removeItem("isVehicleOwner"); 
          localStorage.removeItem("activeRole");       
          setCurrentPage("home");
        }}

       onBookNow={(vehicle) => {
  const users = JSON.parse(localStorage.getItem("users")) || [];
  const currentUser = users.find(u => u.email === user?.email);

  if (!currentUser?.isVerified) {
    alert("Please complete your Account Settings to get verified before booking.");
    setCurrentPage("account-settings");
    return;
  }

  setSelectedVehicle(vehicle);
  setCurrentPage("checkout");
}}
      />
    )}

    {/* VEHICLE DETAILS */}
    {currentPage === "vehicle-details" && selectedVehicle && (
      <VehicleDetailsPage
        vehicle={selectedVehicle}
        bookingData={bookingData}
        setBookingData={setBookingData}
        isLoggedIn={isLoggedIn}
        user={user}
        onBack={() => setCurrentPage("vehicles")}
        onNavigateToHome={() => setCurrentPage("home")}
        onNavigateToSignIn={() => setCurrentPage("signin")}
        onContinueToCheckout={() => setCurrentPage("checkout")}
        onNavigateToAbout={() => setCurrentPage("about")}
        onNavigateToAccountSettings={() => setCurrentPage("account-settings")}
        onLogout={() => {
          setIsLoggedIn(false);
          setUser(null);
          localStorage.removeItem("isVehicleOwner");  
          localStorage.removeItem("activeRole");      
          setCurrentPage("home");
        }}
      />
    )}


    {currentPage === "checkout" && selectedVehicle && (
  <BookingCheckout
    vehicle={selectedVehicle}
    days={days}
    bookingData={bookingData}
    setBookingData={setBookingData}

    onNavigateToHome={() => setCurrentPage("home")}
    onNavigateToSignIn={() => setCurrentPage("signin")}
    onNavigateToVehicles={() => {
      setBookingData(getDefaultBookingData());
      setCurrentPage("vehicles");
    }}

    onNavigateToPayment={goToPayment}

    onNavigateToRegister={() => setCurrentPage("register")}
    onNavigateToAbout={() => setCurrentPage("about")}
    onNavigateToBookingHistory={() => setCurrentPage("signin")}
    onNavigateToAccountSettings={() => setCurrentPage("account-settings")}

    isLoggedIn={isLoggedIn}
    user={user}
    onLogout={() => {
      setIsLoggedIn(false);
      setUser(null);
      localStorage.removeItem("isVehicleOwner");
      localStorage.removeItem("activeRole");
      setCurrentPage("home");
    }}
  />
)}


{currentPage === "payment" && paymentPayload && (
  <PaymentPage
    {...paymentPayload}

    onNavigateToHome={() => setCurrentPage("home")}
    onNavigateToVehicles={() => {
      setBookingData(getDefaultBookingData());
      setCurrentPage("vehicles");
    }}
    onNavigateToAbout={() => setCurrentPage("about")}
    onNavigateToAccountSettings={() => setCurrentPage("account-settings")}

    isLoggedIn={isLoggedIn}
    user={user}

    onLogout={() => {
      setIsLoggedIn(false);
      setUser(null);
      localStorage.removeItem("isVehicleOwner");
      localStorage.removeItem("activeRole");
      setCurrentPage("home");
    }}

    onBack={() => setCurrentPage("checkout")}
    onPay={(method) => {
      console.log("PAYMENT METHOD:", method);
      setCurrentPage("booking-history");
    }}
  />
)}
    {/* REGISTER */}
    {currentPage === "register" && (
      <RegisterPage
       onNavigateToHome={() => setCurrentPage("home")}
       onNavigateToSignIn={() => setCurrentPage("signin")}
       onNavigateToRegisterOTP={(email, phone) => {
        setRegisteredEmail(email);
        setRegisteredPhone(phone);
        setRegisterRole("user");
        setCurrentPage("registerotp");
       }}
       onNavigateToOwnerRegister={() => setCurrentPage("register-owner")}
     />
   )}

  {currentPage === "register-owner" && (
  <RegisterOwnerPage
    onBack={() => setCurrentPage("register")}
    onNavigateToSignIn={() => setCurrentPage("signin")}
    onNavigateToRegisterOTP={(email, phone) => {
      setRegisteredEmail(email);
      setRegisteredPhone(phone);
      setRegisterRole("owner"); 
      setCurrentPage("registerotp");
    }}
  />
)}
   
   {/* REGISTER 2FA */}
   {currentPage === "registerotp" && (
     <RegisterOTP
        email={registeredEmail}
        phone={registeredPhone}
        role={registerRole} 
        onNavigateToSignIn={() => setCurrentPage("signin")}
        onNavigateToRegister={() => setCurrentPage("register")}
     />
   )}

   {/* ABOUT PAGE */}
    {currentPage === "about" && (
      <AboutPage
        isLoggedIn={isLoggedIn}
        user={user}
        onNavigateToHome={() => setCurrentPage("home")}
        onNavigateToVehicles={() => {
          setBookingData(getDefaultBookingData());
          setCurrentPage("vehicles");
        }}
        onNavigateToBookingHistory={() => setCurrentPage("signin")}
        onNavigateToSignIn={() => setCurrentPage("signin")}
        onNavigateToRegister={() => setCurrentPage("register")}
        onNavigateToAbout={() => setCurrentPage("about")}
        onNavigateToAccountSettings={() => setCurrentPage("account-settings")}
       onLogout={() => {
        setIsLoggedIn(false);
        setUser(null);
        localStorage.removeItem("isVehicleOwner");  
        localStorage.removeItem("activeRole");       
        setCurrentPage("home");
      }}
      />
    )}

    {/* ACCOUNT SETTINGS */}
    {currentPage === "account-settings" && (
      <AccountSettings
        isLoggedIn={isLoggedIn}
        user={user}
        onNavigateToHome={() => setCurrentPage("home")}
        onNavigateToVehicles={() => setCurrentPage("vehicles")}
        onNavigateToBookingHistory={() => setCurrentPage("signin")}
        onNavigateToSignIn={() => setCurrentPage("signin")}
        onNavigateToAccountSettings={() => setCurrentPage("account-settings")}
        onNavigateToVehicleOwnerProceed={() => setCurrentPage("vehicle-owner-proceed")}
        onNavigateToAbout={() => setCurrentPage("about")}
        onLogout={() => {
      setIsLoggedIn(false);
      setUser(null);
      localStorage.removeItem("isVehicleOwner");  
      localStorage.removeItem("activeRole");       
      setCurrentPage("home");
    }}
      />
    )}

  {/* PROCEED AS VEHICLE OWNER */}
  {currentPage === "vehicle-owner-proceed" && (
    <ProceedVehicleOwner
    onBack={() => setCurrentPage("account-settings")}
    onDoLater={() => setCurrentPage("account-settings")}
    onProceed={() => setCurrentPage("vehicle-owner-verification")}
    onNavigateToHome={() => setCurrentPage("home")}
  />

  )}

  {currentPage === "vehicle-owner-verification" && (
    <VehicleOwnerVerification
    onNavigateToHome={() => setCurrentPage("home")}
    onBack={() => setCurrentPage("vehicle-owner-proceed")}
    onSubmit={() => {
  localStorage.setItem("isNewOwner", "true");
  localStorage.setItem("isVehicleOwner", "true");
  localStorage.setItem("hasUserAccount", "true"); 

  // Persist isVehicleOwner to the user's record
  const users = JSON.parse(localStorage.getItem("users")) || [];
  const currentEmail = localStorage.getItem("currentUserEmail");
  const updatedUsers = users.map((u) =>
    u.email === currentEmail ? { ...u, isVehicleOwner: true } : u
  );
  localStorage.setItem("users", JSON.stringify(updatedUsers));

  setIsOwnerLoggedIn(true);
  setCurrentPage("owner-dashboard");
}}
    

  />
  )}

  {currentPage === "owner-dashboard" && isOwnerLoggedIn && (
    <OwnerLayout />
  )}


    

    </>
);
};

export default App;