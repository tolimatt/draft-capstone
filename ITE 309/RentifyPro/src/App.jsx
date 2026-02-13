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


//OWNER UI
import OwnerLayout from "./Owner/OwnerLayout";



const App = () => {
  // Helper function to get default booking data with local timezone
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
  localStorage.removeItem("isNewOwner");
}, []);



  useEffect(() => {
  const switchToUser = () => {
    setIsOwnerLoggedIn(false);
    setCurrentPage("home"); // or "vehicles"
  };

  window.addEventListener("switch-to-user", switchToUser);
  return () => window.removeEventListener("switch-to-user", switchToUser);
}, []);



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
          // Reset to fresh defaults when navigating to vehicles without search
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
          setCurrentPage("home");
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
          setCurrentPage("home");
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
        onNavigateToAbout={() => setCurrentPage("about")}
        onNavigateToAccountSettings={() => setCurrentPage("account-settings")}
        onLogout={() => {
          setIsLoggedIn(false);
          setUser(null);
          setCurrentPage("home");
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
          // Reset to fresh defaults when navigating to vehicles from About page
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