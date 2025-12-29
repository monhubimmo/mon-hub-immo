'use client';

import { Suspense } from 'react';
import { VerifyEmailForm } from '@/components/auth/VerifyEmailForm';
import { AuthLayout } from '@/components/auth/AuthLayout';

export default function VerifyEmailPage() {
	return (
		<AuthLayout title="Vérifiez votre email">
			<Suspense
				fallback={
					<div className="animate-pulse bg-gray-100 h-64 rounded-lg"></div>
				}
			>
				<VerifyEmailForm />
			</Suspense>
		</AuthLayout>
	);
}
