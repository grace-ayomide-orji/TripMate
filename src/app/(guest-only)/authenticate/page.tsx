import { Suspense } from 'react';
import { AuthComponent } from './AuthComponent';
import { LoadingComponent } from '@/components/Loading';

export default function AuthenticatePage() {
  return (
    <Suspense fallback={<LoadingComponent/>}>
      <AuthComponent />
    </Suspense>
  );
}