
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { QButton, QInput, QCard } from './UI/QuirkyComponents';
import VantaBackground from './UI/VantaBackground';
import { Shield, Lock, Mail, User, ArrowRight, Loader2 } from 'lucide-react';

const Auth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [signupSuccess, setSignupSuccess] = useState(false);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            name: name,
                        },
                    },
                });
                if (error) throw error;
                setSignupSuccess(true);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            <VantaBackground />
            <div className="max-w-md w-full relative z-10">
                <div className="text-center mb-10">
                    <div className="flex items-center justify-center gap-1 mb-4">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-stone-900 text-stone-100 rounded-2xl transform -rotate-6 shadow-xl">
                            <span className="text-5xl font-black font-serif">B</span>
                        </div>
                        <h1 className="text-6xl font-black text-stone-900 dark:text-stone-100 tracking-tighter">
                            ETA
                        </h1>
                    </div>
                    <p className="text-stone-600 dark:text-stone-400 font-bold tracking-widest uppercase text-sm">
                        Budget Evaluation Tracking App
                    </p>
                </div>

                <div className="bg-white dark:bg-stone-900 p-8 rounded-3xl border-b-8 border-r-8 border-stone-200 dark:border-stone-800 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-stone-800 to-stone-400" />

                    <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-200 mb-6 flex items-center gap-2">
                        {isLogin ? <Lock size={24} className="text-stone-400" /> : <Shield size={24} className="text-stone-400" />}
                        {isLogin ? 'Welcome Back' : 'Join the Club'}
                    </h2>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium mb-6 border border-red-100 animate-in shake">
                            {error}
                        </div>
                    )}

                    {signupSuccess ? (
                        <div className="text-center py-8 animate-in fade-in zoom-in duration-300">
                            <div className="bg-green-100 text-green-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Mail size={40} />
                            </div>
                            <h3 className="text-2xl font-black text-stone-800 dark:text-stone-100 mb-2">Check your Inbox!</h3>
                            <p className="text-stone-500 mb-8">
                                We've sent a magic link to <span className="font-bold text-stone-800 dark:text-stone-200">{email}</span>. Click it to confirm your account and start budgeting!
                            </p>
                            <QButton
                                onClick={() => {
                                    setSignupSuccess(false);
                                    setIsLogin(true);
                                }}
                                className="w-full"
                            >
                                Back to Log In
                            </QButton>
                        </div>
                    ) : (
                        <form onSubmit={handleAuth} className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
                            {!isLogin && (
                                <QInput
                                    label="Name"
                                    placeholder="What should we call you?"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    icon={User}
                                    required
                                />
                            )}
                            <QInput
                                label="Email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                icon={Mail}
                                required
                            />
                            <QInput
                                label="Password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                icon={Lock}
                                required
                            />

                            <QButton
                                type="submit"
                                className="w-full py-4 text-lg mt-4 group relative overflow-hidden"
                                disabled={loading}
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin mx-auto" />
                                ) : (
                                    <>
                                        {isLogin ? 'Sign In' : 'Create Account'}
                                        <ArrowRight className="inline-block ml-2 group-hover:translate-x-1 transition-transform" size={18} />
                                    </>
                                )}
                            </QButton>
                        </form>
                    )}

                    {!signupSuccess && (
                        <div className="mt-8 text-center">
                            <p className="text-stone-500 text-sm">
                                {isLogin ? "Don't have an account? " : "Already have an account? "}
                                <button
                                    onClick={() => setIsLogin(!isLogin)}
                                    className="font-bold text-stone-900 dark:text-stone-100 hover:underline"
                                >
                                    {isLogin ? 'Sign Up' : 'Log In'}
                                </button>
                            </p>
                        </div>
                    )}
                </div>

                <p className="text-center text-stone-400 text-xs mt-8">
                    Secured by Supabase. Powered by Gemini.
                </p>
            </div>
        </div>
    );
};

export default Auth;
