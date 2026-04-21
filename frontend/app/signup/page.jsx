"use client";
import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

export default function Signup() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', is_admin: false });
  const router = useRouter();

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3001/api/auth/register', formData);
      alert("Account created! Please login.");
      router.push('/login');
    } catch (err) { alert("Signup Failed"); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] relative overflow-hidden text-gray-900 selection:bg-blue-600 selection:text-white px-4 py-8">
      {/* Background decoration */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-400/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-400/20 blur-[120px] rounded-full pointer-events-none"></div>
      <a
        href="/"
        className="absolute top-6 left-4 sm:left-6 z-20 inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-blue-600 transition-colors"
      >
        <span aria-hidden="true">←</span>
        <span>Back to Home</span>
      </a>
      
      <form onSubmit={handleSignup} className="relative z-10 bg-white/80 backdrop-blur-md border border-white p-6 sm:p-10 rounded-[2rem] shadow-xl shadow-blue-900/5 w-full max-w-[420px] transition-all duration-300 hover:bg-white hover:shadow-2xl hover:shadow-blue-900/10 hover:-translate-y-1">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-800 tracking-tighter mb-2">Create Account</h1>
          <p className="text-gray-500 text-sm font-medium">Join ParkEasy and find spots effortlessly.</p>
        </div>
        
        <div className="space-y-4">
          <input type="text" placeholder="Full Name" className="w-full p-4 bg-gray-50/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white transition-all font-medium" onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          <input type="email" placeholder="Email Address" className="w-full p-4 bg-gray-50/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white transition-all font-medium" onChange={(e) => setFormData({...formData, email: e.target.value})} required />
          <input type="password" placeholder="Password" className="w-full p-4 bg-gray-50/50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white transition-all font-medium" onChange={(e) => setFormData({...formData, password: e.target.value})} required />
          
          <label className="flex items-center gap-3 mt-4 mb-2 p-3 bg-gray-50/50 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
            <input type="checkbox" className="w-5 h-5 rounded border-gray-300 bg-white text-blue-600 focus:ring-blue-500/50 focus:ring-offset-0 transition-all" onChange={(e) => setFormData({...formData, is_admin: e.target.checked})} />
            <span className="text-gray-700 text-sm font-bold">Register as System Admin</span>
          </label>
        </div>
        
        <button className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-bold text-lg shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] hover:-translate-y-0.5 transition-all duration-200">
          Create Account
        </button>
        
        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <a href="/login" className="text-blue-600 hover:text-blue-500 font-semibold hover:underline transition-colors w-full inline-block mt-2 sm:mt-0 sm:w-auto">
              Sign In
            </a>
          </p>
        </div>
      </form>
    </div>
  );
}