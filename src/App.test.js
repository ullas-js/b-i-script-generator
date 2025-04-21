import { render, screen } from '@testing-library/react';
import App from './App';

test('renders learn react link', () => {
    render(<App />);
    const linkElement = screen.getByText(/learn react/i);
    expect(linkElement).toBeInTheDocument();
});

test('sheets are loaded', () => {
    render(<App />);
    const linkElement = screen.getByText(/sheets/i);
    expect(linkElement).toBeInTheDocument();
});