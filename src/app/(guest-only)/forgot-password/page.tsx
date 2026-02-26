import { Suspense } from 'react';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { LoadingComponent } from '@/components/Loading';

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<LoadingComponent/>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}