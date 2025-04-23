// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Jest setup file
import '@testing-library/jest-dom' // Adds jest-dom matchers
import 'whatwg-fetch' // <-- Add fetch polyfill

// Polyfill for TextEncoder/TextDecoder (used by react-router)
import { TextEncoder, TextDecoder } from 'util'
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock ResizeObserver - needed for some MUI components like DataGrid
global.ResizeObserver = class ResizeObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
}

// Mock matchMedia if needed (often required by MUI)
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: jest.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: jest.fn(), // deprecated
		removeListener: jest.fn(), // deprecated
		addEventListener: jest.fn(),
		removeEventListener: jest.fn(),
		dispatchEvent: jest.fn()
	}))
})

// Mock MDEditor components
jest.mock('@uiw/react-md-editor', () => ({
	default: props => (
		<div data-testid="mock-md-editor">
			{props.value}
		</div>
	),
	__esModule: true,
	preview: 'div',
}))

// Mock styles imports
jest.mock('react-diff-view/style/index.css', () => {
	return {};
}, { virtual: true });

console.log('Jest setupTests.js executed.')
