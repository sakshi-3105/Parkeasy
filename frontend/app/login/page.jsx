"use client";
import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:3001/api/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      if (res.data.user.is_admin) router.push('/admin-dashboard');
      else router.push('/dashboard');
    } catch (err) { alert("Login Failed"); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] relative overflow-hidden text-gray-900 selection:bg-blue-600 selection:text-white px-4">
      {/* Background decoration */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-400/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-400/20 blur-[120px] rounded-full pointer-events-none"></div>
      
      <form onSubmit={handleLogin} className="relative z-10 bg-white/80 backdrop-blur-md border border-white p-6 sm:p-10 rounded-[2rem] shadow-xl shadow-blue-900/5 w-full max-w-[420px] transition-all duration-300 hover:bg-white hover:shadow-2xl hover:shadow-blue-900/10 hover:-translate-y-1">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-800 tracking-tighter mb-3">PARKEASY</h1>
          <p className="text-gray-500 text-sm font-medium">Welcome back! Sign in to your account.</p>
        </div>
        
        <div className="space-y-5">
          <div className="group relative">
            <input type="email" placeholder="Email Address" className="w-full p-4 bg-gray-50/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white transition-all font-medium" onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="group relative">
            <input type="password" placeholder="Password" className="w-full p-4 bg-gray-50/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white transition-all font-medium" onChange={(e) => setPassword(e.target.value)} required />
          </div>
        </div>
        
        <button className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-bold text-lg shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] hover:-translate-y-0.5 transition-all duration-200">
          Sign In
        </button>
        
        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-500">
            Don't have an account?{' '}
            <a href="/signup" className="text-blue-600 hover:text-blue-500 font-semibold hover:underline transition-colors w-full inline-block mt-2 sm:mt-0 sm:w-auto">
              Create one now
            </a>
          </p>
        </div>
      </form>
    </div>
  );
}