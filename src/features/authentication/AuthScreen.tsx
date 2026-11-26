'use client';
import { useState, useEffect } from 'react';
import { PhoneStep }    from './steps/PhoneStep';
import { CodeStep }     from './steps/CodeStep';
import { PasswordStep } from './steps/PasswordStep';
import { QrStep }       from './steps/QrStep';

type Step = 'phone' | 'code' | 'password' | 'qr';

export default function AuthScreen() {
  const [step, setStep] = useState<Step>('phone');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('step');
    if (s === 'password' || s === 'qr' || s === 'code' || s === 'phone') {
      setStep(s);
    }
  }, []);

  return (
    <div className="flex flex-col h-full bg-tg-bg">
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {step === 'phone'    && <PhoneStep    onNext={() => setStep('code')} onQr={() => setStep('qr')} />}
        {step === 'code'     && <CodeStep     onNext={() => setStep('password')} onBack={() => setStep('phone')} />}
        {step === 'password' && <PasswordStep onBack={() => setStep('code')} />}
        {step === 'qr'       && <QrStep       onBack={() => setStep('phone')} onNeedsPassword={() => setStep('password')} />}
      </div>
    </div>
  );
}
