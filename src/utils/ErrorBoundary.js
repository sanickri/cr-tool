import React, { Component } from 'react'

class ErrorBoundary extends Component {
	constructor(props) {
		super(props)
		this.state = {
			hasError: false,
			error: null,
			errorInfo: null
		}
	}

	static getDerivedStateFromError(error) {
		// Update state so the next render will show the fallback UI
		return { hasError: true }
	}

	componentDidCatch(error, errorInfo) {
		// You can log the error to an error reporting service
		console.error('Error caught by ErrorBoundary:', error, errorInfo)
		this.setState({
			error: error,
			errorInfo: errorInfo
		})
	}

	render() {
		if (this.state.hasError) {
			// You can render any custom fallback UI
			return (
				this.props.fallback || (
					<div
						style={{
							padding: '20px',
							margin: '20px',
							border: '1px solid #f5c6cb',
							borderRadius: '4px',
							backgroundColor: '#f8d7da',
							color: '#721c24'
						}}
					>
						<h2>Something went wrong.</h2>
						<details style={{ whiteSpace: 'pre-wrap' }}>
							{this.state.error && this.state.error.toString()}
							<br />
							{this.state.errorInfo &&
								this.state.errorInfo.componentStack}
						</details>
						{this.props.resetAction && (
							<button
								onClick={this.props.resetAction}
								style={{
									marginTop: '10px',
									padding: '8px 16px',
									backgroundColor: '#dc3545',
									color: 'white',
									border: 'none',
									borderRadius: '4px',
									cursor: 'pointer'
								}}
							>
								Try again
							</button>
						)}
					</div>
				)
			)
		}

		return this.props.children
	}
}

export default ErrorBoundary
