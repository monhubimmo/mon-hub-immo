// app/auth/welcome/page.tsx
import type { Metadata } from 'next';
import { WelcomeContent } from '@/components/auth/WelcomeContent';
import { AuthLayout } from '@/components/auth/AuthLayout';

export const metadata: Metadata = {
	title: 'Bienvenue - HubImmo',
	description: 'Bienvenue sur HubImmo',
};

export default function WelcomePage() {
	return (
		<AuthLayout title="Bienvenue sur HubImmo !">
			<WelcomeContent />
		</AuthLayout>
	);
}
