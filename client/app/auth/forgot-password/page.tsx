'use client';

import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';

export default function ForgotPasswordPage() {
	const { loading } = useAuthRedirect();

	if (loading) {
		return (
			<div className="animate-pulse bg-gray-100 h-64 rounded-lg"></div>
		);
	}

	return (
		<AuthLayout title="Mot de passe oublié">
			<ForgotPasswordForm />
		</AuthLayout>
	);
}
