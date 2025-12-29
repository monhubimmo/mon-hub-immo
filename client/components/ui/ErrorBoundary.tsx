'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert } from './Alert';
import { Button } from './Button';
import { logger } from '@/lib/utils/logger';

interface ErrorBoundaryProps {
	children: ReactNode;
	fallback?: ReactNode;
	onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
	hasError: boolean;
	error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
	public state: State = {
		hasError: false,
	};

	public static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		logger.error('ErrorBoundary caught an error:', { error, errorInfo });

		if (this.props.onError) {
			this.props.onError(error, errorInfo);
		}
	}

	private handleRetry = () => {
		this.setState({ hasError: false, error: undefined });
	};

	private handleReload = () => {
		window.location.reload();
	};

	public render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			return (
				<div className="min-h-screen flex items-center justify-center p-4">
					<div className="max-w-md w-full">
						<Alert type="error" title="Une erreur est survenue">
							<div className="space-y-4">
								<p>
									Une erreur inattendue s&apos;est produite.
									Veuillez réessayer ou contacter le support
									si le problème persiste.
								</p>

								{process.env.NODE_ENV === 'development' &&
									this.state.error && (
										<details className="mt-4">
											<summary className="cursor-pointer text-sm font-medium">
												Détails de l&apos;erreur
												(Développement uniquement)
											</summary>
											<pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
												{this.state.error.stack}
											</pre>
										</details>
									)}

								<div className="flex space-x-3">
									<Button
										onClick={this.handleRetry}
										variant="outline"
										size="sm"
									>
										Réessayer
									</Button>
									<Button
										onClick={this.handleReload}
										variant="primary"
										size="sm"
									>
										Recharger la page
									</Button>
								</div>
							</div>
						</Alert>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

/**
 * Specific fallback for filter-related errors
 * Provides a user-friendly message when filters fail to load
 */
export const FilterErrorFallback = () => {
	return (
		<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
			<div className="flex items-start">
				<div className="flex-shrink-0">
					<svg
						className="h-5 w-5 text-yellow-400"
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fillRule="evenodd"
							d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
							clipRule="evenodd"
						/>
					</svg>
				</div>
				<div className="ml-3">
					<h3 className="text-sm font-medium text-yellow-800">
						Erreur de chargement des filtres
					</h3>
					<p className="mt-1 text-sm text-yellow-700">
						Les filtres ne peuvent pas être chargés pour le moment.
						Veuillez rafraîchir la page.
					</p>
					<button
						onClick={() => window.location.reload()}
						className="mt-3 px-3 py-1.5 text-sm bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 transition-colors"
					>
						Rafraîchir la page
					</button>
				</div>
			</div>
		</div>
	);
};
