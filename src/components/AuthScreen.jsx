import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { login, signUp } from '../authService';

export default function AuthScreen({ onAuthSuccess }) {
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (isLogin) {
                const user = login(email, password);
                onAuthSuccess(user);
            } else {
                if (!name.trim()) throw new Error('Name is required');
                if (password.length < 6) throw new Error('Password must be at least 6 characters');
                const user = signUp(name, email, password);
                onAuthSuccess(user);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setError('');
        setName('');
        setEmail('');
        setPassword('');
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, type: 'spring', bounce: 0.4 }}
                className="w-full max-w-md bg-white/60 backdrop-blur-xl rounded-[2rem] p-8 shadow-2xl border border-white/50"
            >
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring' }}
                        className="w-20 h-20 bg-gradient-to-br from-pink-400 to-purple-400 rounded-3xl mx-auto flex items-center justify-center shadow-lg mb-6 rotate-3"
                    >
                        <span className="text-4xl text-white">🎧</span>
                    </motion.div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-500" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        Semantic Ear
                    </h1>
                    <p className="text-gray-500 mt-2 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {isLogin ? 'Welcome back to your memories' : 'Start capturing your thoughts natively'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>

                    <AnimatePresence mode="popLayout">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="p-3 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium text-center"
                            >
                                {error}
                            </motion.div>
                        )}

                        {!isLogin && (
                            <motion.div
                                key="name"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                            >
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Name</label>
                                <input
                                    type="text"
                                    required={!isLogin}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-white/70 rounded-2xl px-5 py-3.5 text-gray-700 placeholder-gray-400 border border-gray-200/50 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent transition-all"
                                    placeholder="John Doe"
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-white/70 rounded-2xl px-5 py-3.5 text-gray-700 placeholder-gray-400 border border-gray-200/50 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent transition-all"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-white/70 rounded-2xl px-5 py-3.5 text-gray-700 placeholder-gray-400 border border-gray-200/50 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={isLoading}
                        type="submit"
                        className="w-full mt-6 px-6 py-4 bg-gradient-to-r from-pink-400 to-purple-400 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-70 flex justify-center items-center"
                    >
                        {isLoading ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            isLogin ? 'Sign In' : 'Create Account'
                        )}
                    </motion.button>
                </form>

                <div className="mt-8 text-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    <p className="text-sm text-gray-500">
                        {isLogin ? "Don't have an account?" : "Already have an account?"}
                        <button
                            onClick={toggleMode}
                            className="ml-2 font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-80 transition-opacity"
                        >
                            {isLogin ? 'Sign Up' : 'Sign In'}
                        </button>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
