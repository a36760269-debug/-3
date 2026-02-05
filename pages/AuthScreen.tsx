
import React, { useState, useEffect } from 'react';
import { checkAuthPin, hasAuthPin, setAuthPin } from '../services/storageService';
import { School, XCircle } from 'lucide-react';
import { Button } from '../components/Shared';

const AuthScreen = ({ onLogin }: { onLogin: () => void }) => {
  const [isSetup, setIsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    hasAuthPin().then(exists => {
      setIsSetup(!exists);
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSetup) {
      if (pin !== confirmPin) return setError('كلمة المرور غير متطابقة');
      if (pin.length < 4) return setError('يجب أن تكون 4 أحرف على الأقل');
      await setAuthPin(pin);
      onLogin();
    } else {
      const valid = await checkAuthPin(pin);
      if (valid) {
        onLogin();
      } else {
        setError('كلمة المرور غير صحيحة');
      }
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl w-full max-w-md border border-slate-100">
        <div className="text-center mb-8">
          <div className="bg-teal-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <School className="text-teal-600" size={40} />
          </div>
          <h2 className="text-3xl font-bold text-slate-800">
            {isSetup ? 'إعداد الحماية' : 'مرحباً بك'}
          </h2>
          <p className="text-slate-500 mt-2">المساعد التربوي الذكي</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">رمز الدخول (PIN)</label>
            <input 
              type="password" 
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-center text-2xl tracking-widest focus:ring-2 focus:ring-teal-500 outline-none transition"
              placeholder="••••"
              maxLength={8}
            />
          </div>
          {isSetup && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">تأكيد الرمز</label>
              <input 
                type="password" 
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-center text-2xl tracking-widest focus:ring-2 focus:ring-teal-500 outline-none transition"
                placeholder="••••"
                maxLength={8}
              />
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg justify-center">
              <XCircle size={16} />
              {error}
            </div>
          )}
          <Button className="w-full py-4 text-lg">
            {isSetup ? 'حفظ وبدء الاستخدام' : 'تسجيل الدخول'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AuthScreen;
