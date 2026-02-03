const API_URL = 'https://securecloud-hub-1.preview.emergentagent.com/api';

const firebaseConfig = {
  apiKey: 'AIzaSyAUfUtuejZs4r_MeyyIPxJtRijy4j6aO58',
  authDomain: 'web-apps-b38b9.firebaseapp.com',
  projectId: 'web-apps-b38b9',
  appId: '1:929796983183:web:79f30cada090c2732ca3fa'
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

let confirmationResult = null;

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const phoneAuthForm = document.getElementById('phoneAuthForm');

const showRegisterLink = document.getElementById('showRegister');
const showLoginLink = document.getElementById('showLogin');
const phoneAuthLink = document.getElementById('phoneAuthLink');
const backToLoginLink = document.getElementById('backToLogin');

function clearAllInputs() {
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPassword').value = '';
  document.getElementById('registerEmail').value = '';
  document.getElementById('registerPassword').value = '';
  document.getElementById('phoneNumber').value = '';
  document.getElementById('otpCode').value = '';
  
  document.getElementById('loginError').style.display = 'none';
  document.getElementById('registerError').style.display = 'none';
  document.getElementById('registerSuccess').style.display = 'none';
  document.getElementById('phoneError').style.display = 'none';
}

function showLogin() {
  clearAllInputs();
  loginForm.style.display = 'block';
  registerForm.style.display = 'none';
  phoneAuthForm.style.display = 'none';
}

function showRegister() {
  clearAllInputs();
  loginForm.style.display = 'none';
  registerForm.style.display = 'block';
  phoneAuthForm.style.display = 'none';
}

function showPhoneAuth() {
  clearAllInputs();
  loginForm.style.display = 'none';
  registerForm.style.display = 'none';
  phoneAuthForm.style.display = 'block';
  
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
      'size': 'normal',
      'callback': (response) => {
        console.log('reCAPTCHA solved');
      }
    });
    window.recaptchaVerifier.render();
  }
}

showRegisterLink.addEventListener('click', (e) => {
  e.preventDefault();
  showRegister();
});

showLoginLink.addEventListener('click', (e) => {
  e.preventDefault();
  showLogin();
});

phoneAuthLink.addEventListener('click', (e) => {
  e.preventDefault();
  showPhoneAuth();
});

backToLoginLink.addEventListener('click', (e) => {
  e.preventDefault();
  showLogin();
});

document.getElementById('registerFormElement').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  const errorDiv = document.getElementById('registerError');
  const successDiv = document.getElementById('registerSuccess');
  
  errorDiv.style.display = 'none';
  successDiv.style.display = 'none';
  
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      errorDiv.textContent = data.error || 'Registration failed';
      errorDiv.style.display = 'block';
      return;
    }
    
    successDiv.textContent = 'Registration successful! Redirecting to login...';
    successDiv.style.display = 'block';
    
    setTimeout(() => {
      showLogin();
    }, 1500);
  } catch (error) {
    console.error('Registration error:', error);
    errorDiv.textContent = 'Network error. Please try again.';
    errorDiv.style.display = 'block';
  }
});

document.getElementById('loginFormElement').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const errorDiv = document.getElementById('loginError');
  
  errorDiv.style.display = 'none';
  
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      errorDiv.textContent = data.error || 'Login failed';
      errorDiv.style.display = 'block';
      return;
    }
    
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    window.location.href = '/dashboard.html';
  } catch (error) {
    console.error('Login error:', error);
    errorDiv.textContent = 'Network error. Please try again.';
    errorDiv.style.display = 'block';
  }
});

document.getElementById('sendOtpBtn').addEventListener('click', async (e) => {
  e.preventDefault();
  
  const phoneNumber = document.getElementById('phoneNumber').value;
  const errorDiv = document.getElementById('phoneError');
  
  errorDiv.style.display = 'none';
  
  if (!phoneNumber) {
    errorDiv.textContent = 'Please enter a phone number';
    errorDiv.style.display = 'block';
    return;
  }
  
  try {
    const appVerifier = window.recaptchaVerifier;
    confirmationResult = await auth.signInWithPhoneNumber(phoneNumber, appVerifier);
    
    document.getElementById('otpInputBox').style.display = 'block';
    document.getElementById('verifyOtpBtn').style.display = 'block';
    document.getElementById('sendOtpBtn').textContent = 'Resend OTP';
  } catch (error) {
    console.error('OTP send error:', error);
    errorDiv.textContent = 'Failed to send OTP. Please check the phone number.';
    errorDiv.style.display = 'block';
  }
});

document.getElementById('verifyOtpBtn').addEventListener('click', async () => {
  const otpCode = document.getElementById('otpCode').value;
  const errorDiv = document.getElementById('phoneError');
  
  errorDiv.style.display = 'none';
  
  if (!otpCode) {
    errorDiv.textContent = 'Please enter the OTP';
    errorDiv.style.display = 'block';
    return;
  }
  
  try {
    const result = await confirmationResult.confirm(otpCode);
    const idToken = await result.user.getIdToken();
    const phoneNumber = result.user.phoneNumber;
    
    const response = await fetch(`${API_URL}/auth/phone-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ idToken, phoneNumber })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      errorDiv.textContent = data.error || 'Phone authentication failed';
      errorDiv.style.display = 'block';
      return;
    }
    
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    window.location.href = '/dashboard.html';
  } catch (error) {
    console.error('OTP verification error:', error);
    errorDiv.textContent = 'Invalid OTP. Please try again.';
    errorDiv.style.display = 'block';
  }
});
