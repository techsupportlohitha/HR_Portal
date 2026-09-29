import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import NotFoundPage from './NotFoundPage';

describe('NotFoundPage', () => {
 it('offers clear recovery actions', () => {
 render(
 <MemoryRouter initialEntries={['/missing']}>
 <NotFoundPage />
 </MemoryRouter>
 );

 expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
 expect(screen.getByRole('button', { name: 'Go back' })).toBeInTheDocument();
 expect(screen.getByRole('button', { name: 'Dashboard' })).toBeInTheDocument();
 });
});
