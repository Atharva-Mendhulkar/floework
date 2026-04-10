import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Button } from '../button';

describe('Button', () => {
    it('renders correctly', () => {
        render(<Button>Click me</Button>);
        expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('applies the appropriate variant classes', () => {
        render(<Button variant="destructive">Delete</Button>);
        const button = screen.getByText('Delete');
        expect(button).toHaveClass('bg-destructive');
    });

    it('can be disabled', () => {
        render(<Button disabled>Disabled</Button>);
        const button = screen.getByText('Disabled');
        expect(button).toBeDisabled();
    });
});
