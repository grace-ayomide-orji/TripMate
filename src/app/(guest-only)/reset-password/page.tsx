import { Suspense } from 'react';
import { ResetPasswordForm } from './ResetPasswordForm';
import { LoadingComponent } from '@/components/Loading';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingComponent/>}>
      <ResetPasswordForm />
    </Suspense>
  );
}