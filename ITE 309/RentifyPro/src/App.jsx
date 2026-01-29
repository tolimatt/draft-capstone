import React, { useState } from "react";
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


const App = () => {
  const defaultBookingData = {
  vehicleType: "",
  pickupDate: new Date().toISOString().split("T")[0],
  pickupTime: new Date().toTimeString().slice(0, 5),
  returnDate: (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  })(),
  returnTime: new Date().toTimeString().slice(0, 5),
};

const [currentPage, setCurrentPage] = useState("home");
const [bookingData, setBookingData] = useState(defaultBookingData);
const [selectedVehicle, setSelectedVehicle] = useState(null);
const [registeredEmail, setRegisteredEmail] = useState("");
const [registeredPhone, setRegisteredPhone] = useState("");
const [forgotEmail, setForgotEmail] = useState("");
const [isLoggedIn, setIsLoggedIn] = useState(false);
const [user, setUser] = useState(null);

  return (
    <>
    {/* HOMEPAGE CONNECTIONS */}
      {currentPage === "home" && (
        <RentifyPro
        isLoggedIn={isLoggedIn}
        user={user}
        onNavigateToSignIn={() => setCurrentPage("signin")}
        onNavigateToVehicles={() => setCurrentPage("vehicles")}
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
        setIsLoggedIn(true);
        setUser(userData); // DIRECT NA
        setCurrentPage("home");
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
        onViewDetails={(vehicle) => {
          setSelectedVehicle(vehicle);
          setCurrentPage("vehicle-details");
        }}
      />
    )}

    {/* VEHICLE DETAIKS */}
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
        setCurrentPage("registerotp");
       }}
     />
   )}
   
   {/* REGISTER 2FA */}
   {currentPage === "registerotp" && (
     <RegisterOTP
        email={registeredEmail}
        phone={registeredPhone}
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
        onNavigateToVehicles={() => setCurrentPage("vehicles")}
        onNavigateToBookingHistory={() => setCurrentPage("signin")}
        onNavigateToSignIn={() => setCurrentPage("signin")}
        onNavigateToRegister={() => setCurrentPage("register")}
        onNavigateToAbout={() => setCurrentPage("about")}
        onLogout={() => {
          setIsLoggedIn(false);
          setUser(null);
          setCurrentPage("home");
        }}
      />
    )}

  </>
);
};

export default App;
